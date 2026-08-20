/**
 * Racine — état de transition, refonte shadcn en cours (09/08/2026).
 *
 * Les 19 écrans situés derrière la connexion ont été retirés : ils sont reconstruits un par un sur
 * shadcn, dans l'ordre du plan `docs/plan_refonte_web_shadcn.md`. Les écrans d'authentification, eux,
 * **restent en place** — leur mise en page (carrousel à gauche, formulaire à droite) est une règle
 * intangible du projet, pas un choix de style à rejouer.
 *
 * Chaque étape de la reconstruction laisse cette application compilable et déployable : c'est la
 * raison pour laquelle les écrans, leur coquille, leurs tests et ce routeur ont été retirés dans le
 * même mouvement, plutôt que de laisser des imports pointer dans le vide.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { TotpSetupPage } from '@/modules/auth/pages/TotpSetupPage'
import { Logo } from '@/components/ulamu/Logo'
import { Button } from '@/components/ulamu/Button'
import { useSessionStore } from '@/state/session.store'
import { useIdleLogout } from '@/state/useIdleLogout'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fond-page)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--ap-400)' }} />
    </div>
  )
}

const ROLES: Record<string, string> = {
  PROFESSIONAL: 'Professionnel de santé',
  FACILITY_MEMBER: 'Membre de structure',
  ADMIN: 'Administration',
  PATIENT: 'Patient',
}

/**
 * Écran d'attente des comptes connectés. Il affiche l'identité et le rôle rapportés par `/v1/auth/me`
 * : ce n'est pas de la décoration, c'est la preuve que la chaîne navigateur → API déployée → base
 * répond toujours pendant la reconstruction. Un écran qui dirait seulement « en travaux » ne
 * distinguerait pas une refonte en cours d'une API tombée.
 */
function Chantier() {
  const me = useSessionStore((s) => s.me)
  const logout = useSessionStore((s) => s.logout)

  // La déconnexion pour inactivité vivait dans la coquille applicative, qui vient d'être retirée.
  // Sans ce rappel ici, une session ouverte sur un poste partagé le resterait indéfiniment.
  useIdleLogout(true)

  const nom = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || me?.username || me?.phone

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fond-page)', padding: 'var(--espace-5)' }}>
      <div className="ul-card" style={{ maxWidth: 460, textAlign: 'center', alignItems: 'center' }}>
        <Logo size={34} />
        <h1 className="t-display-sm" style={{ margin: 0 }}>Interface en reconstruction</h1>
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          Les écrans de travail sont refaits un par un sur une nouvelle base de composants. Votre
          compte, vos données et l’application mobile ne sont pas concernés.
        </p>
        <p className="t-text-sm" style={{ color: 'var(--texte-tertiaire)', margin: 0 }}>
          Connecté en tant que <strong style={{ color: 'var(--texte-primaire)' }}>{nom}</strong>
          {me ? ` · ${ROLES[me.accountType] ?? me.accountType}` : null}
        </p>
        <Button variant="ghost" onClick={() => logout()}>Se déconnecter</Button>
      </div>
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        {isAuthenticated ? (
          /* Le TOTP n'est plus IMPOSÉ à la première connexion (décision du 20/08/2026). L'écran
             reste accessible à `/configuration-totp` pour qui veut l'activer, et le sera depuis les
             paramètres du compte une fois l'écran B3 reconstruit.

             Ce qui a motivé le changement : un compte dont le secret TOTP était illisible se
             retrouvait enfermé dehors, sans recours. Imposer un second facteur à la première
             connexion transforme le moindre incident de chiffrement en compte perdu. Le second
             facteur reste vivement recommandé — et redeviendra exigé pour les administrateurs dès
             que `ADMIN_REQUIRE_TOTP` reprendra sa valeur par défaut côté API. */
          <>
            <Route path="/configuration-totp" element={<TotpSetupPage />} />
            <Route path="*" element={<Chantier />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}
