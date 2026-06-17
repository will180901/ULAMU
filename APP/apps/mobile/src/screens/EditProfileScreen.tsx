/**
 * Modifier mon profil (CRUD compte M01) — n'affecte QUE son propre compte. Charge `getMe`,
 * pré-remplit, envoie `PATCH /v1/accounts/me`. Champs : prénom, nom, date de naissance, sexe, arrondissement.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Avatar, Field, FieldLabel, IconButton, PrimaryButton} from '../components/ui';
import {AvatarViewer} from '../components/AvatarViewer';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {Sex, UpdateProfileRequest} from '../lib/contracts';
import {avatarUrl} from '../services/media';
import {useMe} from '../state/MeContext';
import {useAvatarPicker} from '../state/useAvatarPicker';
import {useDialog} from '../components/Dialog';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const isoToDisplay = (iso: string | null): string => {
  if (!iso) {
    return '';
  }
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
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

export function EditProfileScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'EditProfile'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {me, setMe} = useMe(); // profil global : l'avatar lit me.avatarKey → à jour partout instantanément
  const {alert} = useDialog();
  const {change: changePhoto, busy: photoBusy} = useAvatarPicker();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('F');
  const [district, setDistrict] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const profile = await api.getMe();
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setDob(isoToDisplay(profile.birthDate));
      setSex(profile.sex ?? 'F');
      setDistrict(profile.district ?? '');
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const birthIso = dob.trim() ? displayToIso(dob) : null;
    if (dob.trim() && !birthIso) {
      alert({title: 'Date invalide', message: 'Format attendu : JJ/MM/AAAA (date passée).'});
      return;
    }
    const dto: UpdateProfileRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      sex,
      district: district.trim(),
      ...(birthIso ? {birthDate: birthIso} : {}),
    };
    setBusy(true);
    try {
      const updated = await api.updateProfile(dto);
      setMe(updated); // → nom à jour partout instantanément
      await alert({title: 'Profil mis à jour', message: 'Vos informations ont été enregistrées.'});
      navigation.goBack();
    } catch (e) {
      alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Mise à jour impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  const ready = firstName.trim().length > 0 && lastName.trim().length > 0 && district.trim().length > 0;

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Modifier mon profil</Text>
      </View>

      {status === 'loading' && <LoadingState label="Chargement…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Photo de profil */}
          <View style={styles.photoSection}>
            <Pressable onPress={() => setViewerOpen(true)} accessibilityLabel="Voir la photo en plein écran">
              <Avatar name={`${firstName} ${lastName}`} size={88} uri={avatarUrl(me?.avatarKey)} />
            </Pressable>
            <Pressable onPress={() => changePhoto(!!me?.avatarKey)} style={styles.photoBtn} disabled={photoBusy} hitSlop={6}>
              {photoBusy ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Icon name="user" size={15} color={colors.accent} />
              )}
              <Text style={styles.photoBtnText}>{photoBusy ? 'Envoi…' : me?.avatarKey ? 'Changer la photo' : 'Ajouter une photo'}</Text>
            </Pressable>
          </View>

          <View>
            <FieldLabel>Prénom</FieldLabel>
            <Field icon="user" value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" />
          </View>
          <View>
            <FieldLabel>Nom</FieldLabel>
            <Field icon="user" value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" />
          </View>
          <View>
            <FieldLabel>Date de naissance</FieldLabel>
            <Field icon="calendar" value={dob} onChangeText={t => setDob(t.replace(/[^\d/]/g, '').slice(0, 10))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" />
          </View>
          <View>
            <FieldLabel>Sexe</FieldLabel>
            <View style={styles.sexRow}>
              {(['F', 'M'] as Sex[]).map(s => {
                const on = sex === s;
                return (
                  <Pressable key={s} onPress={() => setSex(s)} style={[styles.sexChip, on && styles.sexChipOn]}>
                    <Text style={[styles.sexText, on && styles.sexTextOn]}>{s === 'F' ? 'Femme' : 'Homme'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <FieldLabel>Arrondissement</FieldLabel>
            <Field icon="map-pin" value={district} onChangeText={setDistrict} placeholder="Ex : Talangaï" autoCapitalize="words" />
          </View>
          <PrimaryButton title="Enregistrer" iconRight="check" loading={busy} disabled={!ready} onPress={save} />
          <Text style={styles.foot}>Ces informations ne concernent que votre compte.</Text>
        </ScrollView>
      )}

      <AvatarViewer
        visible={viewerOpen}
        uri={avatarUrl(me?.avatarKey)}
        name={`${firstName} ${lastName}`.trim() || 'Profil'}
        onClose={() => setViewerOpen(false)}
        onChangePhoto={() => changePhoto(!!me?.avatarKey)}
        changing={photoBusy}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    content: {padding: 16, gap: 14, paddingBottom: 28},
    photoSection: {alignItems: 'center', gap: 10, marginBottom: 4},
    photoBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100},
    photoBtnText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.accent},
    sexRow: {flexDirection: 'row', gap: 8},
    sexChip: {flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.field, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: colors.borderSubtle},
    sexChipOn: {backgroundColor: colors.accent50, borderColor: colors.accent500},
    sexText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textSecondary},
    sexTextOn: {color: colors.accent},
    foot: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, textAlign: 'center'},
  });
