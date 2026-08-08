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
import { VitrinePage } from '@/modules/directory/pages/VitrinePage'
import { PoigneesPage } from '@/modules/handshakes/pages/PoigneesPage'
import { ConsultationsPage } from '@/modules/sessions/pages/ConsultationsPage'
import { ConsultationPage } from '@/modules/sessions/pages/ConsultationPage'
import { GainsPage } from '@/modules/earnings/pages/GainsPage'
import { PharmaciePage } from '@/modules/facility/pages/PharmaciePage'
import { StockPage } from '@/modules/facility/pages/StockPage'
import { DelivrancePage } from '@/modules/facility/pages/DelivrancePage'
import { FileVerificationPage } from '@/modules/admin/pages/FileVerificationPage'
import { PilotagePage } from '@/modules/admin/pages/PilotagePage'
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
              {/* Vitrine du professionnel (M05). Réservée à `professional` : un pharmacien n'a pas
                  d'offres de consultation, et un administrateur n'apparaît pas dans l'annuaire. */}
              <Route
                path="/vitrine"
                element={
                  <CapabilityGate any={['professional']}>
                    <VitrinePage />
                  </CapabilityGate>
                }
                handle={{ title: 'Ma vitrine' }}
              />
              {/* ⭐ Le cœur du produit (M06). Contrepartie exacte de l'écran patient : sans elle,
                  une poignée de main initiée depuis le mobile n'a aucun destinataire. */}
              <Route
                path="/demandes"
                element={
                  <CapabilityGate any={['professional']}>
                    <PoigneesPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Demandes de consultation' }}
              />
              {/* Sessions de soin (M06). La consultation elle-même n'est pas gardée par capacité :
                  le SERVEUR vérifie déjà que le demandeur est l'un des deux participants, et une
                  garde de rôle ici bloquerait le patient si le web venait à lui être ouvert. */}
              <Route
                path="/consultations"
                element={
                  <CapabilityGate any={['professional']}>
                    <ConsultationsPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Mes consultations' }}
              />
              <Route path="/consultations/:id" element={<ConsultationPage />} handle={{ title: 'Consultation' }} />
              {/* Gains (M13). Réservé au soignant : les gains d'une structure appartiennent à son
                  TITULAIRE et passeront par l'espace pharmacie, avec ses propres droits (EF-02-05). */}
              <Route
                path="/gains"
                element={
                  <CapabilityGate any={['professional']}>
                    <GainsPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Mes gains' }}
              />
              {/* Espace structure (M02). Réservé aux membres de pharmacie. */}
              <Route
                path="/pharmacie"
                element={
                  <CapabilityGate any={['facility']}>
                    <PharmaciePage />
                  </CapabilityGate>
                }
                handle={{ title: 'Ma pharmacie' }}
              />
              <Route
                path="/stock"
                element={
                  <CapabilityGate any={['facility']}>
                    <StockPage />
                  </CapabilityGate>
                }
                handle={{ title: 'Stock' }}
              />
              <Route
                path="/delivrance"
                element={
                  <CapabilityGate any={['facility']}>
                    <DelivrancePage />
                  </CapabilityGate>
                }
                handle={{ title: 'Délivrance' }}
              />
              {/* Administration — le sous-rôle est vérifié SERVEUR à chaque requête (EF-02-02) ; la
                  garde de capacité n'est qu'un confort qui évite d'afficher un écran vide. */}
              <Route
                path="/admin/verification"
                element={
                  <CapabilityGate any={['admin:verification', 'admin:super']}>
                    <FileVerificationPage />
                  </CapabilityGate>
                }
                handle={{ title: 'File de vérification' }}
              />
              <Route
                path="/admin/pilotage"
                element={
                  <CapabilityGate any={['admin:super']}>
                    <PilotagePage />
                  </CapabilityGate>
                }
                handle={{ title: 'Pilotage' }}
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
