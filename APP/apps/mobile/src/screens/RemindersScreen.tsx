/**
 * Mes rappels de médicaments (M14, CRUD patient) — créer / lister / activer-désactiver / marquer pris /
 * supprimer. Données RÉELLES par patient (n'affecte que soi). Chaque rappel actif programme une
 * NOTIFICATION LOCALE quotidienne (notifee) à chacune de ses heures — voir services/notifications.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Card, IconButton, PrimaryButton, Switch} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {requestNotificationPermission, syncReminderNotifications} from '../services/notifications';
import {Reminder} from '../lib/contracts';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const TIME_OPTIONS = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
const hm = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function RemindersScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Reminders'>) {
  const {colors, scheme} = useTheme();
  const {confirm} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<Reminder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.listReminders();
      setItems(res.items);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Demande l'autorisation de notifier une fois, dans ce contexte clair (gestion des rappels).
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // (Re)programme les notifications locales dès que la liste change (création/màj/suppression/activation).
  useEffect(() => {
    if (status === 'ready') {
      syncReminderNotifications(items);
    }
  }, [items, status]);

  // MAJ optimiste puis RÉCONCILIATION avec l'état autoritaire renvoyé par le serveur (heure de prise exacte).
  const toggleActive = (r: Reminder, next: boolean) => {
    setItems(prev => prev.map(x => (x.id === r.id ? {...x, active: next} : x)));
    api
      .updateReminder(r.id, {active: next})
      .then(updated => setItems(prev => prev.map(x => (x.id === r.id ? updated : x))))
      .catch(load);
  };
  const markTaken = (r: Reminder) => {
    setItems(prev => prev.map(x => (x.id === r.id ? {...x, lastTakenAt: new Date().toISOString()} : x)));
    api
      .markReminderTaken(r.id)
      .then(updated => setItems(prev => prev.map(x => (x.id === r.id ? updated : x))))
      .catch(load);
  };
  const remove = async (r: Reminder) => {
    if (await confirm({title: 'Supprimer ce rappel ?', message: r.medicationName, confirmLabel: 'Supprimer', cancelLabel: 'Annuler', danger: true})) {
      setItems(prev => prev.filter(x => x.id !== r.id));
      api.deleteReminder(r.id).catch(load);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Mes rappels</Text>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn} hitSlop={6}>
          <Icon name="plus" size={18} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {status === 'loading' && <LoadingState label="Chargement de vos rappels…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState icon="pill" title="Aucun rappel pour l'instant." hint="Ajoutez vos médicaments et leurs horaires pour ne rien oublier." />
            </Card>
          ) : (
            items.map(r => {
              const takenToday = r.lastTakenAt && new Date(r.lastTakenAt).toDateString() === new Date().toDateString();
              return (
                <Card key={r.id} padding={14}>
                  <View style={styles.rowTop}>
                    <View style={[styles.pillIcon, !r.active && styles.pillIconOff]}>
                      <Icon name="pill" size={18} color={r.active ? colors.accent400 : colors.textTertiary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.medName, !r.active && styles.medOff]}>{r.medicationName}</Text>
                      {r.dosage ? <Text style={styles.dosage}>{r.dosage}</Text> : null}
                    </View>
                    <Switch value={r.active} onValueChange={n => toggleActive(r, n)} />
                  </View>
                  <View style={styles.times}>
                    {r.times.map(t => (
                      <View key={t} style={styles.timeChip}>
                        <Icon name="clock" size={11} color={colors.textTertiary} />
                        <Text style={styles.timeText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => markTaken(r)} disabled={!r.active} style={[styles.takenBtn, (takenToday || !r.active) && styles.takenBtnDone]}>
                      <Icon name={takenToday ? 'check-circle' : 'check'} size={14} color={takenToday ? colors.successDot : colors.accent} strokeWidth={2.2} />
                      <Text style={[styles.takenText, takenToday && {color: colors.successDot}]}>
                        {takenToday ? `Pris à ${hm(r.lastTakenAt as string)}` : 'Marquer comme pris'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => remove(r)} hitSlop={8} style={styles.delBtn}>
                      <Icon name="log-out" size={15} color={colors.errorDot} />
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      <CreateReminderModal visible={createOpen} onClose={() => setCreateOpen(false)} onDone={() => {
        setCreateOpen(false);
        load();
      }} />
    </SafeAreaView>
  );
}

function CreateReminderModal({visible, onClose, onDone}: {visible: boolean; onClose: () => void; onDone: () => void}) {
  const {colors} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleTime = (t: string) => setTimes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));

  /**
   * Fermeture de la feuille : « Annuler », appui sur le fond et bouton retour du téléphone passent tous
   * les trois par ici.
   *
   * Deux choses étaient fausses. Un brouillon rempli disparaissait au moindre appui à côté, sans un mot.
   * Et comme ce composant reste monté, la saisie ABANDONNÉE réapparaissait telle quelle à la
   * réouverture — alors qu'une création RÉUSSIE, elle, repartait d'un formulaire vide. On tranche dans
   * le sens qu'annonce le bouton : abandonner efface.
   */
  const dismiss = useAbandonGuard({
    dirty: name.trim().length > 0 || dosage.trim().length > 0 || times.length > 0,
    title: 'Abandonner ce rappel ?',
    message: 'Le médicament et les horaires saisis seront perdus.',
    onLeave: () => {
      setName('');
      setDosage('');
      setTimes([]);
      onClose();
    },
  });

  const submit = async () => {
    if (name.trim().length < 1 || times.length === 0) {
      return;
    }
    setBusy(true);
    try {
      await api.createReminder({medicationName: name.trim(), dosage: dosage.trim() || undefined, times});
      setName('');
      setDosage('');
      setTimes([]);
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
          <Text style={styles.sheetTitle}>Nouveau rappel</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Médicament (ex : Amlodipine 5 mg)" placeholderTextColor={colors.textDisabled} autoFocus />
          <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="Posologie (ex : 1 comprimé) — optionnel" placeholderTextColor={colors.textDisabled} />
          <Text style={styles.sheetLabel}>Horaires de prise</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map(t => {
              const on = times.includes(t);
              return (
                <Pressable key={t} onPress={() => toggleTime(t)} style={[styles.timeOpt, on && styles.timeOptOn]}>
                  <Text style={[styles.timeOptText, on && styles.timeOptTextOn]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton title="Créer le rappel" iconRight="check" loading={busy} disabled={name.trim().length < 1 || times.length === 0} onPress={submit} />
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

    rowTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
    pillIcon: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: 'rgba(39,86,166,0.16)', alignItems: 'center', justifyContent: 'center'},
    pillIconOff: {backgroundColor: colors.bgMuted},
    medName: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textPrimary},
    medOff: {color: colors.textTertiary},
    dosage: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1},
    times: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
    timeChip: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgMuted, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4},
    timeText: {fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary},
    actions: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    takenBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100},
    takenBtnDone: {backgroundColor: colors.bgMuted, borderColor: colors.borderSubtle},
    takenText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.accent},
    delBtn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center'},

    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 12},
    sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
    sheetLabel: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textSecondary},
    input: {minHeight: 48, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14.5, color: colors.textPrimary},
    timeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    timeOpt: {paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: colors.borderSubtle},
    timeOptOn: {backgroundColor: colors.accent50, borderColor: colors.accent500},
    timeOptText: {fontFamily: fonts.monoMedium, fontSize: 13, color: colors.textSecondary},
    timeOptTextOn: {color: colors.accent},
    cancel: {alignItems: 'center', paddingVertical: 6},
    cancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
