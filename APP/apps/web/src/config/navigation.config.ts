/**
 * Source de vérité unique de la navigation. Chaque entrée déclare les capacités qui la rendent
 * visible ; `useNavigation` filtre selon la session courante.
 *
 * **Reconstruit le 20/08/2026**, après la table rase. Les groupes reprennent ceux de
 * `docs/maquettes/B1 - Coquille applicative.dc.html` — Principal, Mon activité, Compte — mais la
 * maquette ne montre que le parcours d'un soignant. Les entrées de pharmacie et d'administration
 * sont réparties dans les mêmes groupes selon leur nature, et non ajoutées en vrac à la fin.
 *
 * ⚠️ Une entrée qui mène à un écran vide est une fausse piste. Chaque capacité déclarée ici doit
 * correspondre à ce que le SERVEUR autorise réellement — la garde de route n'est qu'un confort
 * d'affichage, c'est l'API qui décide (EF-02-02).
 */
import {
  Activity,
  Banknote,
  ClipboardCheck,
  ClipboardList,
  Flag,
  Handshake,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  TrendingUp,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Capability } from '@/hooks/useCapabilities'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  href: string
  capabilities: Capability[]
}

export interface NavGroup {
  /** Affiché en monospace majuscule au-dessus du groupe (CG-06). Absent = pas d'intitulé. */
  label?: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      {
        key: 'dashboard',
        label: 'Tableau de bord',
        icon: LayoutDashboard,
        href: '/dashboard',
        capabilities: ['professional', 'admin'],
      },
      /* M03 — dépôt et suivi du dossier. Les administrateurs n'en ont pas : la capacité `admin` est
         volontairement absente, une entrée qui mène à une page vide est une fausse piste. */
      {
        key: 'verification',
        label: 'Ma vérification',
        icon: ShieldCheck,
        href: '/verification',
        capabilities: ['professional'],
      },
    ],
  },
  {
    label: 'Mon activité',
    items: [
      /* Soignant — M05, M06, M13. Un pharmacien ne vend pas de consultation ; un administrateur
         n'apparaît pas dans l'annuaire. */
      { key: 'vitrine', label: 'Ma vitrine', icon: Store, href: '/vitrine', capabilities: ['professional'] },
      /* ⭐ Le cœur du produit : c'est ici qu'un soignant répond à un patient. */
      { key: 'demandes', label: 'Demandes', icon: Handshake, href: '/demandes', capabilities: ['professional'] },
      { key: 'consultations', label: 'Consultations', icon: MessageSquare, href: '/consultations', capabilities: ['professional'] },

      /* Officine — M02, M11, M12. Réservé aux membres de structure. */

      /* M13 — soignant ET structure. La page choisit le porteur d'après le rôle ; le serveur, lui,
         réserve les retraits au titulaire d'une officine (EF-02-05). */
      { key: 'gains', label: 'Mes gains', icon: TrendingUp, href: '/gains', capabilities: ['professional'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      /* Sous-rôles : chaque administrateur ne voit que son domaine (EF-02-08). Le Super Admin voit
         tout, puisque c'est lui qui attribue les sous-rôles. */
      {
        key: 'admin-verification',
        label: 'File de vérification',
        icon: ClipboardCheck,
        href: '/admin/verification',
        capabilities: ['admin:verification', 'admin:super'],
      },
      {
        key: 'admin-finance',
        label: 'Finance',
        icon: Banknote,
        href: '/admin/finance',
        capabilities: ['admin:finance', 'admin:super'],
      },
      /* Le serveur ouvre les signalements à ADMIN_VERIFICATION (EF-04-05/06) : réserver l'entrée
         au super-admin cacherait un écran auquel il a droit. */
      {
        key: 'admin-signalements',
        label: 'Signalements',
        icon: Flag,
        href: '/admin/signalements',
        capabilities: ['admin:verification', 'admin:super'],
      },
      /* Les routes comptes du serveur acceptent ADMIN_VERIFICATION et ADMIN_MAP (EF-16-03/07) :
         réserver l'entrée au super-admin cacherait un écran auquel ils ont droit. */
      {
        key: 'admin-comptes',
        label: 'Comptes',
        icon: UserCog,
        href: '/admin/comptes',
        capabilities: ['admin:verification', 'admin:map', 'admin:super'],
      },
      { key: 'admin-pilotage', label: 'Pilotage', icon: Activity, href: '/admin/pilotage', capabilities: ['admin:super'] },
      /* EF-02-08 : sans cet écran, attribuer un sous-rôle imposait de rejouer le seed. */
      {
        key: 'admin-administrateurs',
        label: 'Administrateurs',
        icon: KeyRound,
        href: '/admin/administrateurs',
        capabilities: ['admin:super'],
      },
      /* EF-16-04 : sans cet écran, changer un seuil imposait une migration de base. */
      {
        key: 'admin-parametres',
        label: 'Paramètres métier',
        icon: SlidersHorizontal,
        href: '/admin/parametres',
        capabilities: ['admin:super'],
      },
    ],
  },
  {
    label: 'Compte',
    items: [
      { key: 'parametres', label: 'Mes paramètres', icon: Settings, href: '/parametres', capabilities: ['professional', 'admin'] },
    ],
  },
]

/**
 * Intitulé affiché sous le logo dans la barre latérale, et premier maillon du fil d'Ariane.
 * La maquette écrit « Espace soignant » en dur — elle ne montre que ce parcours.
 */
export const ESPACE_PAR_ROLE: Record<string, string> = {
  PROFESSIONAL: 'Espace soignant',
  FACILITY_MEMBER: 'Espace officine',
  ADMIN: 'Espace administration',
}

/** Icône de l'en-tête de page, par section. `ClipboardList` sert de repli. */
export const ICONE_PAR_CLE: Record<string, LucideIcon> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.icon] as const)),
)
export const ICONE_DEFAUT = ClipboardList
