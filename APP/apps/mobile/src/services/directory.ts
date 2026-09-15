/**
 * Service de domaine ANNUAIRE (M05) — premier service « par domaine » du client mobile.
 * Mappe les DTO publics du backend (DirectoryItem/DirectoryProfile) vers des modèles de vue
 * (DoctorVM/DoctorProfileVM) prêts à afficher, et regroupe le formatage (prix, note, délai).
 *
 * Fidélité aux maquettes : la carte soignant (Maquettes_ULAMU/.../screens.jsx) montre des
 * « stats sociales ». Le backend NE fournit PAS de nombre de patients ni d'années d'expérience
 * (champs de démo des maquettes) — on ne les invente pas (« sans simulation »). On remplit les
 * mêmes emplacements visuels avec les signaux RÉELS de l'annuaire (note, taux de confirmation,
 * durée de session, délai de réponse — RM-05-01/02), qui sont aussi la preuve sociale d'ULAMU.
 */
import {IconName} from '../components/Icon';
import {DirectoryItem, DirectoryOffer, DirectoryProfile, DirectoryQuery, ProfessionalCategory} from '../lib/contracts';
import {api} from './api';

/** Onglets de filtre de l'Accueil (maquette) ; « autre » n'apparaît que sous « Tous ». */
export type ChipId = 'tous' | 'general' | 'gyneco' | 'dentiste' | 'infirmier';

export interface DoctorVM {
  id: string;
  name: string;
  category: ProfessionalCategory;
  /** Onglet de rattachement pour le filtrage local (maquette : chips). */
  chip: ChipId | 'autre';
  spec: string;
  zone: string;
  online: boolean;
  /**
   * « Vu il y a 5 min » — `null` quand le soignant est en ligne, car il n'y a rien à dater.
   *
   * Le serveur écrête la valeur à une semaine : au-delà, on lit « il y a plus d'une semaine » et
   * jamais « il y a trois mois ». Un médecin qui s'éloigne ne porte pas son absence en écriteau.
   */
  lastSeen: string | null;
  /** Soignant certifié par la procédure de vérification ULAMU (M03/D-029) — l'annuaire n'en liste pas d'autres. */
  verified: boolean;
  /** Note formatée « 4,8 » ou null (→ « Nouveau »). */
  ratingLabel: string | null;
  reviews: number;
  confirmPct: number;
  /** Délai de réponse « ~3 min » ou null. */
  resp: string | null;
  /**
   * Le prix de la CONSULTATION la moins chère — ce qu'un nouveau patient peut réellement payer.
   *
   * ⚠️ Jusqu'au 15/09 le serveur y mettait la moins chère **tous types confondus** : dès qu'un
   * soignant publiait un tarif de suivi, sa carte annonçait ce tarif-là. Vu en production ce
   * jour-là : « 15 min · 3 000 F » pour une consultation de 30 min à 5 000 F. *Un prix d'appel
   * qu'on ne peut pas payer n'est pas un prix, c'est un appât.*
   *
   * `null` quand il n'y a aucune consultation active : il n'y a alors rien à vendre, et l'écran
   * le dit plutôt que d'afficher un zéro ou le prix d'autre chose.
   */
  price: number | null;
  /** La durée de cette même offre — les deux décrivent la même chose, ou aucun des deux n'est vrai. */
  durationMin: number | null;
  /** Combien de consultations au choix : décide du « à partir de » (chantier 121). */
  consultationCount: number;
  /** Icône en filigrane de la bannière, selon la catégorie. */
  watermark: IconName;
}

