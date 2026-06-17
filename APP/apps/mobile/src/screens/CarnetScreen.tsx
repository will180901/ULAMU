/**
 * Dossier médical à vie — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens2.jsx (DossierScreen).
 * Branché M07 : fiche synthèse `GET /health-record/me/summary` (groupe sanguin, allergies, chroniques —
 * CALCULÉE serveur), chronologie `GET /health-record/me` (provenance visible RM-07-03, entrées immuables
 * RM-07-02 : une correction reste visible), déclaration patient `POST /me/entries` (CU-07-02 : « on protège
 * d'abord »), export `GET /me/export` (empreinte sha256 vérifiable ; PDF signé = lot ultérieur EF-07-08).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Badge, Banner, Card, IconButton, PrimaryButton} from '../components/ui';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {DeclarableType, HealthSummary, RecordEntry, RecordEntryType, RecordExport, RecordProvenance} from '../lib/contracts';
import {useDialog} from '../components/Dialog';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const TYPE_META: Record<RecordEntryType, {icon: IconName; label: string}> = {
  CONSULTATION_REPORT: {icon: 'stethoscope', label: 'Consultation'},
  PRESCRIPTION: {icon: 'file-medical', label: 'Ordonnance'},
  LAB_RESULTS: {icon: 'activity', label: "Résultats d'examens"},
  VITALS: {icon: 'activity', label: 'Constantes'},
  ALLERGY: {icon: 'shield-check', label: 'Allergie'},
  MEDICAL_HISTORY: {icon: 'file-medical', label: 'Antécédent'},
  VACCINATION: {icon: 'shield-check', label: 'Vaccination'},
  PERSONAL_NOTE: {icon: 'message', label: 'Note personnelle'},
};
const PROVENANCE_LABEL: Record<RecordProvenance, string> = {
  DECLARED_BY_PATIENT: 'déclaré par vous',
  RECORDED_BY_PROFESSIONAL: 'constaté par un soignant',
  SYSTEM: 'système',
};

/** Choix de déclaration → (type backend + fabrique de payload). */
const DECLARE_KINDS: {key: string; label: string; placeholder: string; build: (text: string) => {type: DeclarableType; payload: Record<string, unknown>}}[] = [
  {key: 'allergy', label: 'Allergie', placeholder: 'Ex : Pénicilline', build: t => ({type: 'ALLERGY', payload: {label: t}})},
  {key: 'blood', label: 'Groupe sanguin', placeholder: 'Ex : O+', build: t => ({type: 'MEDICAL_HISTORY', payload: {kind: 'blood_type', value: t}})},
  {key: 'chronic', label: 'Maladie chronique', placeholder: 'Ex : Hypertension', build: t => ({type: 'MEDICAL_HISTORY', payload: {kind: 'chronic_disease', label: t}})},
  {key: 'vaccination', label: 'Vaccination', placeholder: 'Ex : Fièvre jaune', build: t => ({type: 'VACCINATION', payload: {label: t}})},
  {key: 'note', label: 'Note', placeholder: 'Une information à retenir…', build: t => ({type: 'PERSONAL_NOTE', payload: {label: t}})},
];

function entrySubtitle(e: RecordEntry): string {
  const p = e.payload || {};
  const s = (k: string): string | null => (typeof p[k] === 'string' && (p[k] as string).trim() ? (p[k] as string) : null);
  if (p.kind === 'blood_type') return `Groupe sanguin : ${s('value') ?? '—'}`;
  return s('label') ?? s('value') ?? s('diagnosis') ?? s('name') ?? s('summary') ?? TYPE_META[e.type]?.label ?? '';
}

/** Sérialise le carnet exporté en texte lisible, partageable via le Share natif (sans dépendance PDF). */
function buildExportText(exp: RecordExport, title: string): string {
  const c = exp.content as {entries?: RecordEntry[]};
  const entries = Array.isArray(c.entries) ? c.entries : [];
  const lines: string[] = [];
  lines.push(`CARNET DE SANTÉ ULAMU — ${title}`);
  lines.push(`Exporté le ${fmtDate(exp.generatedAt)}`);
  lines.push(`Empreinte ${exp.algorithm} : ${exp.fingerprint}`);
  lines.push('');
  lines.push(`HISTORIQUE (${entries.length} entrée${entries.length > 1 ? 's' : ''})`);
  lines.push('');
  for (const e of entries) {
    const meta = TYPE_META[e.type] ?? {label: e.type};
    const corr = e.superseded ? ' (corrigée)' : '';
    lines.push(`• ${fmtDate(e.createdAt)} — ${meta.label}${corr}`);
    lines.push(`  ${entrySubtitle(e)}`);
    lines.push(`  Provenance : ${PROVENANCE_LABEL[e.provenance] ?? e.provenance}`);
  }
  lines.push('');
  lines.push("Document généré par ULAMU — gratuit, à vie, votre propriété (D-020). Vérifiez l'empreinte pour authentifier ce carnet.");
  return lines.join('\n');
}

