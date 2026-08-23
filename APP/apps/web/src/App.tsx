/**
 * Racine — refonte shadcn en cours.
 *
 * La coquille applicative (B1) est en place depuis le 20/08/2026 : elle porte les routes des 20
 * écrans à reconstruire. Chacun affiche `EcranAVenir` tant qu'il n'est pas fait, et sera remplacé
 * dans l'ordre du plan `docs/PLAN_EXECUTION_WEB.md`.
 *
 * Les écrans d'authentification restent hors coquille : leur mise en page — carrousel à gauche,
 * formulaire à droite — est une règle intangible du projet, et on n'y arrive pas connecté.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { EcranAVenir } from '@/components/layout/EcranAVenir'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { TotpSetupPage } from '@/modules/auth/pages/TotpSetupPage'
import { NAV_GROUPS } from '@/config/navigation.config'
import { useSessionStore } from '@/state/session.store'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fond-page)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--ap-400)' }} />
    </div>
  )
}

export function App() {
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)

  // zustand/persist hydrate en microtâche : si le stockage était déjà lu au montage, force le flag.
  useEffect(() => {
    if (!hasHydrated) useSessionStore.getState().setHasHydrated(true)
  }, [hasHydrated])

  if (!hasHydrated) return <LoadingScreen />

  return (
    // Les infobulles de la barre latérale au repos exigent ce fournisseur : sans lui, Radix lève.
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          {isAuthenticated ? (
            <>
              {/* Hors coquille : cet écran a sa propre mise en page, carte centrée sans navigation. */}
              <Route path="/configuration-totp" element={<TotpSetupPage />} />
              <Route element={<AppShell />}>
                {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
                  <Route key={item.key} path={item.href} element={<EcranAVenir titre={item.label} />} />
                ))}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}
