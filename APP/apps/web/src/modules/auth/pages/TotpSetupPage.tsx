/**
 * A4 — Configuration de la double authentification. D'après
 * `docs/maquettes/A4 - Configuration 2FA.dc.html`.
 *
 * Écran à part : pas de carrousel, une carte centrée de 460 px en verre dépoli. C'est cohérent — on
 * n'y arrive qu'une fois connecté, ce n'est plus une porte d'entrée.
 *
 * Le QR code est fabriqué **sur le poste** (bibliothèque `qrcode`) : le secret ne part jamais vers
 * un service tiers pour être transformé en image.
 *
 * ⚠️ **Deux phrases de la maquette sont devenues fausses, et sont corrigées ici.** Elles étaient
 * exactes le 14/08, quand la maquette a été dessinée ; nos décisions du 20/08 les ont invalidées.
 * Les laisser telles quelles aurait fait mentir l'interface :
 *
 *   • « La double authentification est OBLIGATOIRE pour tous les comptes professionnels » — elle est
 *     devenue volontaire (`ADMIN_REQUIRE_TOTP`, et la garde retirée du routeur web).
 *   • « Le web ULAMU n'envoie ni SMS ni code par email » — la récupération par email a été ajoutée
 *     la veille, précisément pour qu'un compte sans authentificateur ne reste pas enfermé dehors.
 *
 * ⚠️ **Une sortie a été ajoutée.** La maquette n'en prévoit aucune, ce qui se tenait quand l'écran
 * était BLOQUANT. Depuis qu'il est volontaire, quelqu'un qui l'ouvre et change d'avis n'aurait plus
 * eu aucun moyen d'en partir.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { AlertCircle, AlertTriangle, Check, Copy, Download, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecompteTotp } from '@/components/ulamu/DecompteTotp'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { EtapesAuth } from '@/components/auth/EtapesAuth'
import { Logo } from '@/components/ulamu/Logo'
import { useSessionStore } from '@/state/session.store'

type Step = 'loading' | 'scan' | 'code' | 'backup-codes' | 'error'

/* ⚠️ **Trois étapes là où la maquette n'en met qu'une.** Elle empile le QR (216 px), le secret à
   recopier, les six cases et le bouton sur un seul écran : environ 700 px, pour 620 px de fenêtre
   sur un portable courant. La page se mettait à défiler et le logo sortait du champ de vision.
   Même remède que pour A2 et A3, et même motif visuel — l'indicateur d'étapes est le composant
   partagé. */
const ETAPES = [
  { cle: 'scan' as const, libelle: 'Scanner' },
  { cle: 'code' as const, libelle: 'Vérifier' },
  { cle: 'backup-codes' as const, libelle: 'Codes' },
]

/** Bandeau gris en tête de carte — icône, titre, sous-titre (maquette A4). */
function Entete() {
  return (
    <div className="flex items-start gap-3 border-b border-border bg-secondary px-4 py-3">
      <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 text-[var(--ap-600)]">
        <ShieldCheck size={20} strokeWidth={1.5} />
      </span>
      {/* Le sous-titre de la maquette — « la double authentification protège votre compte… » — est
          retiré : il paraphrase le titre sur deux lignes, et ces 32px manquaient pour que l'écran
          tienne dans une fenêtre courte. */}
      <span className="min-w-0">
        <span className="block font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.01em] text-foreground">
          Sécurisez votre compte
        </span>
      </span>
    </div>
  )
}

