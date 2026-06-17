/**
 * Onglet Mon espace — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/tabs.jsx (SpaceTab),
 * branché sur GET /v1/accounts/me (identité) + GET /v1/me/space (compteurs, RM-16-02 : jamais le Carnet).
 * Les tuiles (Dossier, Carnet familial, Rappels, Paiements) arrivent à leurs lots respectifs.
 */
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Avatar, Card, IconButton} from '../components/ui';
import {AvatarViewer} from '../components/AvatarViewer';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {avatarUrl} from '../services/media';
import {ThemeToggle} from '../components/ThemeToggle';
import {useAuth} from '../state/AuthContext';
import {useMe} from '../state/MeContext';
import {useAvatarPicker} from '../state/useAvatarPicker';
import {useDialog} from '../components/Dialog';
import {api} from '../services/api';
import {PatientSpaceResponse} from '../lib/contracts';
import {AppStackParamList, PatientTabParamList} from '../navigation/types';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type TileAction = 'carnet' | 'family' | 'reminders' | 'payments';
const TILES: [IconName, string, string, TileAction][] = [
  ['file-medical', 'Dossier médical', 'Gratuit, à vie', 'carnet'],
  ['users', 'Carnet familial', 'Proches à charge', 'family'],
  ['pill', 'Mes rappels', 'Médicaments', 'reminders'],
  ['credit-card', 'Mes paiements', 'Reçus MoMo', 'payments'],
];
const TILE_ROUTE: Record<TileAction, 'Carnet' | 'Family' | 'Reminders' | 'Payments'> = {
  carnet: 'Carnet',
  family: 'Family',
  reminders: 'Reminders',
  payments: 'Payments',
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, 'Espace'>,
  NativeStackScreenProps<AppStackParamList>
>;
type Status = 'loading' | 'ready' | 'error';

export function SpaceScreen({navigation}: Props) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {logout} = useAuth();
  const {me, refreshMe} = useMe(); // profil global → l'avatar/prénom se mettent à jour partout instantanément
  const {confirm} = useDialog();
  const {change: changePhoto, busy: photoBusy} = useAvatarPicker();
  const [space, setSpace] = useState<PatientSpaceResponse | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [viewerOpen, setViewerOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const counters = await api.patientSpace();
      setSpace(counters);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Rafraîchit profil + compteurs au retour sur l'onglet (ex. après édition du profil).
  useEffect(() => navigation.addListener('focus', () => { refreshMe(); load(); }), [navigation, refreshMe, load]);

  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Se déconnecter',
      message: 'Voulez-vous vraiment vous déconnecter de votre compte ULAMU ?',
      confirmLabel: 'Se déconnecter',
      cancelLabel: 'Annuler',
      danger: true,
    });
    if (ok) {
      logout();
    }
  };

  const name = me ? [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || 'Patient' : ''; // nom complet : initiales de l'avatar
  const firstName = me ? (me.firstName ?? '').trim() || 'Patient' : ''; // affiché en texte : prénom seul (demande utilisateur)
  const stats: [number, string][] = [
    [space?.sessionsCount ?? 0, 'consultations'],
    [space?.prescriptionsCount ?? 0, 'ordonnances'],
    [space?.disclosuresCount ?? 0, 'dévoilements'],
  ];

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon espace</Text>
        <ThemeToggle />
        <View style={{width: 8}} />
        <IconButton icon="settings" onPress={() => navigation.navigate('Settings')} variant="tile" size={18} accessibilityLabel="Réglages" />
      </View>

      {status === 'loading' && <LoadingState label="Chargement de votre espace…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && me && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Carte profil */}
          <Card padding={16}>
            <View style={styles.profileRow}>
              <Pressable onPress={() => setViewerOpen(true)} accessibilityLabel="Voir la photo en plein écran">
                <Avatar name={name} size={52} uri={avatarUrl(me.avatarKey)} />
              </Pressable>
              <Pressable style={styles.flex} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.profileName} numberOfLines={1}>{firstName}</Text>
                <Text style={styles.profileId}>@{me.username ?? '—'}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('EditProfile')} hitSlop={6}>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.statsRow}>
              {stats.map(([v, l], i) => (
                <View key={l} style={[styles.stat, i > 0 && styles.statBorder]}>
                  <Text style={styles.statNum}>{v}</Text>
                  <Text style={styles.statLbl}>{l}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Tuiles */}
          <View style={styles.tiles}>
            {TILES.map(([ic, t, s, action]) => (
              <Pressable key={t} onPress={() => navigation.navigate(TILE_ROUTE[action])} style={styles.tile}>
                <Icon name={ic} size={17} variant="tile" style={styles.tileIcon} />
                <Text style={styles.tileTitle}>{t}</Text>
                <Text style={styles.tileSub}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {/* Confidentialité */}
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.privacyCard}>
            <Icon name="shield-check" size={18} color={colors.successDot} />
            <View style={styles.flex}>
              <Text style={styles.privacyTitle}>Confidentialité</Text>
              <Text style={styles.privacySub}>Chiffré · jamais de contenu médical sur l'écran verrouillé</Text>
            </View>
            <Icon name="chevron-right" size={15} color={colors.textTertiary} />
          </Pressable>

          {/* Déconnexion */}
          <Pressable onPress={confirmLogout} style={styles.logoutBtn}>
            <Icon name="log-out" size={17} color={colors.textSecondary} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        </ScrollView>
      )}

      <AvatarViewer visible={viewerOpen} uri={avatarUrl(me?.avatarKey)} name={name || 'Profil'} onClose={() => setViewerOpen(false)} onChangePhoto={() => changePhoto(!!me?.avatarKey)} changing={photoBusy} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary},

    content: {padding: 16, gap: 14, paddingBottom: 24},

    profileRow: {flexDirection: 'row', alignItems: 'center', gap: 13},
    profileName: {fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary},
    profileId: {fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary, marginTop: 2},
    statsRow: {flexDirection: 'row', marginTop: 13, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    stat: {flex: 1, alignItems: 'center'},
    statBorder: {borderLeftWidth: 1, borderLeftColor: colors.borderSubtle},
    statNum: {fontFamily: fonts.display, fontSize: 17, color: colors.textPrimary},
    statLbl: {fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, marginTop: 1},

    tiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
    tile: {width: '47.8%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 14},
    tileIcon: {marginBottom: 10}, // box/couleur possédés par <Icon variant="tile"> désormais
    tileTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
    tileSub: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 2},

    privacyCard: {flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
    privacyTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
    privacySub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},

    logoutBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: radius.button, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault, marginTop: 2},
    logoutText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textSecondary},
  });
