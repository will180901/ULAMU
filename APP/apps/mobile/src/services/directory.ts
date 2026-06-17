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
import {DirectoryItem, DirectoryProfile, DirectoryQuery, ProfessionalCategory} from '../lib/contracts';
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
  /** Soignant certifié par la procédure de vérification ULAMU (M03/D-029) — l'annuaire n'en liste pas d'autres. */
  verified: boolean;
  /** Note formatée « 4,8 » ou null (→ « Nouveau »). */
  ratingLabel: string | null;
  reviews: number;
  confirmPct: number;
  /** Délai de réponse « ~3 min » ou null. */
  resp: string | null;
  price: number | null;
  durationMin: number | null;
  /** Icône en filigrane de la bannière, selon la catégorie. */
  watermark: IconName;
}

export interface DoctorProfileVM extends DoctorVM {
  bio: string | null;
  /** Offre de consultation STANDARD — point de départ de la poignée de main (M06). */
  consultOfferId: string | null;
  consultPrice: number | null;
  consultDurationMin: number | null;
  followOfferId: string | null;
  followPrice: number | null;
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
    verified: item.badgeVerified,
    ratingLabel: formatRating(item.rating.avg),
    reviews: item.rating.count,
    confirmPct: item.reactivity.confirmRatePct,
    resp: formatResp(item.reactivity.avgConfirmDelayS),
    price: item.cheapestOffer?.priceXaf ?? null,
    durationMin: item.cheapestOffer?.durationMin ?? null,
    watermark: meta.icon,
  };
}

export function toDoctorProfileVM(p: DirectoryProfile): DoctorProfileVM {
  const base = toDoctorVM(p);
  const standard = p.offers.find(o => o.kind === 'STANDARD') ?? p.offers[0] ?? null;
  const follow = p.offers.find(o => o.kind === 'FOLLOW_UP') ?? null;
  return {
    ...base,
    bio: p.biography,
    consultOfferId: standard?.id ?? null,
    consultPrice: standard?.priceXaf ?? base.price,
    consultDurationMin: standard?.durationMin ?? base.durationMin,
    followOfferId: follow?.id ?? null,
    followPrice: follow?.priceXaf ?? null,
  };
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
