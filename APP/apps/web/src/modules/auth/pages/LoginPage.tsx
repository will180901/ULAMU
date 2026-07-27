/**
 * Connexion — nom d'utilisateur OU email (2026-07, comme sur mobile : l'API route sur l'un ou l'autre
 * selon la présence d'un « @ ») + flux TOTP en 2 étapes (M01). Réservée aux comptes PROFESSIONAL/
 * FACILITY_MEMBER/ADMIN (les patients restent sur mobile).
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
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
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
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
            <Link
              to="/mot-de-passe-oublie"
              style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', alignSelf: 'flex-end', marginTop: -4 }}
            >
              Mot de passe oublié ?
            </Link>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
              <ShieldCheck size={16} /> Code de votre application d'authentification
            </div>
            <Field label="Code TOTP (6 chiffres)" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={10} autoFocus required />
          </>
        )}

        {error ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</div> : null}

        <Button type="submit" size="lg" loading={busy} disabled={busy}>
          {totpRequired ? 'Vérifier' : 'Se connecter'}
        </Button>
      </form>
      {!totpRequired ? (
        <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', textAlign: 'center', marginTop: 'var(--espace-4)' }}>
          Pas encore de compte ? <Link to="/inscription" style={{ color: 'var(--ap-400)', fontWeight: 600 }}>Créer un compte</Link>
        </p>
      ) : null}
    </AuthLayout>
  )
}