type Status = 'loading' | 'ready' | 'error';

export function CarnetScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Carnet'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const sub = route.params?.subProfileId;
  const screenTitle = route.params?.title ?? 'Dossier médical';
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [declareOpen, setDeclareOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [s, rec] = await Promise.all([api.getHealthSummary(sub), api.getHealthRecord(undefined, 50, sub)]);
      setSummary(s);
      setEntries(rec.items);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [sub]);

  useEffect(() => {
    load();
  }, [load]);

  const onExport = async () => {
    try {
      const exp = await api.exportHealthRecord(sub);
      await Share.share({title: `Carnet de santé — ${screenTitle}`, message: buildExportText(exp, screenTitle)});
    } catch (e) {
      // Le partage annulé par l'utilisateur rejette aussi → on n'alerte que sur une vraie erreur API.
      if (e instanceof ApiError) {
        alert({title: 'Oups', message: e.message});
      }
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <Badge tone="success" icon="lock">Chiffré</Badge>
      </View>

      {status === 'loading' && <LoadingState label="Ouverture de votre dossier…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && summary && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {summary.activeAllergies.length > 0 && (
            <Banner tone="error" title={`Allergie${summary.activeAllergies.length > 1 ? 's' : ''} : ${summary.activeAllergies.join(', ')}`}>
              Visible par tout soignant en session — garde-fou actif à la prescription (CU-07-02).
            </Banner>
          )}

          {/* Synthèse */}
          <View style={styles.tiles}>
            <SummaryTile icon="users" value={summary.bloodType ?? '—'} label="groupe" />
            <SummaryTile icon="shield-check" value={String(summary.activeAllergies.length)} label="allergies" />
            <SummaryTile icon="file-medical" value={String(summary.chronicDiseases.length)} label="chroniques" />
          </View>

          {summary.chronicDiseases.length > 0 && (
            <View style={styles.chips}>
              {summary.chronicDiseases.map(c => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={() => setDeclareOpen(true)} style={styles.declareBtn}>
            <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.2} />
            <Text style={styles.declareText}>Déclarer une information de santé</Text>
          </Pressable>

          {/* Historique */}
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>HISTORIQUE</Text>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionCount}>{entries.length}</Text>
          </View>

          {entries.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 6}}>
              <EmptyState icon="file-medical" title="Votre dossier est vide pour l'instant." hint="Vos consultations, ordonnances et déclarations s'y ajouteront automatiquement." />
            </Card>
          ) : (
            <Card padding={0}>
              <View style={styles.timeline}>
                {entries.map((e, i) => (
                  <TimelineRow key={e.id} entry={e} first={i === 0} last={i === entries.length - 1} />
                ))}
              </View>
            </Card>
          )}

          <Pressable onPress={onExport} style={styles.exportBtn}>
            <Icon name="share" size={15} color={colors.textSecondary} />
            <Text style={styles.exportText}>Exporter mon carnet</Text>
          </Pressable>
          <Text style={styles.footNote}>Gratuit, à vie, votre propriété (D-020). Jamais de contenu médical sur l'écran verrouillé.</Text>
        </ScrollView>
      )}

      <DeclareModal subProfileId={sub} visible={declareOpen} onClose={() => setDeclareOpen(false)} onDone={() => {
        setDeclareOpen(false);
        load();
      }} />
    </SafeAreaView>
  );
}

