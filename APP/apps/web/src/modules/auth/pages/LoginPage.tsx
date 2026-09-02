/**
 * A1 — Connexion. Refait d'après `docs/maquettes/A1 - Connexion.dc.html`.
 *
 * Deux étapes dans un seul écran : identifiants, puis code de second facteur si le compte en a un.
 * Nom d'utilisateur OU email — l'API route sur l'un ou l'autre selon la présence d'un « @ », comme
 * sur mobile. Réservée aux comptes PROFESSIONAL / ADMIN : les patients restent sur mobile
 * (D-039/D-044).
 *
 * ⚠️ **Un écart assumé avec la maquette, et la raison est sérieuse.** La maquette affiche six cases
 * pour le code, et sous ces cases la mention « un code de secours à 10 caractères est aussi
 * accepté ». Les deux ne tiennent pas ensemble : six cases ne contiennent pas dix caractères. Or un
 * code de secours est le SEUL recours quand l'application d'authentification est perdue — le
 * 20/08/2026, un compte administrateur s'est retrouvé enfermé dehors exactement pour cette raison.
 * Les six cases sont donc conservées telles quelles, et un lien discret bascule vers un champ libre
 * pour le code de secours. Rien n'est retiré à la maquette ; il lui est ajouté ce que son propre
 * texte promet.
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ApiError } from '@/lib/api'
import { usePageAccueil } from '@/hooks/usePageAccueil'
import { useSessionStore } from '@/state/session.store'
import { useLoginMutation, useLoadMeMutation } from '../hooks/useLogin'

/** Libellé de champ — 12px, graisse 600, texte secondaire (mesuré sur la maquette). */
function Libelle({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">{children}</span>
}

/** Bloc d'erreur en pied de formulaire — encadré, sur surface secondaire (A1). */
function Erreur({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--erreur-texte)]"
    >
      <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}


export function LoginPage() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const motif = useSessionStore((s) => s.motif)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpRequired, setTotpRequired] = useState(false)
  /** Bascule vers le code de secours : dix caractères libres au lieu des six cases. */
  const [modeSecours, setModeSecours] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useLoginMutation()
  const loadMe = useLoadMeMutation()

  const accueil = usePageAccueil()

  // Honore la préférence « page d'accueil » de B3 : la connexion doit ouvrir là où
  // l'utilisateur l'a demandé, sinon le réglage ne sert à rien.
  if (isAuthenticated) return <Navigate to={accueil} replace />

  /** Séparé de l'événement : la saisie du 6ᵉ chiffre lance la connexion sans passer par le formulaire. */
  const lancer = async () => {
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
      if (res.sessionToken) await loadMe.mutateAsync(res.sessionToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible — réessayez.')
    }
  }

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    void lancer()
  }

  const occupe = login.isPending || loadMe.isPending

  return (
    <AuthLayout titre="Connexion à ULAMU" subtitle="Connectez-vous à votre compte ULAMU — professionnels, structures et administration.">
      {/* Se retrouver déconnecté sans un mot donne l'impression d'un bogue, alors que l'application
          vient précisément de protéger le compte. On nomme la raison, et surtout la DURÉE : sans
          elle, l'utilisateur ne peut pas anticiper la prochaine fois. */}
      {motif === 'expiration' || motif === 'refus-serveur' ? (
        <div
          role="status"
          className="mb-3 flex flex-col gap-1 rounded-md border border-border bg-secondary p-3 text-[var(--alerte-texte)]"
        >
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
            Session expirée
          </span>
          <span className="text-[13px] leading-[1.55]">
            Par sécurité, une session inactive plus de 30 minutes est fermée — les postes de travail sont
            souvent partagés. Reconnectez-vous pour reprendre.
          </span>
        </div>
      ) : null}

      {/* `key` sur l'étape : remonter le bloc rejoue l'animation d'entrée à chaque changement. */}
      <form onSubmit={soumettre} key={totpRequired ? "totp" : "identifiants"} className="ulamu-step-fade flex flex-col gap-3">
        {!totpRequired ? (
          <>
            <label className="flex flex-col gap-1">
              <Libelle>Nom d'utilisateur ou email</Libelle>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dr_kouma ou vous@exemple.com"
                autoComplete="username"
                autoFocus
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <Libelle>Mot de passe</Libelle>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <Link
              to="/mot-de-passe-oublie"
              className="self-end text-[11px] font-semibold text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </>
        ) : (
          <>
            <p className="m-0 flex items-center gap-1.5 text-[13px] leading-[1.55] text-muted-foreground">
              <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
              Code de votre application d'authentification
            </p>

            {!modeSecours ? (
              <div>
                <Libelle>Code TOTP (6 chiffres)</Libelle>
                <div className="mt-1.5">
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={setTotpCode}
                    /* Six chiffres saisis = on soumet. Réclamer un clic de plus après le dernier
                       chiffre n'apporte rien : le code est complet ou il ne l'est pas. */
                    onComplete={() => void lancer()}
                    autoFocus
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* La maquette place ici un pavé numérique. Retiré sur consigne du 20/08/2026 : sur
                    un poste de travail, le clavier fait le même travail, et les cases sont déjà
                    entièrement saisissables au clavier. */}
                {/* Une seule ligne, et elle est actionnable. La version précédente énonçait le fait
                    (« un code de secours est aussi accepté ») PUIS posait le lien : deux formulations
                    du même message, sur une ligne qui s'enroulait. */}
                <p className="mt-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
                  Pas de code ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModeSecours(true)
                      setTotpCode('')
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Utiliser un code de secours
                  </button>
                </p>
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <Libelle>Code de secours (10 caractères)</Libelle>
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.trim())}
                  maxLength={10}
                  autoComplete="one-time-code"
                  className="font-mono"
                  autoFocus
                  required
                />
                <span className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
                  Chaque code ne sert qu'une fois.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModeSecours(false)
                      setTotpCode('')
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Revenir au code à 6 chiffres
                  </button>
                </span>
              </label>
            )}
          </>
        )}

        {error ? <Erreur>{error}</Erreur> : null}

        <Button type="submit" size="lg" disabled={occupe} className="w-full">
          {occupe ? <Spinner /> : null}
          {totpRequired ? 'Vérifier' : 'Se connecter'}
        </Button>

        {totpRequired ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setTotpRequired(false)
              setModeSecours(false)
              setTotpCode('')
              setError(null)
            }}
          >
            Retour
          </Button>
        ) : null}
      </form>

      {!totpRequired ? (
        <p className="mt-4 text-center text-[11px] text-[var(--texte-tertiaire)]">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-semibold text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  )
}
