/**
 * Réglages — Compte & Sécurité (M01). Branché RÉEL :
 *  • Appareils connectés : `GET /v1/accounts/me/sessions` + `DELETE …/:id` (CU-01-06, révocation à distance) ;
 *  • 2FA : activer → TotpIntro ; désactiver → `POST …/totp/disable` (mot de passe + code, RM-01-06) ;
 *  • Changer de numéro → écran dédié (OTP ancien + nouveau, EF-01-07) ;
 *  • Clôturer mon compte → écran dédié (mot de passe + OTP, CU-01-07).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Field, IconButton, PasswordField, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {MeResponse, SessionInfo} from '../lib/contracts';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function SettingsScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Settings'>) {
  const styles = useThemedStyles(makeStyles);
  const {colors, scheme} = useTheme();
  const {confirm} = useDialog();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [disableOpen, setDisableOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [profile, sess] = await Promise.all([api.getMe(), api.listSessions()]);
      setMe(profile);
      setSessions(sess);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const revoke = async (s: SessionInfo) => {
    if (await confirm({title: 'Déconnecter cet appareil ?', message: "La session sera révoquée immédiatement.", confirmLabel: 'Déconnecter', cancelLabel: 'Annuler', danger: true})) {
      setSessions(prev => prev.filter(x => x.id !== s.id));
      try {
        await api.revokeSession(s.id);
      } catch {
        load();
      }
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Réglages</Text>
      </View>

      {status === 'loading' && <LoadingState label="Chargement…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && me && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sécurité */}
          <Text style={styles.section}>SÉCURITÉ</Text>
          <View style={styles.card}>
            <Row
              icon="shield-check"
              title="Double authentification (2FA)"
              sub={me.totpEnabled ? 'Activée — un code est demandé à la connexion' : 'Renforcez la sécurité de votre compte'}
              right={me.totpEnabled ? <Tag label="Active" tone="success" /> : <Tag label="Inactive" tone="muted" />}
              onPress={() => (me.totpEnabled ? setDisableOpen(true) : navigation.navigate('TotpIntro'))}
            />
          </View>

          {/* Appareils */}
          <Text style={styles.section}>APPAREILS CONNECTÉS</Text>
          <View style={styles.card}>
            {sessions.length === 0 ? (
              <Text style={styles.empty}>Aucune autre session active.</Text>
            ) : (
              sessions.map((s, i) => (
                <View key={s.id} style={[styles.deviceRow, i > 0 && styles.rowBorder]}>
                  <Icon name={s.client === 'web' ? 'key' : 'smartphone'} size={16} variant="tile" style={styles.deviceIcon} />
                  <View style={styles.flex}>
                    <Text style={styles.deviceName}>{s.deviceLabel ?? (s.client === 'web' ? 'Ordinateur' : 'Téléphone')}{s.current ? ' · cet appareil' : ''}</Text>
                    <Text style={styles.deviceSub}>{s.client} · {relTime(s.lastActiveAt)}</Text>
                  </View>
                  {!s.current && (
                    <Pressable onPress={() => revoke(s)} hitSlop={6} style={styles.revokeBtn}>
                      <Icon name="log-out" size={15} color={colors.errorDot} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Compte */}
          <Text style={styles.section}>COMPTE</Text>
          <View style={styles.card}>
            <Row icon="phone" title="Changer de numéro" sub={me.phone ?? undefined} chevron onPress={() => navigation.navigate('PhoneChange')} />
            <View style={styles.rowBorder} />
            <Row icon="log-out" title="Clôturer mon compte" sub="Action définitive après 30 jours" danger chevron onPress={() => navigation.navigate('CloseAccount')} />
          </View>

          <Text style={styles.footNote}>Compte {me.username ? `@${me.username}` : ''} · ULAMU</Text>
        </ScrollView>
      )}

      <DisableTotpModal visible={disableOpen} onClose={() => setDisableOpen(false)} onDone={() => {
        setDisableOpen(false);
        load();
      }} />
    </SafeAreaView>
  );
}

function Row({icon, title, sub, right, chevron, danger, onPress}: {icon: IconName; title: string; sub?: string; right?: React.ReactNode; chevron?: boolean; danger?: boolean; onPress: () => void}) {
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {danger ? (
        <View style={[styles.rowIcon, styles.rowIconDanger]}>
          <Icon name={icon} size={16} color={colors.errorDot} />
        </View>
      ) : (
        <Icon name={icon} size={16} variant="tile" style={styles.rowIcon} />
      )}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, danger && {color: colors.error}]}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
      {chevron && <Icon name="chevron-right" size={16} color={colors.textTertiary} />}
    </Pressable>
  );
}

function Tag({label, tone}: {label: string; tone: 'success' | 'muted'}) {
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();
  const c = tone === 'success' ? {bg: colors.successBg, fg: colors.success} : {bg: colors.bgMuted, fg: colors.textTertiary};
  return (
    <View style={[styles.tag, {backgroundColor: c.bg}]}>
      <Text style={[styles.tagText, {color: c.fg}]}>{label}</Text>
    </View>
  );
}

function DisableTotpModal({visible, onClose, onDone}: {visible: boolean; onClose: () => void; onDone: () => void}) {
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || code.length < 6) {
      return;
    }
    setBusy(true);
    try {
      await api.disableTotp({password, code});
      setPassword('');
      setCode('');
      onDone();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Désactivation impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Désactiver la 2FA</Text>
          <Text style={styles.sheetSub}>Confirmez avec votre mot de passe et un code de votre application d'authentification.</Text>
          <PasswordField value={password} onChangeText={setPassword} placeholder="Votre mot de passe" />
          <Field icon="key" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 10))} placeholder="Code à 6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
          <PrimaryButton title="Désactiver la 2FA" loading={busy} disabled={!password || code.length < 6} onPress={submit} />
          <Pressable onPress={onClose} style={styles.sheetCancel}>
            <Text style={styles.sheetCancelText}>Annuler</Text>
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
  content: {padding: 16, gap: 8, paddingBottom: 28},

  section: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary, marginTop: 10, marginBottom: 2, marginLeft: 2},
  card: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, overflow: 'hidden'},

  row: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13},
  rowIcon: {width: 34, height: 34, borderRadius: radius.md}, // couleur possédée par <Icon variant="tile"> hors 'danger'
  rowIconDanger: {backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center'},
  rowTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  rowSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
  rowBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},

  deviceRow: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13},
  deviceIcon: {width: 34, height: 34, borderRadius: radius.md}, // couleur possédée par <Icon variant="tile"> désormais
  deviceName: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
  deviceSub: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 1},
  revokeBtn: {width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center'},
  empty: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, padding: 14, textAlign: 'center'},

  tag: {borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4},
  tagText: {fontFamily: fonts.body, fontSize: 11, fontWeight: '600'},

  footNote: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: 12},

  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 12},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
  sheetSub: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18},
  sheetCancel: {alignItems: 'center', paddingVertical: 6},
  sheetCancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
});
