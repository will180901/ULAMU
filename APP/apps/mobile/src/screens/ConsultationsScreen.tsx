/**
 * Onglet Consultations — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/tabs.jsx (ConsultTab).
 * Chronologie UNIFIÉE branchée RÉEL : sessions de soin (`GET /v1/care-sessions/mine`, M06) ET
 * ordonnances (`GET /v1/prescriptions/me`, M09), fusionnées et groupées par mois. Tap → session (M06)
 * ou ordonnance/QR (M09). Triages (M08) / délivrances (M12) s'y ajouteront à leurs lots.
 */
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Card} from '../components/ui';
import {Grain} from '../components/Grain';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Icon, IconName} from '../components/Icon';
import {api} from '../services/api';
import {CareSessionListItem, CareSessionStatus, PrescriptionStatus, PrescriptionView} from '../lib/contracts';
import {AppStackParamList, PatientTabParamList} from '../navigation/types';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

type Filter = 'all' | 'session' | 'prescription';
const FILTERS: [Filter, IconName, string][] = [
  ['all', 'filter', 'Tout afficher'],
  ['session', 'message', 'Consultations'],
  ['prescription', 'file-medical', 'Ordonnances'],
];

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, 'Consultations'>,
  NativeStackScreenProps<AppStackParamList>
>;
type Status = 'loading' | 'ready' | 'error';

type Activity =
  | {kind: 'session'; id: string; at: number; session: CareSessionListItem}
  | {kind: 'prescription'; id: string; at: number; presc: PrescriptionView};

const SESSION_META: Record<CareSessionStatus, {label: string; tone: 'accent' | 'neutral'; live?: boolean; icon: IconName}> = {
  PREPARING: {label: 'En préparation', tone: 'accent', icon: 'clock'},
  ACTIVE: {label: 'En cours', tone: 'accent', live: true, icon: 'message'},
  ENDED: {label: 'Terminée', tone: 'neutral', icon: 'check-circle'},
  REFUNDED: {label: 'Remboursée', tone: 'neutral', icon: 'refresh'},
};
const PRESC_META: Record<PrescriptionStatus, {label: string; tone: 'accent' | 'neutral'}> = {
  ACTIVE: {label: 'Active', tone: 'accent'},
  PARTIALLY_DISPENSED: {label: 'En cours', tone: 'accent'},
  DISPENSED: {label: 'Délivrée', tone: 'neutral'},
  EXPIRED: {label: 'Expirée', tone: 'neutral'},
  CANCELLED: {label: 'Annulée', tone: 'neutral'},
};

