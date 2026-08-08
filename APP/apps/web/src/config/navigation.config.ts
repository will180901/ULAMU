/**
 * Source de vérité unique de la navigation — chaque item déclare les capacités requises ;
 * useNavigation() (Sidebar) filtre selon la session courante. Étoffé au fil des Phases 1/2/3.
 */
import {
  Activity,
  Boxes,
  Building2,
  ClipboardCheck,
  Flag,
  UserCog,
  Handshake as HandshakeIcon,
  LayoutDashboard,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Capability } from '@/hooks/useCapabilities'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  href: string
  capabilities: Capability[]
  /** Pastille de comptage (CG-06 §07 : « pills accent pour les nouveaux éléments »). */
  badge?: number | string
  /** `urgent` bascule la pastille en ton d'alerte — réservé à ce qui expire ou bloque un patient. */
  badgeTone?: 'accent' | 'urgent'
}
export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clinique',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard', capabilities: ['professional', 'facility', 'admin'] },
      /* Vitrine, offres et présence (M05) — propres au soignant. Un membre de structure ne vend pas
         de consultation, un administrateur n'apparaît pas dans l'annuaire. */
      { key: 'vitrine', label: 'Ma vitrine', icon: Store, href: '/vitrine', capabilities: ['professional'] },
      /* ⭐ Le cœur du produit (M06) : c'est ici qu'un soignant répond à un patient. */
      { key: 'demandes', label: 'Demandes', icon: HandshakeIcon, href: '/demandes', capabilities: ['professional'] },
      { key: 'consultations', label: 'Consultations', icon: MessageSquare, href: '/consultations', capabilities: ['professional'] },
      { key: 'gains', label: 'Mes gains', icon: Wallet, href: '/gains', capabilities: ['professional', 'facility'] },
      /* Espace pharmacie (M02/M11) — réservé aux structures. */
      { key: 'pharmacie', label: 'Ma pharmacie', icon: Building2, href: '/pharmacie', capabilities: ['facility'] },
      { key: 'stock', label: 'Stock', icon: Boxes, href: '/stock', capabilities: ['facility'] },
      { key: 'delivrance', label: 'Délivrance', icon: QrCode, href: '/delivrance', capabilities: ['facility'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      /* Sous-rôles CG : chaque administrateur ne voit que son domaine (EF-02-08). Le Super Admin
         voit tout, puisqu'il attribue les sous-rôles. */
      {
        key: 'admin-verification',
        label: 'File de vérification',
        icon: ClipboardCheck,
        href: '/admin/verification',
        capabilities: ['admin:verification', 'admin:super'],
      },
      { key: 'admin-signalements', label: 'Signalements', icon: Flag, href: '/admin/signalements', capabilities: ['admin:super'] },
      { key: 'admin-comptes', label: 'Comptes', icon: UserCog, href: '/admin/comptes', capabilities: ['admin:super'] },
      { key: 'admin-pilotage', label: 'Pilotage', icon: Activity, href: '/admin/pilotage', capabilities: ['admin:super'] },
    ],
  },
  {
    label: 'Mon compte',
    items: [
      /* Les administrateurs n'ont pas de dossier à déposer — la capacité `admin` est volontairement
         absente. Une entrée de menu qui mène à une page vide est une fausse piste. */
      {
        key: 'verification',
        label: 'Ma vérification',
        icon: ShieldCheck,
        href: '/verification',
        capabilities: ['professional', 'facility'],
      },
    ],
  },
]

export const ROLE_META: Record<string, { label: string; bg: string; text: string }> = {
  PROFESSIONAL: { label: 'Professionnel', bg: 'var(--ton-bleu-fond)', text: 'var(--ton-bleu-icone)' },
  FACILITY_MEMBER: { label: 'Structure', bg: 'var(--ton-emeraude-fond)', text: 'var(--ton-emeraude-icone)' },
  ADMIN: { label: 'Administration', bg: 'var(--ton-violet-fond)', text: 'var(--ton-violet-icone)' },
}
