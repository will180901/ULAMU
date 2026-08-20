/**
 * A3 — Mot de passe oublié. D'après `docs/maquettes/A3 - Mot de passe oublie.dc.html`.
 *
 * **Découpé en trois étapes** (20/08/2026), là où la maquette met tout sur un seul écran. Ce n'est
 * pas un caprice de mise en page : la carte est plafonnée à 90 vh, et sur une fenêtre de 700 px cela
 * ne laisse que 630 px. Tout afficher d'un coup — identifiant, méthode, code, nouveau mot de passe —
 * faisait apparaître un ascenseur qui escamotait le logo hors du champ de vision. Trois étapes
 * courtes tiennent partout, jusque sur un portable de 768 px.
 *
 * ⚠️ **Trois voies de récupération, là où la maquette n'en montre qu'une.** Elle ne prévoit que le
 * TOTP, ce qui tenait tant que le second facteur était imposé à tous — l'ancienne version de ce
 * fichier l'écrivait mot pour mot : « sans cette contrainte, la règle enfermerait dehors quiconque
 * n'aurait pas configuré d'authentificateur ». Le TOTP est devenu volontaire le matin même, et la
 * prédiction s'est réalisée. Le serveur savait déjà traiter la réinitialisation par email ; seul le
 * client web ne l'appelait pas.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Info, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { EtapesAuth } from '@/components/auth/EtapesAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'

type Voie = 'totp' | 'secours' | 'email'
type Etape = 'compte' | 'code' | 'motdepasse'

const ETAPES = [
  { cle: 'compte' as const, libelle: 'Compte' },
  { cle: 'code' as const, libelle: 'Code' },
  { cle: 'motdepasse' as const, libelle: 'Mot de passe' },
]

/** Les deux autres voies, dans l'ordre où on les propose depuis celle qui est active. */
const AUTRES_VOIES: Record<Voie, Voie[]> = {
  totp: ['secours', 'email'],
  secours: ['totp', 'email'],
  email: ['totp', 'secours'],
}
const NOM_VOIE: Record<Voie, string> = {
  totp: 'Code de l’authentificateur',
  secours: 'Code de secours',
  email: 'Recevoir un code par email',
}

function Libelle({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">{children}</span>
}
function Aide({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{children}</span>
}
function Bascule({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="border-0 bg-transparent p-0 text-[11px] font-semibold text-primary hover:underline">
      {children}
    </button>
  )
}
function Erreur({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--erreur-texte)]">
      <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState<Etape>('compte')
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
  const index = ETAPES.findIndex((e) => e.cle === etape)

  const changerDeVoie = (v: Voie) => {
    setVoie(v)
    setCode('')
    setCodeEnvoye(null)
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

  /** Étape 1 → 2. Pour la voie email, le code part dans la foulée : l'utilisateur vient de saisir
   *  l'adresse, lui réclamer un clic de plus pour « demander » serait une formalité vide. */
  const validerCompte = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (voie === 'email') await envoyerLeCode()
    setEtape('code')
  }

  const reinitialiser = async (e: React.FormEvent) => {
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
          <p className="m-0 font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.3] text-foreground">Mot de passe mis à jour</p>
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

  const recours = (
    <p className="m-0 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
      Pas de code ?{' '}
      {AUTRES_VOIES[voie].map((v, i) => (
        <span key={v}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          <Bascule
            onClick={() => {
              changerDeVoie(v)
              setEtape('compte')
            }}
          >
            {NOM_VOIE[v]}
          </Bascule>
        </span>
      ))}
    </p>
  )

  return (
    <AuthLayout subtitle={etape === 'compte' ? "Réinitialisez votre mot de passe ULAMU à l'aide de votre application d'authentification." : undefined}>
      <EtapesAuth etapes={ETAPES} courant={index} aller={setEtape} />

      <div key={etape} className="ulamu-step-fade">
        {etape === 'compte' ? (
          <form onSubmit={validerCompte} className="flex flex-col gap-3">
            {voie === 'email' ? (
              <label className="flex flex-col gap-1">
                <Libelle>Email du compte</Libelle>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" autoFocus required />
                <Aide>Un code de vérification y sera envoyé.</Aide>
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <Libelle>Nom d'utilisateur</Libelle>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
              </label>
            )}

            <p className="m-0 flex items-center gap-1.5 text-[13px] leading-[1.55] text-muted-foreground">
              {voie === 'email' ? <Mail size={16} strokeWidth={1.5} aria-hidden="true" /> : voie === 'secours' ? <KeyRound size={16} strokeWidth={1.5} aria-hidden="true" /> : <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />}
              {voie === 'email' ? 'Vérification par email' : voie === 'secours' ? 'Vérification par code de secours' : 'Vérification par application d’authentification'}
            </p>

            <p className="m-0 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
              Autre méthode ?{' '}
              {AUTRES_VOIES[voie].map((v, i) => (
                <span key={v}>
                  {i > 0 ? <span aria-hidden="true"> · </span> : null}
                  <Bascule onClick={() => changerDeVoie(v)}>{NOM_VOIE[v]}</Bascule>
                </span>
              ))}
            </p>

            {error ? <Erreur>{error}</Erreur> : null}

            <Button type="submit" size="lg" className="w-full" disabled={occupe}>
              {demanderCode.isPending ? <Spinner /> : null}
              Continuer
            </Button>
            <p className="mt-1 text-center text-[11px] text-[var(--texte-tertiaire)]">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        ) : etape === 'code' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setEtape('motdepasse')
            }}
            className="flex flex-col gap-3"
          >
            {voie === 'email' && codeEnvoye ? (
              <p className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--info-texte)]">
                <Info size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{codeEnvoye}</span>
                <Bascule onClick={() => void envoyerLeCode()}>Renvoyer</Bascule>
              </p>
            ) : null}

            {voie === 'secours' ? (
              <label className="flex flex-col gap-1">
                <Libelle>Code de secours (10 caractères)</Libelle>
                <Input value={code} onChange={(e) => setCode(e.target.value.trim())} maxLength={10} placeholder="XXXX-XXXX-XX" className="font-mono" autoFocus required />
                <Aide>Chaque code de secours ne sert qu'une fois.</Aide>
              </label>
            ) : (
              <div>
                <Libelle>{voie === 'email' ? 'Code reçu par email' : 'Code TOTP'}</Libelle>
                <div className="mt-1.5">
                  <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={() => setEtape('motdepasse')} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}

            {recours}
            {error ? <Erreur>{error}</Erreur> : null}

            <Button type="submit" size="lg" className="w-full" disabled={code.length === 0}>
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEtape('compte')}>
              Retour
            </Button>
          </form>
        ) : (
          <form onSubmit={reinitialiser} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <Libelle>Nouveau mot de passe</Libelle>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" autoFocus required />
              <Aide>8 caractères minimum.</Aide>
            </label>

            {/* Dit AVANT de valider, pas après : quelqu'un qui réinitialise depuis un poste partagé
                doit savoir qu'il fermera aussi sa session d'officine. */}
            <p className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--info-texte)]">
              <Info size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
              Toutes vos sessions actives seront déconnectées.
            </p>

            {error ? <Erreur>{error}</Erreur> : null}

            <Button type="submit" size="lg" className="w-full" disabled={occupe}>
              {parTotp.isPending || parEmail.isPending ? <Spinner /> : null}
              Réinitialiser le mot de passe
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEtape('code')}>
              Retour
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
