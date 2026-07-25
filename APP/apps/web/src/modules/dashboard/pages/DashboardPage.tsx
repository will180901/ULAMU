import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { EmptyState } from '@/components/ulamu/EmptyState'
import { useSessionStore } from '@/state/session.store'

export function DashboardPage() {
  const me = useSessionStore((s) => s.me)

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard size={20} />}
        title={`Bonjour${me?.firstName ? `, ${me.firstName}` : ''}`}
        subtitle="Tableau de bord — Phase 1 en construction"
      />
      <EmptyState
        icon={<LayoutDashboard size={22} />}
        title="Les écrans arrivent bientôt"
        description="La connexion et la coquille de l'application sont en place (Phase 0). Le tableau de bord réel, les poignées de main et le chat de consultation arrivent en Phase 1."
      />
    </div>
  )
}