export interface DoctorProfileVM extends DoctorVM {
  bio: string | null;
  /**
   * **Toutes** les offres de consultation actives, de la moins chère à la plus chère.
   *
   * ⚠️ Ce champ remplace le trio `consultOfferId / consultPrice / consultDurationMin`, qui ne
   * portait que la PREMIÈRE offre standard rencontrée : le soignant peut en publier jusqu'à cinq
   * (PM-25), et le téléphone en imposait une sans jamais montrer les autres. *Choisir à la place de
   * quelqu'un ce qu'il va payer, c'est décider pour lui de ce dont il a besoin.*
   *
   * Le tarif de SUIVI n'y est pas : voir `followPrice`.
   */
  consultOffers: DirectoryOffer[];
  /**
   * Le tarif de suivi, pour information seulement — il n'entre pas dans le choix du patient.
   *
   * C'est le prix de quelqu'un qu'on suit DÉJÀ : il se déclenche sur proposition du soignant après
   * un compte-rendu. L'afficher comme une consultation vendrait 2 500 XAF ce qui en vaut 5 000
   * (défaut corrigé au chantier 65) ; le taire laisserait croire qu'un suivi se repaie plein tarif.
   */
  followOfferId: string | null;
  followPrice: number | null;
  followDurationMin: number | null;
  /**
   * La répartition des notes — « 1 patient sur 5 », « 0 sur 4 »… (EF-05-07).
   *
   * ⚠️ Servie par l'API depuis toujours, **portée par aucun modèle de vue et affichée nulle part**
   * jusqu'au 15/09. Or une moyenne seule ne dit pas la même chose selon ce qu'elle recouvre :
   * *« 3,5 » né de deux avis moyens n'est pas « 3,5 » né d'un enthousiasme et d'un désastre.*
   */
  ratingDistribution: Record<string, number>;
  /**
   * Ce que les patients ont écrit — anonymes, au plus dix, du plus récent au plus ancien (EF-05-07).
   *
   * ⚠️ Idem : servis depuis toujours, jamais montrés. Sur une plateforme où l'on confie sa santé à
   * quelqu'un qu'on ne rencontrera jamais, *les mots des autres patients sont le seul élément de
   * preuve qui ne vienne ni du soignant, ni de la plateforme.*
   */
  comments: DoctorComment[];
}

export interface DoctorComment {
  score: number;
  comment: string;
  /** « 11 sept. » — déjà mis en forme : l'écran n'a pas à connaître le format ISO. */
  dateLabel: string;
}

interface CategoryMeta {
  label: string;
  chip: ChipId | 'autre';
  icon: IconName;
}

/** Catégories Prisma (M05) → libellé FR + onglet de filtre + icône de filigrane. */
const CATEGORY_META: Record<ProfessionalCategory, CategoryMeta> = {
  GENERAL_PRACTITIONER: {label: 'Médecin généraliste', chip: 'general', icon: 'stethoscope'},
  SPECIALIST: {label: 'Médecin spécialiste', chip: 'gyneco', icon: 'activity'},
  DENTIST: {label: 'Dentiste', chip: 'dentiste', icon: 'shield-check'},
  MIDWIFE: {label: 'Sage-femme', chip: 'autre', icon: 'activity'},
  NURSE: {label: 'Infirmier·ère · triage à domicile', chip: 'infirmier', icon: 'activity'},
  COMMUNITY_HEALTH_WORKER: {label: 'Agent de santé communautaire', chip: 'autre', icon: 'users'},
};