function SummaryTile({icon, value, label}: {icon: IconName; value: string; label: string}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tile}>
      <Icon name={icon} size={15} variant="tile" />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function TimelineRow({entry, first, last}: {entry: RecordEntry; first: boolean; last: boolean}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = TYPE_META[entry.type] ?? {icon: 'file-medical' as IconName, label: entry.type};
  return (
    <View style={[styles.tlRow, !first && styles.tlBorder]}>
      <View style={styles.tlGutter}>
        <Icon name={meta.icon} size={13} variant="tile" style={styles.tlDot} />
        {!last && <View style={styles.tlLine} />}
      </View>
      <View style={styles.flex}>
        <Text style={[styles.tlTitle, entry.superseded && styles.tlSuperseded]}>{meta.label}</Text>
        <Text style={styles.tlSub}>{entrySubtitle(entry)}</Text>
        <View style={styles.tlMetaRow}>
          <Text style={styles.tlDate}>{fmtDate(entry.createdAt)}</Text>
          <Text style={styles.tlProv}>· {PROVENANCE_LABEL[entry.provenance]}</Text>
          {entry.superseded && <Text style={styles.tlCorrected}>· corrigée</Text>}
        </View>
      </View>
    </View>
  );
}

function DeclareModal({subProfileId, visible, onClose, onDone}: {subProfileId?: string; visible: boolean; onClose: () => void; onDone: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const [kind, setKind] = useState(DECLARE_KINDS[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (value.length < 1) {
      return;
    }
    setBusy(true);
    try {
      await api.declareHealthEntry(kind.build(value), subProfileId);
      setText('');
      onDone();
    } catch (e) {
      alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Déclaration impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Déclarer une information</Text>
          <Text style={styles.sheetSub}>Elle sera marquée « déclarée par vous » et prise en compte immédiatement (CU-07-02).</Text>

          <View style={styles.kindRow}>
            {DECLARE_KINDS.map(k => {
              const on = k.key === kind.key;
              return (
                <Pressable key={k.key} onPress={() => setKind(k)} style={[styles.kindChip, on && styles.kindChipOn]}>
                  <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.sheetInput}
            value={text}
            onChangeText={setText}
            placeholder={kind.placeholder}
            placeholderTextColor={colors.textDisabled}
            autoFocus
          />

          <PrimaryButton title="Ajouter à mon carnet" iconRight="check" loading={busy} disabled={text.trim().length < 1} onPress={submit} />
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
  content: {padding: 16, gap: 14, paddingBottom: 28},

  tiles: {flexDirection: 'row', gap: 8},
  tile: {flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, paddingVertical: 12},
  tileValue: {fontFamily: fonts.monoMedium, fontSize: 15, color: colors.textPrimary},
  tileLabel: {fontFamily: fonts.body, fontSize: 9.5, color: colors.textTertiary},

  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {backgroundColor: colors.bgMuted, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5},
  chipText: {fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary},

  declareBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.card, paddingVertical: 12},
  declareText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.accent},

  sectionLabel: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -2},
  sectionLabelText: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary},
  sectionLine: {flex: 1, height: 1, backgroundColor: colors.borderSubtle},
  sectionCount: {fontFamily: fonts.mono, fontSize: 10, color: colors.accent400},

  timeline: {paddingHorizontal: 14},
  tlRow: {flexDirection: 'row', gap: 11, paddingVertical: 12},
  tlBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  tlGutter: {alignItems: 'center', width: 28},
  tlDot: {width: 28, height: 28, borderRadius: 14}, // couleur/bordure possédées par <Icon variant="tile"> désormais
  tlLine: {width: 1, flex: 1, minHeight: 10, backgroundColor: colors.borderSubtle, marginTop: 4},
  tlTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
  tlSuperseded: {textDecorationLine: 'line-through', color: colors.textTertiary},
  tlSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
  tlMetaRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3},
  tlDate: {fontFamily: fonts.mono, fontSize: 9.5, color: colors.textDisabled},
  tlProv: {fontFamily: fonts.body, fontSize: 9.5, color: colors.textDisabled},
  tlCorrected: {fontFamily: fonts.body, fontSize: 9.5, color: colors.warning},

  exportBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: radius.button, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault},
  exportText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textSecondary},
  footNote: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary, textAlign: 'center', lineHeight: 15},

  // Declare modal
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 12},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
  sheetSub: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18},
  kindRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  kindChip: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault},
  kindChipOn: {backgroundColor: colors.accent500, borderColor: colors.accent500},
  kindChipText: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '500', color: colors.textSecondary},
  kindChipTextOn: {color: '#fff', fontWeight: '600'},
  sheetInput: {minHeight: 48, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary},
  sheetCancel: {alignItems: 'center', paddingVertical: 6},
  sheetCancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
