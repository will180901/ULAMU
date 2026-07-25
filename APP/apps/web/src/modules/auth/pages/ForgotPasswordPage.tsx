/**
 * Mot de passe oublié — réinitialisation par TOTP UNIQUEMENT (jamais de SMS côté web, règle à
 * respecter). Même coquille visuelle que Login/Register (AuthLayout).
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { api, ApiError } from '@/lib/api'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = useMutation({ mutationFn: () => api.resetPasswordByTotp({ username, code, newPassword }) })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await reset.mutateAsync()
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible — vérifiez le code et réessayez.')
    }
  }

  return (
    <AuthLayout subtitle="Réinitialisez votre mot de passe ULAMU à l'aide de votre application d'authentification.">
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-4)', alignItems: 'center', textAlign: 'center' }}>
          <CheckCircle2 size={36} color="var(--succes-accent)" />
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--texte-primaire)', fontWeight: 600 }}>Mot de passe mis à jour.</p>
          <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
            Toutes vos sessions actives ont été déconnectées par sécurité.
          </p>
          <Button size="lg" onClick={() => navigate('/login', { replace: true })}>
            Se connecter
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
          <Field label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
            <ShieldCheck size={16} /> Code de votre application d'authentification (ou un code de secours)
          </div>
          <Field label="Code TOTP" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} required />
          <Field label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

          {error ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</div> : null}

          <Button type="submit" size="lg" loading={reset.isPending} disabled={reset.isPending}>
            Réinitialiser le mot de passe
          </Button>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', textAlign: 'center', marginTop: 'var(--espace-2)' }}>
            <Link to="/login" style={{ color: 'var(--ap-400)', fontWeight: 600 }}>Retour à la connexion</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
