/**
 * Coquille de l'app authentifiée — sidebar rail + en-tête + routes en Suspense.
 * Le titre de l'en-tête reste statique ici (chaque page porte son propre titre via PageHeader) —
 * un titre dynamique par route nécessiterait le "data router" de React Router (createBrowserRouter),
 * pas le <BrowserRouter> classique utilisé dans App.tsx ; à envisager si un vrai besoin apparaît.
 */
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, SIDEBAR_RAIL_WIDTH } from './Sidebar'
import { TopHeader } from './TopHeader'

function RouteLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--texte-tertiaire)' }}>
      Chargement…
    </div>
  )
}

export function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="saris-grain-strong" style={{ marginLeft: SIDEBAR_RAIL_WIDTH, flex: 1, minWidth: 0 }}>
        <TopHeader title="ULAMU Pro" />
        <div style={{ padding: 'var(--espace-5)', maxWidth: 'var(--layout-max-width)' }}>
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
