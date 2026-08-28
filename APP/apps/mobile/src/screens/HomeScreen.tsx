/**
 * Accueil patient — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens.jsx (HomeView),
 * désormais branché sur le backend RÉEL :
 *   • salutation + zone     → GET /v1/accounts/me
 *   • liste « Disponibles »  → GET /v1/directory (annuaire M05, filtrage chips/texte LOCAL — handoff §5)
 *   • pastille de la cloche  → GET /v1/notifications/me/unread-count
 *   • héro « rappel médicament » → GET /v1/reminders/me (prochaine prise réelle ; « Pris » = POST /:id/taken)
 */
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Avatar, Badge, Card, IconButton, Logo, PulseDot, Switch, VerifiedBadge} from '../components/ui';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Icon, IconName} from '../components/Icon';
import {Grain} from '../components/Grain';
import {ThemeToggle} from '../components/ThemeToggle';
import {AppStackParamList, PatientTabParamList} from '../navigation/types';
import {api} from '../services/api';
import {ChipId, DoctorVM, fetchDoctors} from '../services/directory';
import {avatarUrl} from '../services/media';
import {syncReminderNotifications} from '../services/notifications';
import {AvatarViewer} from '../components/AvatarViewer';
import {useMe} from '../state/MeContext';
import {useAvatarPicker} from '../state/useAvatarPicker';
import {useDialog} from '../components/Dialog';
import {Reminder} from '../lib/contracts';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, 'Accueil'>,
  NativeStackScreenProps<AppStackParamList>
>;

const CHIPS: [ChipId, string][] = [
  ['tous', 'Tous'],
  ['general', 'Généraliste'],
  ['gyneco', 'Spécialiste'],
  ['dentiste', 'Dentaire'],
  ['infirmier', 'Triage'],
];

const QUICK: [IconName, string, string, 'consult' | 'meds' | 'carnet' | 'reminders'][] = [
  ['stethoscope', 'Consulter', 'un médecin', 'consult'],
  ['pill', 'Médicaments', 'trouver & réserver', 'meds'],
  ['bell', 'Mes rappels', 'médicaments', 'reminders'],
  ['file-medical', 'Mon dossier', 'à vie, gratuit', 'carnet'],
];

const greetingWord = (): string => {
  const h = new Date().getHours();
  return h < 18 ? 'Bonjour,' : 'Bonsoir,';
};

