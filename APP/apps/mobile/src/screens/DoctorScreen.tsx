/**
 * Profil du soignant — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens.jsx (DoctorView),
 * branché sur GET /v1/directory/:id (M05). Les TARIFS n'apparaissent QUE sur cet écran (règle handoff §5).
 * Footer collant : en ligne → « Initier la consultation » (poignée de main M06) ;
 * hors ligne → cloche « M'avertir quand il est disponible » (CU-05-05 / EF-05-06).
 * Header : bouton Partager (Share natif iOS/Android).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Avatar, Badge, Banner, Card, IconButton, PrimaryButton, VerifiedBadge, VerifiedTag} from '../components/ui';
import {AvatarViewer} from '../components/AvatarViewer';
import {useDialog} from '../components/Dialog';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {alertAvailability, DoctorProfileVM, fetchDoctorProfile, formatXaf} from '../services/directory';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Status = 'loading' | 'ready' | 'error';

export function DoctorScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Doctor'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const {id} = route.params;
  const [doctor, setDoctor] = useState<DoctorProfileVM | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [alerting, setAlerting] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setDoctor(await fetchDoctorProfile(id));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onInitiate = async () => {
    if (!doctor) {
      return;
    }
    if (!doctor.consultOfferId) {
      await alert({title: 'Indisponible', message: "Ce soignant n'a pas d'offre de consultation active pour l'instant."});
      return;
    }
    setInitiating(true);
    try {
      const hs = await api.initiateHandshake({offerId: doctor.consultOfferId});
      navigation.navigate('Handshake', {
        handshakeId: hs.id,
        professionalName: doctor.name,
        amountXaf: doctor.consultPrice ?? 0,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Action impossible — réessayez.';
      await alert({title: "Impossible d'initier", message: msg});
    } finally {
      setInitiating(false);
    }
  };

  const onShare = async () => {
    if (!doctor) {
      return;
    }
    try {
      const price = doctor.consultPrice != null ? ` — consultation ${formatXaf(doctor.consultPrice)}` : '';
      await Share.share({
        message: `${doctor.name}, ${doctor.spec} (${doctor.zone}) sur ULAMU${price}. Consultez en ligne, ordonnance signée incluse.`,
      });
    } catch {
      // Partage annulé ou indisponible — on ignore silencieusement (comportement standard iOS/Android).
    }
  };

  const onAlert = async () => {
    if (!doctor) {
      return;
    }
    setAlerting(true);
    try {
      await alertAvailability(doctor.id);
      await alert({title: 'Alerte posée', message: `Vous serez averti dès que ${doctor.name} repasse en ligne (valable 7 jours).`});
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Action impossible — réessayez.';
      await alert({title: 'Oups', message: msg});
    } finally {
      setAlerting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Profil du soignant</Text>
        <IconButton icon="share" onPress={onShare} disabled={status !== 'ready'} variant="tile" size={18} accessibilityLabel="Partager ce profil" />
      </View>

      {status === 'loading' && <LoadingState label="Chargement du profil…" />}
      {status === 'error' && <ErrorState onRetry={load} />}

      {status === 'ready' && doctor && (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Identité */}
            <View style={styles.identity}>
              <Pressable onPress={() => setAvatarOpen(true)} hitSlop={6} accessibilityLabel={`Voir la photo de ${doctor.name}`}>
                <Avatar name={doctor.name} size={68} online={doctor.online} />
              </Pressable>
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {doctor.name}
                  </Text>
                  <VerifiedBadge size={18} />
                </View>
                <Text style={styles.spec}>{doctor.spec}</Text>
                <View style={{marginTop: 7}}>
                  <VerifiedTag />
                </View>
                <View style={styles.badgeRow}>
                  <Badge tone={doctor.online ? 'success' : 'neutral'} dot>
                    {doctor.online ? 'En ligne' : 'Hors ligne'}
                  </Badge>
                  <Badge tone="neutral" icon="map-pin">
                    {doctor.zone}
                  </Badge>
                </View>
              </View>
            </View>

            {/* Stats segmentées */}
            <Card padding={0}>
              <View style={styles.statsRow}>
                {([
                  ['star', doctor.ratingLabel ?? 'Nouveau', doctor.reviews > 0 ? `${doctor.reviews} avis` : 'récent'],
                  ['clock', doctor.consultDurationMin != null ? `${doctor.consultDurationMin} min` : '—', 'par session'],
                  ['send', doctor.resp ?? '—', 'réponse'],
                ] as [IconName, string, string][]).map(([ic, v, l], i) => (
                  <View key={l} style={[styles.stat, i > 0 && styles.statBorder]}>
                    <Icon name={ic} size={15} />
                    <Text style={styles.statNum}>{v}</Text>
                    <Text style={styles.statLbl}>{l}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Tarifs */}
            <SectionLabel>Tarifs</SectionLabel>
            <Card padding={0}>
              <View style={styles.tariffs}>
                <TariffRow
                  icon="stethoscope"
                  title="Consultation"
                  sub={`${doctor.consultDurationMin ?? '—'} min · messagerie`}
                  price={doctor.consultPrice != null ? formatXaf(doctor.consultPrice) : '—'}
                  first
                />
                {doctor.followPrice != null && (
                  <TariffRow icon="refresh" title="Session de suivi" sub="tarif réduit" price={formatXaf(doctor.followPrice)} />
                )}
                <TariffRow icon="file-medical" title="Ordonnance signée" sub="incluse" price="Gratuit" free />
              </View>
            </Card>

            {/* Pré-consultation */}
            <SectionLabel>Avant la session</SectionLabel>
            <Card padding={14}>
              <View style={styles.preRow}>
                <Icon name="file-medical" size={17} variant="tile" />
                <View style={styles.flex}>
                  <Text style={styles.preTitle}>Pré-consultation gratuite</Text>
                  <Text style={styles.preText}>
                    Décrivez votre motif en quelques questions. {doctor.name.split(' ').slice(0, 2).join(' ')} le lira dès la poignée de main.
                  </Text>
                </View>
              </View>
            </Card>

            <Banner tone="info" title="Poignée de main avant paiement">
              Aucun franc n'est débité tant que le soignant n'a pas confirmé être prêt. Remboursement automatique en cas de défaillance.
            </Banner>
          </ScrollView>

          {/* Footer collant */}
          <View style={styles.footer}>
            <View style={styles.flex}>
              <Text style={styles.footerPrice}>{doctor.consultPrice != null ? formatXaf(doctor.consultPrice) : 'Sur devis'}</Text>
              <Text style={styles.footerSub}>{doctor.online ? 'débité après la poignée de main' : 'indisponible pour le moment'}</Text>
            </View>
            {doctor.online ? (
              <PrimaryButton title="Initier la consultation" iconLeft="stethoscope" loading={initiating} onPress={onInitiate} />
            ) : (
              <PrimaryButton title="M'avertir" iconLeft="bell" loading={alerting} onPress={onAlert} />
            )}
          </View>
        </>
      )}
      {doctor && <AvatarViewer visible={avatarOpen} uri={null} name={doctor.name} onClose={() => setAvatarOpen(false)} />}
    </SafeAreaView>
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{String(children).toUpperCase()}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function TariffRow({icon, title, sub, price, first, free}: {icon: IconName; title: string; sub: string; price: string; first?: boolean; free?: boolean}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.tariffRow, !first && styles.tariffBorder]}>
      <Icon name={icon} size={16} color={colors.textTertiary} />
      <View style={styles.flex}>
        <Text style={styles.tariffTitle}>{title}</Text>
        <Text style={styles.tariffSub}>{sub}</Text>
      </View>
      <Text style={[styles.tariffPrice, free && {color: colors.success}]}>{price}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: colors.bg},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {flex: 1, fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},

  content: {padding: 16, gap: 14, paddingBottom: 110},

  // Identité
  identity: {flexDirection: 'row', gap: 14, alignItems: 'center'},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  name: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary, flexShrink: 1},
  spec: {fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, marginTop: 2},
  badgeRow: {flexDirection: 'row', gap: 6, marginTop: 8},

  // Stats
  statsRow: {flexDirection: 'row'},
  stat: {flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 8},
  statBorder: {borderLeftWidth: 1, borderLeftColor: colors.borderSubtle},
  statNum: {fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
  statLbl: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary},

  // Tarifs
  tariffs: {paddingHorizontal: 14},
  tariffRow: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11},
  tariffBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  tariffTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  tariffSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary},
  tariffPrice: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary},

  // Pré-consultation
  preRow: {flexDirection: 'row', gap: 11},
  preTitle: {fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.textPrimary},
  preText: {fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary, marginTop: 3},

  // Section label
  sectionLabel: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sectionLabelText: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary},
  sectionLine: {flex: 1, height: 1, backgroundColor: colors.borderSubtle},

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerPrice: {fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4, color: colors.textPrimary},
  footerSub: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary},
});