export function TotpSetupPage() {
  const navigate = useNavigate()
  const setMe = useSessionStore((s) => s.setMe)
  const [step, setStep] = useState<Step>('loading')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [codesCopies, setCodesCopies] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * `useQuery` et non une mutation déclenchée au montage, gardée par un `useRef`.
   *
   * Ce garde existait pour éviter un double appel ; il produisait l'inverse. `StrictMode` monte,
   * démonte puis remonte le composant en développement, et le `useRef` SURVIT à ce cycle : au
   * remontage il valait déjà `true`, donc l'appel n'était jamais lancé et l'écran restait
   * indéfiniment sur son squelette de chargement. Le défaut ne se voyait qu'en local — en
   * production StrictMode ne double rien — mais il rendait cet écran intestable pour quiconque
   * développe dessus.
   *
   * `useQuery` gère nativement ce cycle, déduplique les appels concurrents et expose ses états sans
   * qu'on ait à les recopier. La route est bien un POST, mais elle fait un `upsert` : la rejouer est
   * sans conséquence.
   */
  const setup = useQuery({
    queryKey: ['totp-setup'],
    queryFn: () => api.setupTotp(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })
  const confirm = useMutation({ mutationFn: (c: string) => api.confirmTotp(c) })
  const secret = setup.data?.secret ?? ''

  const preparer = () => {
    setStep('loading')
    void setup.refetch()
  }

  /*
    Le QR est fabriqué dès que le secret arrive — opération asynchrone, d'où l'effet séparé.

    ⚠️ Le repli sur la saisie manuelle n'est pas une précaution de style (01/09/2026). Cet appel
    n'avait ni garde ni `.catch` : une adresse de provisionnement absente — une réponse 200 dont la
    forme n'est pas celle attendue — faisait lever `qrcode` avec « Cannot read properties of
    undefined (reading 'getContext') », et l'écran ENTIER tombait.

    Ce serait grave n'importe où. ⚠️ 02/09/2026 (D-053) : ce commentaire ajoutait que c'était
    « bloquant », RM-01-06 rendant alors le TOTP obligatoire pour l'administration. Ce n'est plus
    le cas — il est optionnel pour tous. Le garde-fou reste : un écran d'activation qui tombe
    priverait quand même de la protection qu'on venait chercher.

    Or l'écran propose DÉJÀ la saisie manuelle du secret, juste à côté. En cas d'échec on y bascule
    donc, au lieu de tout perdre : le QR est un confort, le secret est la vraie donnée.
  */
  useEffect(() => {
    if (!setup.data) return
    let annule = false

    /** Sans QR possible : on déplie directement le secret, qui est la vraie donnée. */
    const replierSurLeSecret = () => {
      if (annule) return
      if (!setup.data?.secret) {
        // Ni adresse ni secret : il n'y a plus rien à activer, autant le dire.
        setStep('error')
        return
      }
      setSecretVisible(true)
      setStep((s) => (s === 'loading' ? 'scan' : s))
    }

    if (!setup.data.provisioningUri) {
      replierSurLeSecret()
      return
    }

    void QRCode.toDataURL(setup.data.provisioningUri, { margin: 1, width: 176 })
      .then((url) => {
        if (annule) return
        setQrDataUrl(url)
        setStep((s) => (s === 'loading' ? 'scan' : s))
      })
      .catch(replierSurLeSecret)

    return () => {
      annule = true
    }
  }, [setup.data])

  useEffect(() => {
    if (setup.isError) setStep('error')
  }, [setup.isError])

  const activer = async () => {
    setError(null)
    try {
      const res = await confirm.mutateAsync(code)
      setBackupCodes(res.backupCodes)
      setStep('backup-codes')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide — réessayez.')
    }
  }

  const terminer = async () => {
    const me = await api.me()
    setMe(me)
    /**
     * CU-01-02 : « à la création, redirection **obligatoire** vers le dépôt du dossier de
     * vérification ». Et `RM-02-04` : sans ce dossier, le compte reste invisible de l'annuaire.
     * Envoyer un professionnel fraîchement inscrit sur un tableau de bord vide reviendrait à lui
     * cacher la seule action qui puisse le rendre opérationnel.
     *
     * Les comptes d'administration, eux, n'ont pas de dossier à déposer : ils vont au tableau de bord.
     */
    const aUnDossier = me.accountType === 'PROFESSIONAL'
    navigate(aUnDossier ? '/verification' : '/dashboard', { replace: true })
  }

  const copierSecret = async () => {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /** Un code par ligne : c'est le format qu'on recolle dans un gestionnaire de mots de passe. */
  const copierLesCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'))
    setCodesCopies(true)
    setTimeout(() => setCodesCopies(false), 2000)
  }

  /** Les codes ne s'affichent qu'une fois : les recopier à la main est la première cause de perte. */
  const telechargerLesCodes = () => {
    const contenu = [
      'ULAMU — codes de secours',
      'Chacun ne sert QU UNE FOIS. Conservez ce fichier hors de votre ordinateur de travail.',
      `Generes le ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      ...backupCodes,
    ].join('\n')
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'ulamu-codes-de-secours.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--fond-page)] p-5 saris-grain-strong">
      <div className="w-[460px] max-w-full">
        {/* Titre masqué et repère de page : comme les trois autres écrans d'entrée, celui-ci
            n'annonçait rien à un lecteur d'écran. Rien de visible ne change. */}
        <h1 className="sr-only">Activation de la double authentification</h1>
        <div className="mb-4 flex justify-center">
          <Logo size={30} />
        </div>

        <div
          className="overflow-hidden rounded-[10px] border border-border shadow-[var(--ombre-1)] backdrop-blur-[var(--glass-card-blur)]"
          style={{ backgroundColor: 'var(--glass-card-bg)', backgroundImage: 'var(--grain-url-fine)', backgroundSize: '110px 110px' }}
        >
          <Entete />

          <div className="p-4">
            {step === 'scan' || step === 'code' || step === 'backup-codes' ? (
              <EtapesAuth
                etapes={ETAPES}
                courant={ETAPES.findIndex((e) => e.cle === step)}
                /* Revenir en arrière n'a de sens que TANT QUE le second facteur n'est pas actif.
                   Une fois les codes de secours affichés, le serveur a déjà enregistré l'activation :
                   repartir en arrière rejouerait une configuration qui n'existe plus. */
                aller={(c) => step !== 'backup-codes' && setStep(c)}
              />
            ) : null}

            {step === 'loading' ? (
              /* Squelette plutôt qu'un rond qui tourne : il dit CE QUI arrive (un QR, un champ, six
                 cases). C'est le premier appel après connexion, donc celui qui réveille le serveur
                 endormi — l'attente peut durer, autant qu'elle soit lisible. */
              <div aria-busy="true" className="flex flex-col gap-4">
                <div className="ul-shimmer h-[13px] w-[70%] rounded" />
                <div className="ul-shimmer size-[176px] self-center rounded-md" />
                <div className="ul-shimmer h-[34px] w-full rounded-md" />
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="ul-shimmer size-11 rounded-md" />
                  ))}
                </div>
                <p className="m-0 flex items-center gap-2 text-xs text-[var(--texte-tertiaire)]">
                  <Spinner className="size-3.5" />
                  Préparation… le premier appel après connexion peut réveiller le serveur.
                </p>
              </div>
            ) : step === 'error' ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-lg border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] text-[var(--erreur-accent)]">
                  <AlertTriangle size={24} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <p className="m-0 font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.3] text-foreground">
                  Configuration indisponible
                </p>
                <p className="m-0 max-w-[42ch] text-[13px] leading-[1.55] text-muted-foreground">
                  Impossible de préparer la double authentification pour le moment.
                </p>
                <Button size="lg" className="w-full" onClick={preparer}>
                  <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                  Réessayer
                </Button>
              </div>
            ) : step === 'scan' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setStep('code')
                }}
                className="ulamu-step-fade flex flex-col gap-4"
              >
                {/* Sans QR fabriqué, « scannez ce code » désignerait quelque chose qui n'est pas
                    là. La consigne suit ce qui est réellement affiché. */}
                <p className="m-0 text-[13px] leading-[1.55] text-muted-foreground">
                  {qrDataUrl
                    ? 'Scannez ce code avec Google Authenticator, Authy ou équivalent.'
                    : 'Ajoutez ce compte dans Google Authenticator, Authy ou équivalent, en recopiant le code ci-dessous.'}
                </p>

                {/* Le QR et le code manuel sont deux ALTERNATIVES, pas un empilement : qui ne peut
                    pas scanner n'a aucun besoin de voir le QR. Les afficher ensemble faisait
                    déborder l'écran de 29px, et surtout n'avait pas de sens. */}
                {!secretVisible ? (
                  <div className="flex justify-center">
                    <span className="block rounded-md border border-[var(--bordure-normale)] bg-white p-2">
                      {qrDataUrl ? <img src={qrDataUrl} alt="QR code de configuration de la double authentification" width={176} height={176} /> : null}
                    </span>
                  </div>
                ) : null}

                {/* Le secret à recopier est un RECOURS — pour qui ne peut pas scanner — pas le chemin
                    principal. Toujours dépliés, ses trois lignes poussaient l'écran 115 px au-delà de
                    la fenêtre sur un portable. Replié, il reste à un clic. */}
                <div>
                  {!secretVisible ? (
                    <button
                      type="button"
                      onClick={() => setSecretVisible(true)}
                      className="border-0 bg-transparent p-0 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Impossible de scanner ? Saisir le code à la main
                    </button>
                  ) : (
                    <div className="ulamu-step-fade">
                      <p className="m-0 mb-1 flex items-center justify-between gap-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
                        <span>Saisissez ce code dans votre application :</span>
                        {/* Sans QR fabriqué, ce bouton mènerait à un cadre vide — un cul-de-sac
                            sur un écran dont on ne peut pas sortir autrement. */}
                        {qrDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setSecretVisible(false)}
                            className="border-0 bg-transparent p-0 font-semibold text-primary hover:underline"
                          >
                            Revenir au QR code
                          </button>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-md bg-secondary px-2.5 py-1.5 font-mono text-[13px] leading-[1.6] text-foreground">
                          {secret}
                        </code>
                        <Button type="button" variant="outline" onClick={() => void copierSecret()}>
                          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                          {copied ? 'Copié' : 'Copier'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full">
                  C'est scanné — continuer
                </Button>
              </form>
            ) : step === 'code' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void activer()
                }}
                className="ulamu-step-fade flex flex-col gap-4"
              >
                <p className="m-0 text-[13px] leading-[1.55] text-muted-foreground">
                  {/*
                    02/09/2026 (chantier 34) — cette phrase disait « Il change toutes les 30 secondes ».
                    Un chiffre écrit dans la page, alors que la période vit dans `TOTP_STEP_SECONDS`
                    côté serveur : c'est exactement ce que le plan interdit depuis le début, et le
                    même défaut que les « 48 heures » de C5 ou les « 12 % » de C6.

                    Le décompte ci-dessous le remplace — et il dit mieux, puisqu'il annonce le temps
                    RESTANT plutôt qu'une durée théorique.
                  */}
                  Entrez le code à 6 chiffres affiché par votre application.
                </p>

                <div>
                  <span className="mb-1.5 block text-xs font-semibold leading-[1.4] text-muted-foreground">Code TOTP</span>
                  <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={() => void activer()} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="mt-2">
                    <DecompteTotp />
                  </div>
                </div>

                {error ? (
                  <p role="alert" className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--erreur-texte)]">
                    <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : null}

                <Button type="submit" size="lg" className="w-full" disabled={confirm.isPending || code.length < 6}>
                  {confirm.isPending ? <Spinner /> : null}
                  Activer la double authentification
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep('scan')}>
                  Revoir le QR code
                </Button>
              </form>
            ) : (
              <div className="ulamu-step-fade flex flex-col gap-4">
                <p className="m-0 text-[13px] leading-[1.55] text-muted-foreground">
                  Notez ces {backupCodes.length} codes de secours dans un endroit sûr — ils ne seront{' '}
                  <strong className="text-foreground">plus jamais affichés</strong>. Chacun permet une seule récupération
                  de compte si vous perdez votre application d'authentification.
                </p>

                {/* Le bloc porte `group` : l'action de copie n'apparaît qu'au survol, pour ne pas
                    encombrer une grille qu'on vient lire. `ul-au-survol` la garde atteignable au
                    clavier et sur écran tactile, où le survol n'existe pas. */}
                <div className="group relative rounded-md bg-secondary p-3">
                  <button
                    type="button"
                    onClick={() => void copierLesCodes()}
                    aria-label="Copier les 10 codes de secours"
                    className="ul-au-survol absolute right-2 top-2 inline-flex items-center gap-1.5 rounded border border-[var(--bordure-normale)] bg-card px-2 py-1 text-[11px] font-semibold text-foreground shadow-[var(--ombre-1)] hover:bg-[var(--ap-50)] focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    {codesCopies ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    {codesCopies ? 'Copiés' : 'Copier'}
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {backupCodes.map((c) => (
                      <code key={c} className="font-mono text-[13px] leading-[1.6] text-foreground">
                        {c}
                      </code>
                    ))}
                  </div>
                </div>

                {/* La maquette écrit ici que « le web ULAMU n'envoie ni SMS ni code par email ». Ce
                    n'est plus vrai depuis le 20/08 : la récupération par email existe. L'avertissement
                    reste utile, mais il doit dire la vérité — sinon quelqu'un qui perd tout croira son
                    compte perdu alors qu'une voie subsiste. */}
                <p className="m-0 flex gap-2 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--alerte-texte)]">
                  <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Sans authentificateur ni code de secours, il ne vous restera que la récupération par email —
                  à condition que l'adresse de votre compte soit à jour.
                </p>

                <div className="flex flex-col gap-2">
                  <Button size="lg" className="w-full" onClick={() => void terminer()}>
                    J'ai sauvegardé mes codes — continuer
                  </Button>
                  {/* Recopier dix codes à la main est la première cause de perte. */}
                  <Button type="button" variant="outline" className="w-full" onClick={telechargerLesCodes}>
                    <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                    Télécharger les codes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="m-0 mt-3 text-center text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          QR code généré sur votre poste — le secret ne part vers aucun service tiers.
        </p>

        {/* Sortie absente de la maquette, indispensable depuis que l'écran est volontaire : sans
            elle, qui l'ouvre par curiosité y reste enfermé. Masquée à la dernière étape — à ce
            moment le second facteur est DÉJÀ actif côté serveur, et partir sans noter ses codes de
            secours serait le pire moment pour sortir. */}
        {step !== 'backup-codes' ? (
          <p className="m-0 mt-2 text-center text-[11px] text-[var(--texte-tertiaire)]">
            <button
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
              className="font-semibold text-primary hover:underline"
            >
              Plus tard
            </button>
          </p>
        ) : null}
      </div>
    </main>
  )
}
