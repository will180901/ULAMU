/**
 * Tableau de bord — emplacement réservé assumé.
 *
 * Il dit la vérité sur l'état du produit au lieu d'afficher des cartes de démonstration remplies de
 * chiffres inventés : un tableau de bord qui ment est pire qu'un tableau de bord vide. Le contenu
 * réel dépend du rôle et arrive avec les phases 2 à 4 du plan (`docs/plan_frontend_web_2026-08-05.md`).
 */
import { LayoutDashboard, Compass } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { EmptyState } from '@/components/ulamu/ScreenState'
import { Button } from '@/components/ulamu/Button'
import { useSessionStore } from '@/state/session.store'
import { ROLE_META } from '@/config/navigation.config'

export function DashboardPage() {
  const me = useSessionStore((s) => s.me)
  const roleLabel = me ? ROLE_META[me.accountType]?.label : undefined

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard size={20} />}
        title={`Bonjour${me?.firstName ? `, ${me.firstName}` : ''}`}
        subtitle={roleLabel ? `Espace ${roleLabel.toLowerCase()}` : undefined}
      />
      <EmptyState
        icon={<LayoutDashboard size={22} />}
        title="Votre espace se construit"
        description="La coquille de l'application est en place : navigation par rôle, thème clair/sombre et recherche rapide. Les écrans métier — poignées de main, consultations, ordonnances — arrivent avec les phases suivantes."
        /* CG-08 : un état vide sans sortie est interdit. Ici la sortie est la palette de commandes,
           qui est déjà pleinement fonctionnelle et montre à l'utilisateur ce qu'il peut atteindre. */
        action={
          <Button
            variant="ghost"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          >
            <Compass size={16} /> Voir où aller
          </Button>
        }
      />
    </div>
  )
}
