/**
 * Mot de passe oublié — réinitialisation par TOTP **uniquement**.
 *
 * Règle assumée du produit : jamais de SMS ni de code par email pour récupérer un compte web. Elle
 * tient parce que le TOTP est imposé à tous les comptes non-patients dès la première connexion
 * (`App.tsx`, `needsTotpSetup`) — sans cette contrainte, la règle enfermerait dehors quiconque
 * n'aurait pas configuré d'authentificateur.
 *
 * L'erreur porte une icône en plus de sa couleur (`CG-05 §07`).
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
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
        <div className="ul-state" role="status">
          <CheckCircle2 size={36} color="var(--succes-accent)" aria-hidden="true" />
          <p className="ul-state__title">Mot de passe mis à jour</p>
          {/* Conséquence annoncée explicitement : une réinitialisation révoque TOUTES les sessions
              (CU-01-04). Laisser l'utilisateur découvrir seul qu'il a été déconnecté de son poste
              d'officine serait une mauvaise surprise. */}
          <p className="ul-state__desc">Toutes vos sessions actives ont été déconnectées par sécurité.</p>
          <Button size="lg" onClick={() => navigate('/login', { replace: true })}>
            Se connecter
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="ul-auth__form">
          <Field label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />

          <p className="ul-auth__note">
            <ShieldCheck size={16} aria-hidden="true" /> Code de votre application d'authentification
          </p>
          <Field
            label="Code TOTP"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={10}
            hint="Un code de secours à 10 caractères est aussi accepté."
            required
          />

          <Field
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            hint="8 caractères minimum."
            required
          />

          {error ? (
            <p className="ul-auth__error" role="alert">
              <AlertCircle size={13} aria-hidden="true" /> {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" loading={reset.isPending}>
            Réinitialiser le mot de passe
          </Button>

          <p className="ul-auth__foot">
            <Link to="/login" className="ul-auth__link">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