/** Minutes depuis minuit pour un "HH:MM". */
const minutesOfDay = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Choisit le rappel actif dont la prochaine prise est la plus proche (aujourd'hui ou demain). */
function pickNextDose(items: Reminder[]): {reminder: Reminder; nextTime: string; tomorrow: boolean} | null {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let best: {reminder: Reminder; nextTime: string; tomorrow: boolean; delta: number} | null = null;
  for (const r of items) {
    if (!r.active || r.times.length === 0) {
      continue;
    }
    for (const t of r.times) {
      const tm = minutesOfDay(t);
      const tomorrow = tm < cur;
      const delta = tomorrow ? tm + 1440 - cur : tm - cur;
      if (!best || delta < best.delta) {
        best = {reminder: r, nextTime: t, tomorrow, delta};
      }
    }
  }
  return best ? {reminder: best.reminder, nextTime: best.nextTime, tomorrow: best.tomorrow} : null;
}

/** Le rappel a-t-il été pris aujourd'hui ? (lastTakenAt même date civile que maintenant). */
const takenToday = (r: Reminder): boolean => {
  if (!r.lastTakenAt) {
    return false;
  }
  const d = new Date(r.lastTakenAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

// ── Recherche profonde + tri (EF-05-03) ──────────────────────────────────────
type SortId = 'relevance' | 'price' | 'rating';
const SORTS: [SortId, string][] = [
  ['relevance', 'Pertinence'],
  ['price', 'Prix (moins cher)'],
  ['rating', 'Note (meilleure)'],
];

/** Minuscule + accents français retirés (indépendant de l'ICU/Hermes) — pour une recherche tolérante. */
const deburr = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ç]/g, 'c');

/** Note numérique d'un soignant (« 4,8 » → 4.8 ; aucun avis → -1) pour le tri. */
const ratingValue = (d: DoctorVM): number => (d.ratingLabel ? parseFloat(d.ratingLabel.replace(',', '.')) : -1);

/**
 * Recherche PROFONDE : chaque mot de la requête doit apparaître quelque part dans le nom, la
 * spécialité, l'arrondissement OU la zone du soignant (tokenisé, insensible à la casse et aux accents).
 * « tal cardio » trouve un cardiologue à Talangaï. Vide = tout passe.
 */
const deepMatch = (d: DoctorVM, query: string): boolean => {
  const q = deburr(query.trim());
  if (!q) {
    return true;
  }
  const hay = deburr([d.name, d.spec, d.zone, d.category].join(' '));
  return q.split(/\s+/).every(tok => hay.includes(tok));
};

type Status = 'loading' | 'ready' | 'error';

export function HomeScreen({navigation}: Props) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ChipId>('tous');
  const [availableNow, setAvailableNow] = useState(false);
  const [sort, setSort] = useState<SortId>('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);

  const {me, refreshMe} = useMe(); // profil global (avatar/prénom du header) — à jour partout instantanément
  const {alert} = useDialog();
  const {change: changePhoto, busy: photoBusy} = useAvatarPicker();
  const [avatarViewer, setAvatarViewer] = useState(false);
  const [doctors, setDoctors] = useState<DoctorVM[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const searchRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      // L'annuaire est public ; me/unread/rappels requièrent la session — on tolère leur échec partiel.
      const [list, badge, rem] = await Promise.all([
        fetchDoctors(),
        api.notificationsUnreadCount().catch(() => ({unread: 0})),
        api.listReminders().catch(() => ({items: [] as Reminder[]})),
      ]);
      setDoctors(list.doctors);
      setUnread(badge.unread);
      setReminders(rem.items);
      syncReminderNotifications(rem.items); // maintient les notifications locales à jour (sans redemander l'autorisation)
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  /**
   * Rafraîchissement au doigt — glisser du haut vers le bas.
   *
   * Volontairement SÉPARÉ de `load()` : celui-ci repasse le statut à « loading », ce qui remplace
   * la liste par son squelette. Au rafraîchissement, l'utilisateur regarde déjà quelque chose —
   * lui retirer l'écran sous les yeux pour le lui rendre une seconde plus tard donne l'impression
   * d'une panne, pas d'une mise à jour. On garde donc l'affichage et on ne montre que la roue.
   *
   * L'écran n'en avait aucun : l'annuaire pouvait rester périmé (un soignant passé en ligne, un
   * compte retiré) sans que l'utilisateur ait le moindre moyen de le corriger, sinon fermer
   * l'application. Ajouté le 28/08/2026, sur demande du porteur.
   */
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [list, badge, rem] = await Promise.all([
        fetchDoctors(),
        api.notificationsUnreadCount().catch(() => ({unread: 0})),
        api.listReminders().catch(() => ({items: [] as Reminder[]})),
      ]);
      setDoctors(list.doctors);
      setUnread(badge.unread);
      setReminders(rem.items);
      syncReminderNotifications(rem.items);
      setStatus('ready'); // un rafraîchissement réussi sort aussi de l'état d'erreur
    } catch {
      // On ne bascule PAS en erreur : l'utilisateur garde la liste qu'il avait, même périmée.
      // Une liste d'hier vaut mieux qu'un écran vide quand le réseau a juste hésité.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Présence en temps réel — l'annuaire se remet à jour tout seul pendant qu'on le regarde.
   *
   * Un soignant passe en ligne, un autre s'absente : sans cela, la liste affichée vieillit sur
   * place et l'utilisateur décide sur une information périmée — il touche « initier » sur
   * quelqu'un qui vient de partir.
   *
   * ⚠️ **Ce n'est pas du « push ».** Le serveur n'a ni WebSocket ni flux d'événements : on
   * interroge. L'effet perçu est le même, le coût ne l'est pas, d'où les deux garde-fous :
   *
   *  1. **Uniquement quand l'écran est visible.** L'écoute s'arrête dès qu'on le quitte. Interroger
   *     un écran que personne ne regarde dépense la batterie et le forfait data de l'utilisateur —
   *     ce qui n'est pas neutre ici.
   *  2. **Silencieux.** Aucun indicateur, aucun squelette : la liste se corrige sous les yeux sans
   *     clignoter. Un rafraîchissement visible toutes les vingt secondes serait insupportable.
   *
   * Vingt secondes : assez court pour qu'une disparition se voie, assez long pour ne pas réveiller
   * l'API en permanence (plan gratuit, elle s'endort à 15 min d'inactivité).
   */
  useEffect(() => {
    let vivant = true;
    let horloge: ReturnType<typeof setInterval> | undefined;

    const sonder = () => {
      fetchDoctors()
        .then(r => {
          if (vivant) setDoctors(r.doctors);
        })
        .catch(() => undefined); // un sondage perdu n'est pas un incident : le suivant corrigera
    };

    const demarrer = () => {
      if (horloge) return;
      sonder(); // tout de suite au retour sur l'écran, sans attendre le premier tour
      horloge = setInterval(sonder, 20_000);
    };
    const arreter = () => {
      if (horloge) clearInterval(horloge);
      horloge = undefined;
    };

    const surFocus = navigation.addListener('focus', demarrer);
    const surSortie = navigation.addListener('blur', arreter);
    demarrer();

    return () => {
      vivant = false;
      arreter();
      surFocus();
      surSortie();
    };
  }, [navigation]);

  // Rafraîchit la cloche + les rappels au retour sur l'Accueil (après lecture / gestion des rappels).
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      refreshMe(); // avatar/prénom à jour après édition du profil
      api.notificationsUnreadCount().then(b => setUnread(b.unread)).catch(() => undefined);
      api.listReminders().then(r => setReminders(r.items)).catch(() => undefined);
    });
    return unsub;
  }, [navigation, refreshMe]);

  const markTaken = useCallback(async (id: string) => {
    setMarkBusy(true);
    try {
      const updated = await api.markReminderTaken(id);
      setReminders(prev => prev.map(r => (r.id === id ? updated : r)));
    } catch {
      alert({title: 'Oups', message: 'Impossible d’enregistrer la prise — réessayez.'});
    } finally {
      setMarkBusy(false);
    }
  }, []);

  const greetName = me ? (me.firstName ?? '').trim() : ''; // prénom seul (demande utilisateur)
  const filtered = doctors.filter(d => (cat === 'tous' || d.chip === cat) && (!availableNow || d.online) && deepMatch(d, q));
  const list =
    sort === 'price'
      ? [...filtered].sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
      : sort === 'rating'
        ? [...filtered].sort((a, b) => ratingValue(b) - ratingValue(a))
        : filtered; // 'relevance' : on garde l'ordre serveur (RM-05-02)
  const filtersActive = availableNow || sort !== 'relevance';
  const dose = pickNextDose(reminders);
  const doseTaken = dose ? takenToday(dose.reminder) : false;

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <Logo />
        <View style={styles.flex} />
        <ThemeToggle />
        <IconButton icon="bell" onPress={() => navigation.navigate('Notifications')} variant="tile" size={19} accessibilityLabel="Notifications">
          {unread > 0 && (
            <View style={styles.bellDotWrap}>
              <PulseDot size={8} />
            </View>
          )}
        </IconButton>
        <Pressable onPress={() => setAvatarViewer(true)} accessibilityLabel="Voir / changer ma photo">
          <Avatar name={greetName || 'U'} size={34} uri={avatarUrl(me?.avatarKey)} />
        </Pressable>
      </View>

      {/* Barre FIXE sous le header — recherche + filtre + chips. Toujours visible (filtrer en scrollant) ;
          étant HORS du ScrollView, la liste défile proprement DESSOUS (plus de souci d'ordre d'affichage). */}
      <View style={styles.fixedBar}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, searchFocus && styles.searchBoxFocus]}>
            <Icon name="search" size={15} color={searchFocus ? colors.accent400 : colors.textTertiary} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={q}
              onChangeText={setQ}
              placeholder="Soignant, spécialité, quartier…"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              returnKeyType="search"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
            {q.length > 0 && (
              <IconButton icon="x" onPress={() => setQ('')} size={14} accessibilityLabel="Effacer la recherche" />
            )}
          </View>
          <Pressable onPress={() => setFilterOpen(true)} style={[styles.filterBtn, filtersActive && styles.filterBtnActive]} hitSlop={6} accessibilityLabel="Filtrer et trier">
            <Icon name="filter" size={16} color={filtersActive ? '#fff' : colors.textSecondary} />
            {filtersActive && <View style={styles.filterBtnDot} />}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} keyboardShouldPersistTaps="handled">
          {CHIPS.map(([id, l]) => {
            const on = cat === id;
            return (
              <Pressable key={id} onPress={() => setCat(id)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{l}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressBackgroundColor={colors.surface}
          />
        }>
        {/* Salutation */}
        <View>
          <Text style={styles.greetHi}>{greetingWord()}</Text>
          <Text style={styles.greetName}>{greetName || 'Bienvenue'}</Text>
          {me?.district ? (
            <View style={styles.greetLoc}>
              <Icon name="map-pin" size={12} color={colors.textTertiary} />
              <Text style={styles.greetLocText}>{me.district}</Text>
            </View>
          ) : null}
        </View>

        {/* Héro rappel médicament — données RÉELLES (M14). Prochaine prise, ou invitation à en créer. */}
        {dose ? (
          <View style={[styles.reminder, doseTaken ? styles.reminderDone : styles.reminderActive, shadow.md]}>
            <View style={[styles.reminderIcon, {backgroundColor: doseTaken ? colors.successBg : 'rgba(255,255,255,0.16)'}]}>
              <Icon name={doseTaken ? 'check-circle' : 'pill'} size={20} color={doseTaken ? colors.successDot : '#fff'} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.reminderKicker, {color: doseTaken ? colors.textTertiary : 'rgba(255,255,255,0.66)'}]}>RAPPEL DE MÉDICAMENT</Text>
              <Text style={[styles.reminderTitle, {color: doseTaken ? colors.textPrimary : '#fff'}]} numberOfLines={1}>
                {dose.reminder.medicationName}{dose.reminder.dosage ? ` · ${dose.reminder.dosage}` : ''}
              </Text>
              <View style={styles.reminderWhen}>
                <Icon name={doseTaken ? 'check' : 'clock'} size={12} color={doseTaken ? colors.success : 'rgba(255,255,255,0.82)'} />
                <Text style={[styles.reminderWhenText, {color: doseTaken ? colors.success : 'rgba(255,255,255,0.82)'}]}>
                  {doseTaken ? `Pris aujourd’hui · prochaine ${dose.nextTime}` : `${dose.tomorrow ? 'Demain' : "Aujourd’hui"}, ${dose.nextTime}`}
                </Text>
              </View>
            </View>
            {!doseTaken && (
              <Pressable disabled={markBusy} onPress={() => markTaken(dose.reminder.id)} style={[styles.reminderBtn, markBusy && {opacity: 0.6}]}>
                <Icon name="check" size={12} color="#fff" strokeWidth={2.4} />
                <Text style={styles.reminderBtnText}>Pris</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={() => navigation.navigate('Reminders')} style={[styles.reminder, styles.reminderEmpty]}>
            <Icon name="bell" size={20} variant="tile" />
            <View style={styles.flex}>
              <Text style={[styles.reminderKicker, {color: colors.textTertiary}]}>RAPPELS DE MÉDICAMENTS</Text>
              <Text style={[styles.reminderTitle, {color: colors.textPrimary}]}>Aucun rappel actif</Text>
              <Text style={[styles.reminderWhenText, {color: colors.textTertiary, marginTop: 2}]}>Touchez pour en programmer un</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {/* Actions rapides */}
        <View style={styles.quickRow}>
          {QUICK.map(([ic, t, s, kind]) => (
            <Pressable key={t} onPress={() => (kind === 'consult' ? searchRef.current?.focus() : kind === 'meds' ? navigation.navigate('Meds') : kind === 'carnet' ? navigation.navigate('Carnet') : navigation.navigate('Reminders'))} style={styles.quickCard}>
              <Icon name={ic} size={17} variant="tile" style={styles.quickIcon} />
              <Text style={styles.quickTitle}>{t}</Text>
              <Text style={styles.quickSub}>{s}</Text>
            </Pressable>
          ))}
        </View>

        {/* Sécurité — activer la 2FA par email (masqué si déjà active, ou si le compte n'a pas
            d'adresse : elle serait alors inactivable). L'activation se fait dans les Réglages, où
            vivent la demande de code et sa confirmation. */}
        {me && !me.emailTwoFactorEnabled && me.email && (
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.secCard}>
            <Icon name="shield-check" size={18} variant="tile" />
            <View style={styles.flex}>
              <Text style={styles.secTitle}>Sécurisez votre compte</Text>
              <Text style={styles.secSub}>Activez la double authentification (code par email)</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {/* Section label */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{availableNow ? 'DISPONIBLES MAINTENANT' : 'SOIGNANTS'}</Text>
          <View style={styles.sectionLine} />
          {status === 'ready' && <Text style={styles.sectionCount}>{list.length}</Text>}
        </View>

        {/* Liste soignants — états réels */}
        {status === 'loading' && <LoadingState label="Chargement des soignants…" />}
        {status === 'error' && <ErrorState onRetry={load} />}
        {status === 'ready' && (
          <View style={{gap: 12}}>
            {list.map(d => (
              <DoctorRow key={d.id} d={d} onPress={() => navigation.navigate('Doctor', {id: d.id})} />
            ))}
            {list.length === 0 && (
              <Card style={{alignItems: 'center', paddingVertical: 6}}>
                <EmptyState
                  title={doctors.length === 0 ? 'Aucun soignant disponible pour le moment.' : 'Aucun soignant ne correspond.'}
                  hint={doctors.length === 0 ? 'Revenez bientôt : de nouveaux praticiens rejoignent ULAMU.' : 'Essayez un autre filtre ou une autre recherche.'}
                />
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        availableNow={availableNow}
        setAvailableNow={setAvailableNow}
        sort={sort}
        setSort={setSort}
        onReset={() => {
          setAvailableNow(false);
          setSort('relevance');
        }}
      />
      <AvatarViewer
        visible={avatarViewer}
        uri={avatarUrl(me?.avatarKey)}
        name={greetName || 'Profil'}
        onClose={() => setAvatarViewer(false)}
        onChangePhoto={() => changePhoto(!!me?.avatarKey)}
        changing={photoBusy}
      />
    </SafeAreaView>
  );
}

/** Feuille « Filtrer & trier » — disponibilité + ordre de la liste (le filtre vit HORS de la barre de recherche). */
function FilterSheet({
  visible,
  onClose,
  availableNow,
  setAvailableNow,
  sort,
  setSort,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  availableNow: boolean;
  setAvailableNow: (v: boolean) => void;
  sort: SortId;
  setSort: (s: SortId) => void;
  onReset: () => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Filtrer &amp; trier</Text>
            <Pressable onPress={onReset} hitSlop={6}>
              <Text style={styles.sheetReset}>Réinitialiser</Text>
            </Pressable>
          </View>

          <Pressable style={styles.availRow} onPress={() => setAvailableNow(!availableNow)}>
            <View style={styles.availIcon}>
              <Icon name="activity" size={16} color={colors.accent400} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.availTitle}>Disponibles maintenant</Text>
              <Text style={styles.availSub}>N'afficher que les soignants en ligne</Text>
            </View>
            <Switch value={availableNow} onValueChange={setAvailableNow} />
          </Pressable>

          <Text style={styles.sortLabel}>TRIER PAR</Text>
          {SORTS.map(([id, label]) => {
            const on = sort === id;
            return (
              <Pressable key={id} onPress={() => setSort(id)} style={[styles.sortRow, on && styles.sortRowOn]}>
                <Text style={[styles.sortText, on && styles.sortTextOn]}>{label}</Text>
                {on && <Icon name="check" size={17} color={colors.accent} strokeWidth={2.4} />}
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} style={styles.sheetApply}>
            <Text style={styles.sheetApplyText}>Voir les résultats</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DoctorRow({d, onPress}: {d: DoctorVM; onPress: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [avatarOpen, setAvatarOpen] = useState(false);
  // Stats RÉELLES (le backend ne fournit ni « patients » ni « expertise » des maquettes — voir services/directory.ts) :
  // note · taux de confirmation · durée de session.
  const stats: [IconName, string, string][] = [
    ['star', d.ratingLabel ?? 'Nouveau', d.reviews > 0 ? `${d.reviews} avis` : 'récent'],
    ['shield-check', `${d.confirmPct}%`, 'confirmation'],
    ['clock', d.durationMin != null ? `${d.durationMin} min` : '—', 'par session'],
  ];
  return (
    <Pressable onPress={onPress} style={[styles.docCard, shadow.sm]}>
      <Grain />
      {/* Bannière */}
      <View style={[styles.docBanner, {backgroundColor: d.online ? colors.accent500 : colors.bgMuted}]}>
        <View style={styles.docWatermark}>
          <Icon name={d.watermark} size={84} color={d.online ? 'rgba(255,255,255,0.13)' : 'rgba(127,127,127,0.13)'} strokeWidth={1} />
        </View>
        <View style={styles.docStatus}>
          <Badge tone={d.online ? 'success' : 'neutral'} dot>
            {d.online ? 'Disponible maintenant' : 'Hors ligne'}
          </Badge>
          {/* Dernière vue — seulement quand il est absent : en ligne, la pastille le dit déjà.
              Écrêté à une semaine côté serveur (arbitrage porteur du 28/08 : EF-05-01 ne prévoit pas
              cette donnée, on l'ajoute mais bornée). Discret : ni pastille, ni cadre. */}
          {!d.online && d.lastSeen ? <Text style={styles.docLastSeen}>{d.lastSeen}</Text> : null}
        </View>
        {d.online && d.resp && (
          <View style={styles.docResp}>
            <Icon name="send" size={10} color="#fff" />
            <Text style={styles.docRespText}>répond en {d.resp}</Text>
          </View>
        )}
      </View>

      {/* Corps */}
      <View style={styles.docBody}>
        <View style={styles.docAvatarRow}>
          <Pressable onPress={() => setAvatarOpen(true)} hitSlop={6} accessibilityLabel={`Voir la photo de ${d.name}`}>
            <Avatar name={d.name} size={58} online={d.online} />
          </Pressable>
        </View>

        <View style={styles.docIdentity}>
          <Text style={styles.docName} numberOfLines={1}>
            {d.name}
          </Text>
          {d.verified && <VerifiedBadge size={16} />}
        </View>
        <Text style={styles.docSpec}>
          {d.spec} · {d.zone}
        </Text>

        {/* Stats */}
        <View style={styles.docStats}>
          {stats.map(([ic, v, l], i) => (
            <View key={l} style={[styles.docStat, i > 0 && styles.docStatBorder]}>
              <View style={styles.docStatVal}>
                <Icon name={ic} size={12} color={ic === 'star' ? '#C49128' : colors.accent400} />
                <Text style={styles.docStatNum}>{v}</Text>
              </View>
              <Text style={styles.docStatLbl}>{l}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.docCtaRow}>
          <View style={[styles.docCta, {backgroundColor: colors.accent500}]}>
            <Icon name="stethoscope" size={14} color="#fff" />
            <Text style={[styles.docCtaText, {color: '#fff'}]}>Voir le profil</Text>
          </View>
          <View style={styles.docShare}>
            <Icon name="share" size={14} color={colors.textSecondary} />
          </View>
        </View>
      </View>
      <AvatarViewer visible={avatarOpen} uri={null} name={d.name} onClose={() => setAvatarOpen(false)} />
    </Pressable>
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
  bellDotWrap: {position: 'absolute', top: 4, right: 5},

  // Liste sous la barre fixe : padding généreux en bas pour que la DERNIÈRE carte (et son bouton
  // partager) passe AU-DESSUS de la barre d'onglets + du bouton Urgence, donc cliquable.
  content: {padding: 16, gap: 16, paddingBottom: 184},
  // Barre FIXE sous le header (hors ScrollView) : la liste défile proprement dessous. Petite ombre
  // douce pour la détacher du contenu qui défile.
  fixedBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 18, // ESPACE entre la barre de recherche et les chips (Tous, Généraliste…) — demande utilisateur
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    zIndex: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
  },

  searchRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  searchBox: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgMuted},
  searchBoxFocus: {borderColor: colors.accent500, borderWidth: 1.5, backgroundColor: colors.surface},
  searchInput: {flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.textPrimary, padding: 0},
  filterBtn: {width: 42, height: 42, borderRadius: 11, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center'},
  filterBtnActive: {backgroundColor: colors.accent500, borderColor: colors.accent500},
  filterBtnDot: {position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff'},

  // Feuille filtre & tri
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 10},
  sheetHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
  sheetReset: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.accent},
  availRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8},
  availIcon: {width: 34, height: 34, borderRadius: radius.md, backgroundColor: 'rgba(39,86,166,0.14)', alignItems: 'center', justifyContent: 'center'},
  availTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  availSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
  sortLabel: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary, marginTop: 6},
  sortRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 13, borderRadius: radius.field, borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: colors.bg},
  sortRowOn: {borderColor: colors.accent500, backgroundColor: colors.accent50},
  sortText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textSecondary},
  sortTextOn: {color: colors.accent},
  sheetApply: {marginTop: 6, height: 48, borderRadius: radius.button, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
  sheetApplyText: {fontFamily: fonts.body, fontWeight: '700', fontSize: 14.5, color: '#fff'},

  // Salutation
  greetHi: {fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary},
  greetName: {fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6, color: colors.textPrimary, lineHeight: 28},
  greetLoc: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  greetLocText: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary},

  // Rappel
  reminder: {flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, padding: 16},
  reminderActive: {backgroundColor: colors.accent500},
  reminderDone: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.successBorder},
  reminderEmpty: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle},
  // Toujours utilisé par le héros rappel ACTIF (couleur dépend de doseTaken, pas du système de tons).
  reminderIcon: {width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center'},
  reminderKicker: {fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.8},
  reminderTitle: {fontFamily: fonts.display, fontSize: 15.5, marginTop: 2},
  reminderWhen: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  reminderWhenText: {fontFamily: fonts.body, fontSize: 12},
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  reminderBtnText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12, color: '#fff'},

  // Actions rapides
  quickRow: {flexDirection: 'row', gap: 8},
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...shadow.sm,
  },
  quickIcon: {marginBottom: 7}, // box/couleur possédés par <Icon variant="tile"> désormais
  quickTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 11.5, color: colors.textPrimary, textAlign: 'center'},
  quickSub: {fontFamily: fonts.body, fontSize: 9.5, color: colors.textTertiary, marginTop: 1, textAlign: 'center'},

  // Sécurité (2FA)
  secCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.card, padding: 12},
  // Box/couleur possédés par <Icon variant="tile"> désormais — secCard a déjà `gap`, pas de marge ici.
  secTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
  secSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textSecondary, marginTop: 1},

  // Chips
  chipsRow: {gap: 7, paddingRight: 16},
  chip: {paddingHorizontal: 12, paddingVertical: 5.5, borderRadius: radius.pill, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderDefault},
  chipOn: {backgroundColor: colors.accent500, borderColor: colors.accent500},
  chipText: {fontFamily: fonts.body, fontSize: 12, fontWeight: '500', color: colors.textSecondary},
  chipTextOn: {color: '#fff', fontWeight: '600'},

  // Section label
  sectionLabel: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -4},
  sectionLabelText: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary},
  sectionLine: {flex: 1, height: 1, backgroundColor: colors.borderSubtle},
  sectionCount: {fontFamily: fonts.mono, fontSize: 10, color: colors.accent400},

  // Carte médecin
  docCard: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, overflow: 'hidden'},
  docBanner: {height: 64, overflow: 'hidden'},
  docWatermark: {position: 'absolute', right: -8, top: -14},
  docStatus: {position: 'absolute', top: 10, left: 14},
  // Volontairement effacé : une mention de service, pas une information de premier plan.
  docLastSeen: {
    marginTop: 4,
    fontSize: 10.5,
    color: colors.textTertiary,
    letterSpacing: 0.1,
  },
  docResp: {
    position: 'absolute',
    top: 11,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  docRespText: {fontFamily: fonts.mono, fontSize: 10, fontWeight: '600', color: '#fff'},
  docBody: {paddingHorizontal: 16},
  docAvatarRow: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -26},
  docIdentity: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8},
  docName: {fontFamily: fonts.display, fontSize: 16.5, letterSpacing: -0.3, color: colors.textPrimary, flexShrink: 1},
  docSpec: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textAccent, marginTop: 2},
  docStats: {flexDirection: 'row', marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  docStat: {flex: 1, alignItems: 'center', gap: 1},
  docStatBorder: {borderLeftWidth: 1, borderLeftColor: colors.borderSubtle},
  docStatVal: {flexDirection: 'row', alignItems: 'center', gap: 4},
  docStatNum: {fontFamily: fonts.display, fontSize: 13.5, color: colors.textPrimary},
  docStatLbl: {fontFamily: fonts.body, fontSize: 9.5, color: colors.textTertiary},
  docCtaRow: {flexDirection: 'row', gap: 8, paddingBottom: 14, paddingTop: 2},
  docCta: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: radius.md},
  docCtaText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13},
  docShare: {width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center'},
  });
