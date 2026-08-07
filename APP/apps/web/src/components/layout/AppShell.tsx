/**
 * Coquille de l'application authentifiée — barre latérale + topbar + routes.
 *
 * Elle assemble les trois états de la barre (CG-06 §01) et ne connaît rien du contenu : chaque page
 * porte son propre titre via `PageHeader`. Le titre de la topbar reste donc générique — un titre
 * dynamique par route exigerait le « data router » de React Router, changement d'architecture qui ne
 * se justifie pas pour un libellé.
 */
import { Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { CommandPalette } from './CommandPalette'
import { LoadingState } from '@/components/ulamu/ScreenState'
import { useUiStore } from '@/state/ui.store'
import { watchSystemTheme } from '@/state/theme.store'

export function AppShell() {
  const collapsed = useUiStore((s) => s.collapsed)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Suit la préférence système tant que l'utilisateur n'a pas choisi lui-même (cf. theme.store).
  useEffect(() => watchSystemTheme(), [])

  // Ctrl/⌘ K — le raccourci annoncé dans la topbar doit exister, sinon c'est un mensonge affiché en
  // permanence. On intercepte aussi la combinaison quand un champ a le focus : c'est le comportement
  // attendu d'une palette globale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="ul-shell">
      <Sidebar />

      {/* Voile mobile : ferme la barre au clic ET assombrit la page derrière, pour qu'on comprenne
          que la navigation est au premier plan. Un <button> et non un <div> — il doit être
          atteignable au clavier. */}
      {mobileOpen ? (
        <button type="button" className="ul-scrim ul-only-mobile" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />
      ) : null}

      <main className={['ul-shell__main', 'saris-grain-strong', collapsed ? 'ul-shell__main--collapsed' : ''].filter(Boolean).join(' ')}>
        <TopHeader title="ULAMU" onOpenSearch={() => setPaletteOpen(true)} />
        <div className="ul-shell__content">
          <Suspense fallback={<LoadingState label="Chargement de la page…" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