/** Prix XAF → « 12 000 F » (séparateur d'espace, indépendant d'Intl/Hermes). */
export function formatXaf(xaf: number): string {
  return String(Math.round(xaf)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
}

/** Note moyenne → « 4,8 » ; null si aucun avis (affichage honnête, EF-05-07). */
function formatRating(avg: number | null): string | null {
  return avg === null ? null : avg.toFixed(1).replace('.', ',');
}

/**
 * « il y a 5 min », « il y a 2 jours », « il y a plus d'une semaine ».
 *
 * `null` quand le soignant est en ligne : la pastille verte le dit déjà, et dater une présence en
 * cours n'apprend rien. Le plafond d'une semaine vient du SERVEUR — ici on se contente de le lire :
 * si la valeur atteint le plafond, on cesse de compter et on dit « plus d'une semaine ».
 */
const SEMAINE_S = 7 * 24 * 3600;

export function formatDerniereVue(secondes: number | null): string | null {
  if (secondes === null) return null;
  if (secondes >= SEMAINE_S) return 'Vu il y a plus d’une semaine';
  if (secondes < 60) return 'Vu à l’instant';
  const min = Math.floor(secondes / 60);
  if (min < 60) return `Vu il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Vu il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `Vu il y a ${j} jour${j > 1 ? 's' : ''}`;
}

/** Délai moyen de confirmation (s) → « ~3 min » ; null si inconnu. */
function formatResp(delayS: number | null): string | null {
  if (delayS === null) {
    return null;
  }
  if (delayS < 90) {
    return '~1 min';
  }
  return `~${Math.round(delayS / 60)} min`;
}

export function toDoctorVM(item: DirectoryItem): DoctorVM {
const meta: CategoryMeta = CATEGORY_META[item.category] ?? {label: item.category, chip: 'autre', icon: 'stethoscope'};
  return {
    id: item.professionalId,
    name: item.displayName,
    category: item.category,
    chip: meta.chip,
    spec: item.specialty ?? meta.label,
    zone: item.district ?? '—',
    online: item.availableNow,
    lastSeen: formatDerniereVue(item.lastSeenSeconds ?? null),
    verified: item.badgeVerified,
    ratingLabel: formatRating(item.rating.avg),
    reviews: item.rating.count,
    confirmPct: item.reactivity.confirmRatePct,
    resp: formatResp(item.reactivity.avgConfirmDelayS),
    price: item.cheapestOffer?.priceXaf ?? null,
    durationMin: item.cheapestOffer?.durationMin ?? null,
    consultationCount: item.consultationCount,
    watermark: meta.icon,
  };
}

export function toDoctorProfileVM(p: DirectoryProfile): DoctorProfileVM {
  const base = toDoctorVM(p);
  /*
    ── Une offre de SUIVI n'est pas une consultation (chantier 65, 07/09/2026) ──────────────────

    Cette ligne se lisait `find(STANDARD) ?? p.offers[0]` : à défaut d'offre standard, elle prenait
    **n'importe quelle offre**, y compris une offre de suivi.

    ⚠️ Or le suivi a un rôle précis : il « déclenche la proposition automatique après un
    compte-rendu ». C'est le tarif de quelqu'un qu'on suit DÉJÀ. Le présenter comme une première
    consultation vendait 2 500 XAF ce qui en vaut 5 000 — et le serveur ne s'y oppose pas, puisqu'il
    accepte toute offre active (à raison : c'est ainsi que la proposition de suivi démarre sa
    session).

    Le repli est donc retiré : sans offre STANDARD active, il n'y a pas de consultation à vendre, et
    l'écran le dit.

    ── Le patient choisit son offre (chantier 120, 15/09/2026) ─────────────────────────────────

    Cette ligne se lisait `find(o => o.kind === 'STANDARD')` — LA PREMIÈRE offre standard, et l'écran
    n'affichait qu'elle. Le soignant peut pourtant en publier jusqu'à cinq (PM-25) : une courte, une
    longue, une de nuit. **Le patient n'en voyait qu'une, et c'est celle-là qu'il payait.**

    ⚠️ Et « la première » ne voulait rien dire de stable : l'annuaire sert les offres par prix
    croissant, donc l'ordre du menu changeait dès que le soignant retouchait un tarif.

    Elles sont désormais **toutes** rendues, triées du moins cher au plus cher — le tri du serveur
    est déjà celui-là, on ne s'y fie pas pour autant : une liste dont l'ordre décide de ce qui est
    coché par défaut ne se laisse pas à la bonne volonté de son fournisseur.
  */
  const consultOffers = p.offers.filter(o => o.kind === 'STANDARD').sort((a, b) => a.priceXaf - b.priceXaf);
  const follow = p.offers.find(o => o.kind === 'FOLLOW_UP') ?? null;
  return {
    ...base,
    bio: p.biography,
    // `base.price` est l'offre la MOINS CHÈRE, tous types confondus : s'en servir ici afficherait le
    // tarif de suivi comme prix de consultation. Sans offre standard, il n'y a rien à vendre.
    consultOffers,
    followOfferId: follow?.id ?? null,
    followPrice: follow?.priceXaf ?? null,
    followDurationMin: follow?.durationMin ?? null,
    ratingDistribution: p.ratingDistribution,
    comments: p.latestComments.map(c => ({score: c.score, comment: c.comment, dateLabel: formatDateCourte(c.createdAt)})),
  };
}

/**
 * « 2026-09-11T20:05:41Z » → « 11 sept. ».
 *
 * ⚠️ Écrit à la main, sans `Intl` : Hermes est livré sans données ICU complètes selon la version
 * du moteur, et `toLocaleDateString('fr-FR')` y rend tantôt « 11 septembre », tantôt « 9/11/2026 ».
 * C'est la même raison qui a fait écrire `formatXaf` à la main.
 */
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatDateCourte(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // Une date illisible ne vaut pas une date inventée : on n'écrit rien plutôt qu'un « 1 janv. 1970 ».
    return '';
  }
  const annee = d.getFullYear();
  const cetteAnnee = new Date().getFullYear();
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}${annee === cetteAnnee ? '' : ` ${annee}`}`;
}

export interface DoctorList {
  doctors: DoctorVM[];
  total: number;
  suggestion: string | null;
}

/** Recherche l'annuaire et mappe en modèles de vue (le filtrage chips/texte reste local). */
export async function fetchDoctors(query: DirectoryQuery = {}): Promise<DoctorList> {
  const res = await api.searchDirectory(query);
  return {doctors: res.items.map(toDoctorVM), total: res.total, suggestion: res.suggestion};
}

export async function fetchDoctorProfile(id: string): Promise<DoctorProfileVM> {
  return toDoctorProfileVM(await api.getProfessionalProfile(id));
}

export function alertAvailability(id: string): ReturnType<typeof api.poseAvailabilityAlert> {
  return api.poseAvailabilityAlert(id);
}
