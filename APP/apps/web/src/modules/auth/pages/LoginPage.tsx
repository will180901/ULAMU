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
import { DecompteTotp } from '@/components/ulamu/DecompteTotp'
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
  /*
    ── Le second facteur a DEUX formes, l'écran n'en connaissait qu'une (chantier 31, 02/09/2026) ─

    Le serveur signale un second facteur par un 200 SANS jeton : `totpRequired` pour l'application
    d'authentification, `otpRequired` pour un code envoyé par email. Seule la première était lue.

    Sur `{ totpRequired: false, otpRequired: true }`, les deux branches tombaient à côté et **il ne
    se passait rien** : pas de message, pas d'étape suivante, le bouton s'arrêtait simplement de
    tourner. Un compte ayant activé la 2FA par email était enfermé dehors du web, en silence — et
    rien à l'écran ne permettait d'en sortir ni même de comprendre.

    Un seul état à trois valeurs plutôt que deux booléens : les deux facteurs sont exclusifs dans le
    temps (le serveur vérifie le TOTP d'abord, l'email ensuite), et deux booléens auraient autorisé
    un quatrième état impossible.
  */
  const [facteur, setFacteur] = useState<'aucun' | 'totp' | 'email'>('aucun')
  /** Un second facteur est demandé — quelle qu'en soit la forme. C'est LUI qui commande l'écran. */
  const secondFacteur = facteur !== 'aucun'
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
        totpCode: facteur === 'totp' ? totpCode : undefined,
        otpCode: facteur === 'email' ? totpCode : undefined,
      })
      if (res.totpRequired) {
        setFacteur('totp')
        return
      }
      if (res.otpRequired) {
        setFacteur('email')
        return
      }
      if (res.sessionToken) {
        await loadMe.mutateAsync(res.sessionToken)
        return
      }
      /*
        Le cas qui a coûté ce chantier : une réponse 200 sans jeton et sans second facteur annoncé.
        Elle ne devrait pas exister — mais quand elle existait, l'écran ne DISAIT rien. Un message
        vaut mieux qu'un bouton qui s'arrête de tourner : au moins on sait qu'il faut appeler.
      */
      setError("La connexion n'a pas abouti et le serveur n'a pas dit pourquoi. Réessayez, puis signalez-le si cela persiste.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible — réessayez.')
    }
  }

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    void lancer()
  }

  const occupe = login.isPending || loadMe.isPending

  /*
    02/09/2026 (chantier 28) — le sous-titre ci-dessous annonçait « professionnels, structures et
    administration ». Le chantier 25 avait corrigé le COMMENTAIRE en tête de ce fichier et laissé la
    phrase AFFICHÉE : la première dit ce que le code fait, la seconde dit ce que l'utilisateur lit.
    Seule la seconde compte pour lui, et c'est celle qui a survécu trois chantiers.
  */
  return (
    <AuthLayout titre="Connexion à ULAMU" subtitle="Connectez-vous à votre compte ULAMU — soignants et administration.">
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
      <form onSubmit={soumettre} key={facteur} className="ulamu-step-fade flex flex-col gap-3">
        {!secondFacteur ? (
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
            {/*
              Dire OÙ chercher le code, pas seulement qu'il en faut un. Les deux facteurs se
              ressemblent — six chiffres dans les deux cas — et rien ne les distingue à l'écran :
              quelqu'un qui a reçu un email chercherait dans son application d'authentification, et
              conclurait qu'elle est déréglée.
            */}
            <p className="m-0 flex items-center gap-1.5 text-[13px] leading-[1.55] text-muted-foreground">
              <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
              {facteur === 'email'
                ? 'Code envoyé à l’adresse email de votre compte'
                : "Code de votre application d'authentification"}
            </p>

            {facteur === 'email' ? (
              <div>
                <Libelle>Code reçu par email (6 chiffres)</Libelle>
                <div className="mt-1.5">
                  <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode} onComplete={() => void lancer()} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {/*
                  Aucun code de secours ici, et ce n'est pas un oubli : les codes de secours sont
                  ceux du TOTP. Le recours de la 2FA par email, c'est l'email lui-même — proposer un
                  code de secours mènerait à un refus du serveur.
                */}
                <p className="mt-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
                  Le code expire au bout de quelques minutes. Sans email, revenez en arrière et
                  réessayez : un nouveau code part à chaque tentative.
                </p>
              </div>
            ) : !modeSecours ? (
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

                {/* Le rythme du code (chantier 34) — uniquement sous les six cases du TOTP : le
                    code de SECOURS, lui, ne tourne pas, et le mode email suit un tout autre
                    minuteur (celui de l'OTP, côté serveur). */}
                <div className="mt-2">
                  <DecompteTotp />
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
          {secondFacteur ? 'Vérifier' : 'Se connecter'}
        </Button>

        {secondFacteur ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFacteur('aucun')
              setModeSecours(false)
              setTotpCode('')
              setError(null)
            }}
          >
            Retour
          </Button>
        ) : null}
      </form>

      {!secondFacteur ? (
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
