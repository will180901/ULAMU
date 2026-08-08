/** Racine — gate d'hydratation (évite un flash de l'écran de connexion), routes protégées par capacité. */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { CapabilityGate } from '@/components/auth/CapabilityGate'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { TotpSetupPage } from '@/modules/auth/pages/TotpSetupPage'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { VerificationPage } from '@/modules/verification/pages/VerificationPage'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
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
  const me = useSessionStore((s) => s.me)

  // zustand/persist hydrate en microtâche : si le stockage était déjà lu au montage, force le flag.
  useEffect(() => {
    if (!hasHydrated) useSessionStore.getState().setHasHydrated(true)
  }, [hasHydrated])

  if (!hasHydrated) return <LoadingScreen />

  // TOTP obligatoire sur le web (jamais de SMS pour la récupération) — bloque tout le reste tant
  // que ce n'est pas fait, pour que la réinitialisation par TOTP reste toujours utilisable.
  const needsTotpSetup = isAuthenticated && !!me && me.accountType !== 'PATIENT' && !me.totpEnabled

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        {isAuthenticated ? (
          needsTotpSetup ? (
            <>
              <Route path="/configuration-totp" element={<TotpSetupPage />} />
              <Route path="*" element={<Navigate to="/configuration-totp" replace />} />
            </>
          ) : (
            <Route element={<AppShell />}>
              <Route
                path="/dashboard"
                element={
                  <CapabilityGate any={['professional', 'facility', 'admin']}>
                    <DashboardPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Tableau de bord' }}
              />
              {/* M03 — dépôt et suivi du dossier de vérification (CU-03-01/02/03). Réservé aux
                  déposants : un administrateur n'a pas de dossier, la garde le dit explicitement. */}
              <Route
                path="/verification"
                element={
                  <CapabilityGate any={['professional', 'facility']}>
                    <VerificationPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Ma vérification' }}
              />
              {/* Sécurité du compte (CU-01-05/06/07). Ouverte à TOUS les rôles connectés : un
                  administrateur a autant besoin de couper une session suspecte qu'un pharmacien. */}
              <Route path="/parametres" element={<SettingsPage />} handle={{ title: 'Mes paramètres' }} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}