export function ConsultationsScreen({navigation}: Props) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [sessions, prescriptions] = await Promise.all([api.listMyCareSessions(), api.listMyPrescriptions()]);
      const merged: Activity[] = [
        ...sessions.items.map(s => ({kind: 'session' as const, id: s.id, at: new Date(s.paidAt).getTime(), session: s})),
        ...prescriptions.items.map(p => ({kind: 'prescription' as const, id: p.id, at: new Date(p.createdAt).getTime(), presc: p})),
      ].sort((a, b) => b.at - a.at);
      setActivities(merged);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = filter === 'all' ? activities : activities.filter(a => a.kind === filter);
  const groups = groupByMonth(visible);
  const filterLabel = FILTERS.find(f => f[0] === filter)?.[2] ?? 'Tout afficher';

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultations</Text>
        <Pressable onPress={() => setFilterOpen(true)} style={[styles.iconBtn, filter !== 'all' && styles.iconBtnActive]} hitSlop={6}>
          <Icon name="filter" size={18} color={filter !== 'all' ? colors.accent : colors.textSecondary} />
          {filter !== 'all' && <View style={styles.iconDot} />}
        </Pressable>
      </View>

      {status === 'loading' && <LoadingState label="Chargement de votre historique…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {filter !== 'all' && (
            <Pressable onPress={() => setFilter('all')} style={styles.activeFilter}>
              <Icon name="filter" size={13} color={colors.accent} />
              <Text style={styles.activeFilterText}>Filtre : {filterLabel}</Text>
              <Icon name="x" size={14} color={colors.accent} />
            </Pressable>
          )}
          {visible.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState
                icon="message"
                title={filter === 'all' ? "Aucune activité pour l'instant." : 'Rien ne correspond à ce filtre.'}
                hint={filter === 'all' ? "Trouvez un soignant depuis l'Accueil pour démarrer une consultation." : 'Touchez le filtre pour afficher toutes vos activités.'}
              />
            </Card>
          ) : (
            groups.map(([label, rows]) => (
              <View key={label} style={{gap: 12}}>
                <View style={styles.sectionLabel}>
                  <Text style={styles.sectionLabelText}>{label.toUpperCase()}</Text>
                  <View style={styles.sectionLine} />
                </View>
                {rows.map(a =>
                  a.kind === 'session' ? (
                    <SessionRow key={a.id} item={a.session} onPress={() => navigation.navigate('Session', {sessionId: a.id})} />
                  ) : (
                    <PrescriptionRow key={a.id} presc={a.presc} onPress={() => navigation.navigate('Ordonnance', {prescriptionId: a.id})} />
                  ),
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Filtrer par type</Text>
            {FILTERS.map(([id, ic, label]) => {
              const on = filter === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setFilter(id);
                    setFilterOpen(false);
                  }}
                  style={[styles.filterRow, on && styles.filterRowOn]}>
                  <Icon name={ic} size={17} color={on ? colors.accent : colors.textSecondary} />
                  <Text style={[styles.filterRowText, on && styles.filterRowTextOn]}>{label}</Text>
                  {on && <Icon name="check" size={17} color={colors.accent} strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SessionRow({item, onPress}: {item: CareSessionListItem; onPress: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = SESSION_META[item.status];
  const live = !!meta.live;
  const label = item.status === 'ENDED' && item.reportDepositedAt ? 'Compte-rendu reçu' : meta.label;
  return (
    <Pressable onPress={onPress} style={[styles.card, live && styles.cardLive]}>
      <Icon name={meta.icon} size={18} variant="tile" />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>Consultation</Text>
        <Text style={styles.cardSub}>{fmtDate(item.paidAt)} · {item.durationMin} min</Text>
      </View>
      <StatusBadge tone={meta.tone} live={live} label={label} />
    </Pressable>
  );
}

function PrescriptionRow({presc, onPress}: {presc: PrescriptionView; onPress: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = PRESC_META[presc.status];
  const names = presc.lines.map(l => l.freeText).filter(Boolean) as string[];
  const sub = names.length > 0 ? names.join(' · ') : `${presc.lines.length} médicament${presc.lines.length > 1 ? 's' : ''}`;
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Icon name="file-medical" size={18} variant="tile" />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>Ordonnance</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{fmtDate(presc.createdAt)} · {sub}</Text>
      </View>
      <StatusBadge tone={meta.tone} label={meta.label} />
    </Pressable>
  );
}

function StatusBadge({tone, live, label}: {tone: 'accent' | 'neutral'; live?: boolean; label: string}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const map = {
    accent: {bg: 'rgba(39,86,166,0.12)', fg: colors.accent, dot: colors.accent},
    neutral: {bg: colors.bgMuted, fg: colors.textSecondary, dot: colors.textTertiary},
  }[tone];
  return (
    <View style={[styles.badge, {backgroundColor: map.bg}]}>
      {live && <View style={[styles.badgeDot, {backgroundColor: map.dot}]} />}
      <Text style={[styles.badgeText, {color: map.fg}]}>{label}</Text>
    </View>
  );
}

function groupByMonth(items: Activity[]): [string, Activity[]][] {
  const order: string[] = [];
  const map = new Map<string, Activity[]>();
  for (const it of items) {
    const d = new Date(it.at);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(it);
  }
  return order.map(k => [k, map.get(k)!]);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
  iconBtn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
  iconBtnActive: {backgroundColor: colors.accent50},
  iconDot: {position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent},

  content: {padding: 16, gap: 12, paddingBottom: 24},
  activeFilter: {flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6},
  activeFilterText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12, color: colors.accent},

  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 8},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary, marginBottom: 4},
  filterRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 13, borderRadius: radius.field, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: colors.bg},
  filterRowOn: {borderColor: colors.accent500, backgroundColor: colors.accent50},
  filterRowText: {flex: 1, fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textSecondary},
  filterRowTextOn: {color: colors.accent},
  sectionLabel: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sectionLabelText: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary},
  sectionLine: {flex: 1, height: 1, backgroundColor: colors.borderSubtle},

  card: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
  cardLive: {borderColor: 'rgba(111,146,218,0.4)'},
  cardTitle: {fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.textPrimary},
  cardSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 2},

  badge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill},
  badgeDot: {width: 6, height: 6, borderRadius: 3},
  badgeText: {fontFamily: fonts.body, fontSize: 11, fontWeight: '600'},
});
