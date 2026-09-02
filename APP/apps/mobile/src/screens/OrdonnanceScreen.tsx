/**
 * Ordonnance + QR de délivrance — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens2.jsx (QRScreen).
 * Branché M09 : `GET /v1/prescriptions/:id`. La zone QR est à FOND BLANC FORCÉ quel que soit le contexte
 * (lisible plein soleil, M09 §8) + invite « luminosité au maximum ». Le QR n'est qu'une CLÉ : l'état réel
 * vit côté serveur (RM-09-02) ; il est inerte si l'ordonnance n'est plus active (annulée/expirée/délivrée).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Badge, Banner, Card, IconButton} from '../components/ui';
import {Grain} from '../components/Grain';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {PrescriptionStatus, PrescriptionView} from '../lib/contracts';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const shortRef = (id: string): string => `ORD-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

const STATUS: Record<PrescriptionStatus, {label: string; tone: 'neutral' | 'success'}> = {
  ACTIVE: {label: 'Active', tone: 'success'},
  PARTIALLY_DISPENSED: {label: 'Partiellement délivrée', tone: 'neutral'},
  DISPENSED: {label: 'Délivrée', tone: 'neutral'},
  EXPIRED: {label: 'Expirée', tone: 'neutral'},
  CANCELLED: {label: 'Annulée', tone: 'neutral'},
};

export function OrdonnanceScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Ordonnance'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {prescriptionId} = route.params;
  const [presc, setPresc] = useState<PrescriptionView | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setPresc(await api.getPrescription(prescriptionId));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [prescriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  const st = presc ? STATUS[presc.status] : null;

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Ordonnance</Text>
        {st && <Badge tone={st.tone} icon={st.tone === 'success' ? 'shield-check' : 'clock'}>{st.label}</Badge>}
      </View>

      {status === 'loading' && <LoadingState label="Ouverture de l'ordonnance…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && presc && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Zone QR — fond blanc forcé (M09 §8) */}
          <View style={[styles.qrCard, shadow.md]}>
            {presc.qrToken ? (
              <>
                <View style={styles.qrBox}>
                  <QRCode value={presc.qrToken} size={184} backgroundColor="#FFFFFF" color="#111112" />
                </View>
                <Text style={styles.qrRef}>{shortRef(presc.id)}</Text>
                <Text style={styles.qrHint}>Sceau d'intégrité · ne sert pas à la délivrance</Text>
              </>
            ) : (
              <View style={styles.qrInactive}>
                <Icon name="lock" size={26} color="#A1A1AA" />
                <Text style={styles.qrInactiveText}>QR inactif — ordonnance {st?.label.toLowerCase()}</Text>
              </View>
            )}
          </View>

          {presc.status === 'CANCELLED' && presc.cancelReason && (
            <Banner tone="warning" title="Ordonnance annulée">{presc.cancelReason}</Banner>
          )}

          {/* Médicaments */}
          <Card padding={0}>
            <View style={styles.lines}>
              {presc.lines.map((l, i) => (
                <View key={l.id} style={[styles.line, i > 0 && styles.lineBorder]}>
                  <Icon name="pill" size={16} variant="tile" />
                  <View style={styles.flex}>
                    <Text style={styles.lineName}>{l.freeText ?? l.medicationName ?? 'Médicament prescrit'}</Text>
                    <Text style={styles.linePoso}>
                      {l.posology}
                      {l.durationDays ? ` · ${l.durationDays} jours` : ''}
                      {l.qtyPrescribed ? ` · ${l.qtyPrescribed} u.` : ''}
                    </Text>
                  </View>
                  {l.qtyDispensed > 0 && (
                    <Text style={styles.lineRemaining}>{l.remaining}/{l.qtyPrescribed}</Text>
                  )}
                </View>
              ))}
            </View>
          </Card>

          {/* Authenticité / validité */}
          <Card padding={13}>
            <View style={styles.sigRow}>
              <View style={styles.sigIcon}>
                <Icon name="shield-check" size={17} color={colors.successDot} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.sigTitle}>Ordonnance signée et authentifiée</Text>
                <Text style={styles.sigSub}>Émise le {fmtDate(presc.createdAt)} · valable jusqu'au {fmtDate(presc.expiresAt)}</Text>
              </View>
            </View>
          </Card>

          {/*
            02/09/2026 (chantier 27) — disait « Le pharmacien scanne ce code : il voit les lignes et
            quantités restantes ». Faux depuis le même jour : la chaîne du médicament est sortie du
            produit (D-052), aucune officine n'est reliée à ULAMU.

            C'est la phrase la plus coûteuse des six retirées ce jour-là, parce qu'elle arrive au
            moment du soin : un patient qui compte dessus se présente au comptoir avec un téléphone
            au lieu d'une ordonnance lisible.
          */}
          <Text style={styles.footNote}>Montrez cette ordonnance à votre pharmacien : il y lit les médicaments, les doses et la durée. Le code n'est qu'un sceau — il prouve qu'elle n'a pas été modifiée, il ne se scanne pas.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    content: {padding: 16, gap: 14, paddingBottom: 28},

    qrCard: {backgroundColor: '#FFFFFF', borderRadius: radius.xl, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center'},
    qrBox: {backgroundColor: '#FFFFFF', padding: 4},
    qrRef: {fontFamily: fonts.monoMedium, fontSize: 13, color: '#111112', marginTop: 14, letterSpacing: 0.5},
    qrHint: {fontFamily: fonts.body, fontSize: 11, color: '#71717A', marginTop: 3},
    qrInactive: {alignItems: 'center', gap: 10, paddingVertical: 30},
    qrInactiveText: {fontFamily: fonts.body, fontSize: 13, color: '#71717A'},

    lines: {paddingHorizontal: 14},
    line: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11},
    lineBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    lineName: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
    linePoso: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
    lineRemaining: {fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary},

    sigRow: {flexDirection: 'row', alignItems: 'center', gap: 11},
    sigIcon: {width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center'},
    sigTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
    sigSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},

    footNote: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary, textAlign: 'center', lineHeight: 15},
  });
