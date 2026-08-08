/**
 * Source de vérité unique de la navigation — chaque item déclare les capacités requises ;
 * useNavigation() (Sidebar) filtre selon la session courante. Étoffé au fil des Phases 1/2/3.
 */
import { LayoutDashboard, ShieldCheck } from 'lucide-react'
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
