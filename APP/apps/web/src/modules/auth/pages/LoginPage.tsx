/**
 * Connexion — nom d'utilisateur OU email (l'API route sur l'un ou l'autre selon la présence d'un
 * « @ », comme sur mobile) puis TOTP en 2ᵉ étape. Réservée aux comptes PROFESSIONAL /
 * FACILITY_MEMBER / ADMIN : les patients restent sur mobile (D-039/D-044).
 *
 * L'erreur porte désormais une **icône** en plus de sa couleur — `CG-05 §07` l'exige, et une erreur
 * de connexion est précisément le moment où l'on est pressé et où l'on lit mal.
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ApiError } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { useLoginMutation, useLoadMeMutation } from '../hooks/useLogin'

export function LoginPage() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpRequired, setTotpRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useLoginMutation()
  const loadMe = useLoadMeMutation()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await login.mutateAsync({
        username,
        password,
        client: 'web',
        deviceLabel: 'ULAMU Web',
        totpCode: totpRequired ? totpCode : undefined,
      })
      if (res.totpRequired) {
        setTotpRequired(true)
        return
      }
      if (res.sessionToken) {
        await loadMe.mutateAsync(res.sessionToken)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible — réessayez.')
    }
  }

  const busy = login.isPending || loadMe.isPending

  return (
    <AuthLayout subtitle="Connectez-vous à votre compte ULAMU — professionnels, structures et administration.">
      <form onSubmit={submit} className="ul-auth__form">
        {!totpRequired ? (
          <>
            <Field
              label="Nom d'utilisateur ou email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dr_kouma ou vous@exemple.com"
              autoFocus
              required
            />
            <Field label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Link to="/mot-de-passe-oublie" className="ul-auth__link" style={{ alignSelf: 'flex-end', fontSize: 'var(--fs-caption)' }}>
              Mot de passe oublié ?
            </Link>
          </>
        ) : (
          <>
            <p className="ul-auth__note">
              <ShieldCheck size={16} aria-hidden="true" /> Code de votre application d'authentification
            </p>
            <Field
              label="Code TOTP (6 chiffres)"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength={10}
              hint="Un code de secours à 10 caractères est aussi accepté."
              autoFocus
              required
            />
          </>
        )}

        {error ? (
          <p className="ul-auth__error" role="alert">
            <AlertCircle size={13} aria-hidden="true" /> {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={busy}>
          {totpRequired ? 'Vérifier' : 'Se connecter'}
        </Button>
      </form>

      {!totpRequired ? (
        <p className="ul-auth__foot">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="ul-auth__link">
            Créer un compte
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  )
}
