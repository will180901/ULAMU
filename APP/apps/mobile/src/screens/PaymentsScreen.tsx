/**
 * Mes paiements — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/tabs.jsx (PaymentsScreen).
 * Branché M13 : `GET /v1/payments/receipts` (reçus du payeur, EF-13-05 — « jamais un franc de plus »).
 * Le module M13 est AVEUGLE au métier (RM-13-01) : on libelle l'opération depuis l'orderRef OPAQUE.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Card, IconButton} from '../components/ui';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {Receipt} from '../lib/contracts';
import {formatXaf} from '../services/directory';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Libellé + sens de l'opération depuis l'orderRef OPAQUE (handshake:/disclosure:/session:…) + kind. */
function describe(r: Receipt): {label: string; icon: IconName; refund: boolean} {
  const ref = (r.orderRef || '').toLowerCase();
  const kind = (r.kind || '').toLowerCase();
  const refund = kind.includes('refund') || kind.includes('rembours');
  if (ref.startsWith('handshake') || ref.startsWith('session')) return {label: 'Consultation', icon: 'stethoscope', refund};
  if (ref.startsWith('disclosure') || ref.startsWith('devoilement')) return {label: 'Dévoilement pharmacie', icon: 'pill', refund};
  if (ref.startsWith('mission') || ref.startsWith('triage')) return {label: 'Triage à domicile', icon: 'activity', refund};
  if (refund) return {label: 'Remboursement', icon: 'refresh', refund: true};
  return {label: r.kind || 'Paiement', icon: 'credit-card', refund};
}

export function PaymentsScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Payments'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setReceipts(await api.listReceipts());
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
        <Text style={styles.headerTitle}>Mes paiements</Text>
      </View>

      {status === 'loading' && <LoadingState label="Chargement de vos reçus…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {receipts.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState icon="credit-card" title="Aucun paiement pour l'instant." hint="Vos reçus de consultation et de dévoilement apparaîtront ici." />
            </Card>
          ) : (
            <Card padding={0}>
              <View style={styles.list}>
                {receipts.map((r, i) => {
                  const d = describe(r);
                  return (
                    <View key={r.number} style={[styles.row, i > 0 && styles.rowBorder]}>
                      <Icon name={d.icon} size={15} variant="tile" style={styles.rowIcon} />
                      <View style={styles.flex}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{d.label}</Text>
                        <Text style={styles.rowSub}>{r.number} · {fmtDate(r.createdAt)}</Text>
                      </View>
                      <Text style={[styles.amount, d.refund && {color: colors.success}]}>
                        {d.refund ? '+' : '−'}{formatXaf(r.amountXaf)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
          {receipts.length > 0 && (
            <View style={styles.footRow}>
              <Icon name="shield-check" size={12} color={colors.successDot} />
              <Text style={styles.footText}>Reçu systématique · jamais un franc de plus que le prix affiché</Text>
            </View>
          )}
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

    content: {padding: 16, gap: 12, paddingBottom: 24},
    list: {paddingHorizontal: 14},
    row: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12},
    rowBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    rowIcon: {width: 32, height: 32, borderRadius: radius.md}, // couleur possédée par <Icon variant="tile"> désormais
    rowTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.textPrimary},
    rowSub: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 1},
    amount: {fontFamily: fonts.monoMedium, fontSize: 12.5, color: colors.textPrimary},

    footRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 16},
    footText: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary, textAlign: 'center'},
  });
