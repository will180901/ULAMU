/**
 * Carnet familial / personnes à charge (M07, CU-07-04) — un patient majeur gère des sous-profils
 * (enfant, personne dépendante), chacun avec SON propre Carnet. Liste + création ; ouvrir un
 * sous-profil mène à son Carnet (CarnetScreen avec subProfileId). N'affecte que ses propres dépendants.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Card, IconButton, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {Sex, SubProfile} from '../lib/contracts';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const ageOf = (iso: string): number => {
  const b = new Date(iso);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
    a--;
  }
  return Math.max(0, a);
};
const displayToIso = (disp: string): string | null => {
  const m = disp.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    return null;
  }
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() ? null : iso;
};

export function FamilyScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Family'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<SubProfile[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setItems(await api.listSubProfiles());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Carnet familial</Text>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn} hitSlop={6}>
          <Icon name="plus" size={18} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {status === 'loading' && <LoadingState label="Chargement…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>Gérez le Carnet de santé des personnes à votre charge (enfant mineur, proche dépendant).</Text>
          {items.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState icon="users" title="Aucune personne à charge." hint="Ajoutez un proche pour lui ouvrir un Carnet de santé gratuit à vie." />
            </Card>
          ) : (
            items.map(s => (
              <Pressable key={s.id} onPress={() => navigation.navigate('Carnet', {subProfileId: s.id, title: `${s.firstName} ${s.lastName}`})} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(s.firstName[0] ?? '') + (s.lastName[0] ?? '')}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name}>{s.firstName} {s.lastName}</Text>
                  <Text style={styles.sub}>{ageOf(s.birthDate)} ans · {s.sex === 'F' ? 'Femme' : 'Homme'}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <CreateSubProfileModal visible={createOpen} onClose={() => setCreateOpen(false)} onDone={() => {
        setCreateOpen(false);
        load();
      }} />
    </SafeAreaView>
  );
}

function CreateSubProfileModal({visible, onClose, onDone}: {visible: boolean; onClose: () => void; onDone: () => void}) {
  const {colors} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('F');
  const [busy, setBusy] = useState(false);

  /**
   * Fermeture de la feuille : « Annuler », appui sur le fond et bouton retour du téléphone passent tous
   * les trois par ici. Même correction que la feuille des rappels — un brouillon rempli disparaissait
   * sans un mot, et la saisie abandonnée réapparaissait à la réouverture faute d'être effacée.
   */
  const dismiss = useAbandonGuard({
    dirty: firstName.trim().length > 0 || lastName.trim().length > 0 || dob.trim().length > 0,
    title: 'Abandonner cet ajout ?',
    message: 'Les informations saisies pour cette personne seront perdues.',
    onLeave: () => {
      setFirstName('');
      setLastName('');
      setDob('');
      setSex('F');
      onClose();
    },
  });

  const submit = async () => {
    const iso = displayToIso(dob);
    if (firstName.trim().length < 1 || lastName.trim().length < 1 || !iso) {
      await alert({title: 'Champs incomplets', message: 'Prénom, nom et date de naissance (JJ/MM/AAAA) requis.'});
      return;
    }
    setBusy(true);
    try {
      await api.createSubProfile({firstName: firstName.trim(), lastName: lastName.trim(), birthDate: iso, sex});
      setFirstName('');
      setLastName('');
      setDob('');
      onDone();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Création impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Ajouter une personne à charge</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={colors.textDisabled} autoCapitalize="words" autoFocus />
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={colors.textDisabled} autoCapitalize="words" />
          <TextInput style={styles.input} value={dob} onChangeText={t => setDob(t.replace(/[^\d/]/g, '').slice(0, 10))} placeholder="Date de naissance (JJ/MM/AAAA)" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" />
          <View style={styles.sexRow}>
            {(['F', 'M'] as Sex[]).map(s => {
              const on = sex === s;
              return (
                <Pressable key={s} onPress={() => setSex(s)} style={[styles.sexChip, on && styles.sexChipOn]}>
                  <Text style={[styles.sexText, on && styles.sexTextOn]}>{s === 'F' ? 'Fille / Femme' : 'Garçon / Homme'}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton title="Créer le Carnet" iconRight="check" loading={busy} onPress={submit} />
          <Pressable onPress={dismiss} style={styles.cancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    addBtn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
    content: {padding: 16, gap: 12, paddingBottom: 28},
    intro: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, lineHeight: 18},

    row: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
    avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent600, alignItems: 'center', justifyContent: 'center'},
    avatarText: {fontFamily: fonts.display, fontSize: 15, color: '#fff'},
    name: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textPrimary},
    sub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1},

    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 12},
    sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
    input: {minHeight: 48, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14.5, color: colors.textPrimary},
    sexRow: {flexDirection: 'row', gap: 8},
    sexChip: {flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.field, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: colors.borderSubtle},
    sexChipOn: {backgroundColor: colors.accent50, borderColor: colors.accent500},
    sexText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.textSecondary},
    sexTextOn: {color: colors.accent},
    cancel: {alignItems: 'center', paddingVertical: 6},
    cancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
