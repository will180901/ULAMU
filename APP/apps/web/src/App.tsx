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
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { VerificationPage } from '@/modules/verification/pages/VerificationPage'
import { VitrinePage } from '@/modules/vitrine/pages/VitrinePage'
import { DemandesPage } from '@/modules/demandes/pages/DemandesPage'
import { ConsultationPage } from '@/modules/consultation/pages/ConsultationPage'
import { ConsultationsPage } from '@/modules/consultation/pages/ConsultationsPage'
import { GainsPage } from '@/modules/gains/pages/GainsPage'
import { FileVerificationPage } from '@/modules/admin/pages/FileVerificationPage'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { TotpSetupPage } from '@/modules/auth/pages/TotpSetupPage'
import { NAV_GROUPS } from '@/config/navigation.config'
import { useSessionStore } from '@/state/session.store'
import { usePageAccueil } from '@/hooks/usePageAccueil'

/** Les écrans déjà refaits : ils ont leur propre route et sortent de la boucle `EcranAVenir`. */
const ECRANS_FAITS = ['/dashboard', '/parametres', '/verification', '/vitrine', '/demandes', '/gains', '/admin/verification', '/consultations']

/**
 * Repli des routes inconnues. Il honore la préférence « page d'accueil » de B3 — sans quoi le réglage
 * ne servirait à rien. Composant à part : les hooks ne peuvent pas être appelés dans `element={}`.
 */
function RedirectionAccueil() {
  return <Navigate to={usePageAccueil()} replace />
}

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
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/parametres" element={<SettingsPage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/vitrine" element={<VitrinePage />} />
                <Route path="/demandes" element={<DemandesPage />} />
                <Route path="/gains" element={<GainsPage />} />
                <Route path="/admin/verification" element={<FileVerificationPage />} />
                <Route path="/consultations" element={<ConsultationsPage />} />
                {/* La séance elle-même : atteinte depuis « Consultations », jamais listée seule. */}
                <Route path="/consultations/:sessionId" element={<ConsultationPage />} />
                {/* Les écrans non encore refaits gardent leur route : la navigation reste entière. */}
                {NAV_GROUPS.flatMap((g) => g.items)
                  .filter((item) => !ECRANS_FAITS.includes(item.href))
                  .map((item) => (
                    <Route key={item.key} path={item.href} element={<EcranAVenir titre={item.label} />} />
                  ))}
                <Route path="*" element={<RedirectionAccueil />} />
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
