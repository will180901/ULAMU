/**
 * A3 — Mot de passe oublié. Refait d'après `docs/maquettes/A3 - Mot de passe oublie.dc.html`.
 *
 * ⚠️ **Un écart avec la maquette, décidé le 20/08/2026, et il ferme un trou.** La maquette ne montre
 * que la récupération par TOTP. C'était cohérent tant que le second facteur était imposé à tous —
 * l'ancienne version de ce fichier le disait d'ailleurs mot pour mot : « sans cette contrainte, la
 * règle enfermerait dehors quiconque n'aurait pas configuré d'authentificateur ». Le TOTP est devenu
 * volontaire le matin même, et la prédiction s'est réalisée : un compte sans authentificateur qui
 * oublie son mot de passe n'avait plus AUCUN recours, `disableTotp` refusant par ailleurs de dépanner
 * un administrateur (RM-01-06).
 *
 * L'écran propose donc les DEUX voies que le serveur sait déjà traiter :
 *   • par TOTP — pour qui a configuré un authentificateur (code à 6 chiffres ou code de secours) ;
 *   • par email — un code envoyé à l'adresse du compte, pour tous les autres.
 *
 * La bascule reprend exactement le motif que la maquette utilise déjà pour le code de secours : un
 * lien discret sous le champ, jamais un choix imposé en tête d'écran.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Info, Mail, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'

type Voie = 'totp' | 'secours' | 'email'

function Libelle({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">{children}</span>
}

/** Lien de bascule — même motif que la maquette : discret, à droite sous le champ. */
function Bascule({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="border-0 bg-transparent p-0 text-[11px] font-semibold text-primary hover:underline">
      {children}
    </button>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [voie, setVoie] = useState<Voie>('totp')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const demanderCode = useMutation({ mutationFn: () => api.requestOtp({ email, purpose: 'PASSWORD_RESET' }) })
  const parTotp = useMutation({ mutationFn: () => api.resetPasswordByTotp({ username, code, newPassword }) })
  const parEmail = useMutation({ mutationFn: () => api.resetPasswordByEmail({ email, otpCode: code, newPassword }) })

  const occupe = demanderCode.isPending || parTotp.isPending || parEmail.isPending
  const parCode = voie !== 'secours' // les six cases ; le code de secours prend un champ libre

  const changerDeVoie = (v: Voie) => {
    setVoie(v)
    setCode('')
    setError(null)
  }

  const envoyerLeCode = async () => {
    setError(null)
    try {
      const res = await demanderCode.mutateAsync()
      setCodeEnvoye(res.debugCode ? `Mode démo — code : ${res.debugCode}` : `Code envoyé à ${email}.`)
      if (res.debugCode) setCode(res.debugCode)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi du code impossible — réessayez.')
    }
  }

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await (voie === 'email' ? parEmail.mutateAsync() : parTotp.mutateAsync())
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible — vérifiez le code et réessayez.')
    }
  }

  if (done) {
    return (
      <AuthLayout subtitle="Réinitialisez votre mot de passe ULAMU à l'aide de votre application d'authentification.">
        <div role="status" className="ulamu-step-fade flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg border border-[var(--succes-bordure)] bg-[var(--succes-fond)] text-[var(--succes-accent)]">
            <CheckCircle2 size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="m-0 font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.3] text-foreground">
            Mot de passe mis à jour
          </p>
          {/* Conséquence annoncée explicitement : une réinitialisation révoque TOUTES les sessions
              (CU-01-04). Laisser l'utilisateur découvrir seul qu'il a été déconnecté de son poste
              d'officine serait une mauvaise surprise. */}
          <p className="m-0 max-w-[42ch] text-[13px] leading-[1.55] text-muted-foreground">
            Toutes vos sessions actives ont été déconnectées par sécurité.
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Se connecter
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout subtitle="Réinitialisez votre mot de passe ULAMU à l'aide de votre application d'authentification.">
      <form onSubmit={soumettre} className="ulamu-step-fade flex flex-col gap-3">
        {voie === 'email' ? (
          <label className="flex flex-col gap-1">
            <Libelle>Email du compte</Libelle>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" autoFocus required />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <Libelle>Nom d'utilisateur</Libelle>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          </label>
        )}

        <p className="m-0 mt-1 flex items-center gap-1.5 text-[13px] leading-[1.55] text-muted-foreground">
          {voie === 'email' ? <Mail size={16} strokeWidth={1.5} aria-hidden="true" /> : <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />}
          {voie === 'email' ? 'Code envoyé à l’adresse du compte' : 'Code de votre application d’authentification'}
        </p>

        {voie === 'email' ? (
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => void envoyerLeCode()} disabled={occupe || email.length === 0}>
              {demanderCode.isPending ? <Spinner /> : null}
              {codeEnvoye ? 'Renvoyer le code' : 'Recevoir un code par email'}
            </Button>
            {codeEnvoye ? (
              <p className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--info-texte)]">
                <Info size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                {codeEnvoye}
              </p>
            ) : null}
          </div>
        ) : null}

        {parCode ? (
          <div>
            <Libelle>{voie === 'email' ? 'Code reçu par email' : 'Code TOTP'}</Libelle>
            <div className="mt-1.5">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="mt-2 flex items-center justify-between gap-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
              {voie === 'totp' ? (
                <>
                  <span>Un code de secours à 10 caractères est aussi accepté.</span>
                  <Bascule onClick={() => changerDeVoie('secours')}>Utiliser un code de secours</Bascule>
                </>
              ) : (
                <>
                  <span>Le code expire au bout de quelques minutes.</span>
                  <Bascule onClick={() => changerDeVoie('totp')}>J’ai un authentificateur</Bascule>
                </>
              )}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1">
            <Libelle>Code de secours (10 caractères)</Libelle>
            <Input value={code} onChange={(e) => setCode(e.target.value.trim())} maxLength={10} placeholder="XXXX-XXXX-XX" className="font-mono" autoFocus required />
            <span className="flex items-center justify-between gap-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
              <span>Chaque code de secours ne sert qu'une fois.</span>
              <Bascule onClick={() => changerDeVoie('totp')}>Revenir au code TOTP</Bascule>
            </span>
          </label>
        )}

        {/* Sans authentificateur ET sans code de secours, la voie email est le SEUL recours. Elle doit
            donc rester atteignable depuis les deux autres modes, jamais enfouie. */}
        {voie !== 'email' ? (
          <p className="m-0 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
            Pas d’application d’authentification ? <Bascule onClick={() => changerDeVoie('email')}>Recevoir un code par email</Bascule>
          </p>
        ) : null}

        <label className="flex flex-col gap-1">
          <Libelle>Nouveau mot de passe</Libelle>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
          <span className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">8 caractères minimum.</span>
        </label>

        {error ? (
          <p role="alert" className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--erreur-texte)]">
            <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={occupe}>
          {parTotp.isPending || parEmail.isPending ? <Spinner /> : null}
          Réinitialiser le mot de passe
        </Button>

        <p className="mt-1 text-center text-[11px] text-[var(--texte-tertiaire)]">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
