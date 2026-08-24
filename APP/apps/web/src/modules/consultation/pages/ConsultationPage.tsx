/**
 * C5 — Consultation. D'après `docs/maquettes/C5 - Consultation.dc.html`, l'écran de session du
 * mobile (`apps/mobile/src/screens/SessionScreen.tsx`) et le cahier des charges M06.
 *
 * La séance chronométrée elle-même : messagerie texte et photos, décompteur, contexte patient,
 * compte-rendu. C'est le seul endroit où un message existe (RM-06-03 : « aucun message hors d'une
 * session active — pas de messagerie libre »).
 *
 * ── Quatre écarts à la maquette ────────────────────────────────────────────────────────────────
 *
 * 1. **« 48 heures pour signer le compte-rendu » → 24 heures.** PM-30 vaut 86 400 s, et EF-06-08 dit
 *    « jusqu'à PM-30 (24 h) ». Un médecin qui croit avoir 48 h voit ses gains gelés à la 24ᵉ : c'est
 *    l'erreur la plus coûteuse de la maquette.
 * 2. **« Terminer la consultation » retiré.** Le professionnel ne PEUT pas clore par anticipation :
 *    `cancel` est réservé au patient (EF-06-10), et la séance se termine quand le décompteur est
 *    épuisé (CU-06-03). Le patient a payé N minutes — les lui couper serait lui reprendre ce qu'il a
 *    acheté. Ce que le professionnel peut, c'est PROLONGER, gratuitement (EF-06-07).
 * 3. **« Retenir pour le compte-rendu » retiré.** Aucun mécanisme d'épinglage n'existe. Remplacé par
 *    mieux : le compte-rendu se rédige PENDANT la séance (EF-06-08 le prévoit explicitement), dans
 *    le panneau de droite, avec un brouillon conservé localement. Épingler des messages n'était
 *    qu'un détour vers ce texte-là.
 * 4. **« Livrables » (ordonnance, examens) retiré** — M09 et M10 sont hors du périmètre de la
 *    soutenance (§0 du plan).
 *
 * ── Ce que le web ne fait pas, et que le mobile fait ───────────────────────────────────────────
 *
 * Les notes vocales. Le mobile les enregistre avec une bibliothèque native ; sur le web il faudrait
 * `MediaRecorder`, un encodage et une gestion de permission micro — un chantier à part. Texte et
 * photos suffisent à la démonstration, et l'API accepte déjà les deux.
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  FileText,
  ImagePlus,
  Lock,
  Plus,
  Send,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { api, ApiError, lireMediaSession, type CareSession, type CareSessionStatus, type SessionMessage } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { mmss, useDecompteurServeur } from '@/hooks/useDecompteurServeur'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const heureFr = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const ETATS: Record<CareSessionStatus, { libelle: string; ton: TonPilule }> = {
  PREPARING: { libelle: 'En préparation', ton: 'info' },
  ACTIVE: { libelle: 'En cours', ton: 'succes' },
  ENDED: { libelle: 'Terminée', ton: 'neutre' },
  REFUNDED: { libelle: 'Remboursée', ton: 'erreur' },
}

// ── Une bulle du fil ───────────────────────────────────────────────────────

function Media({ fileKey }: { fileKey: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [echec, setEchec] = useState(false)

  useEffect(() => {
    let vivant = true
    let cree: string | null = null
    lireMediaSession(fileKey)
      .then((f) => {
        if (!vivant) {
          URL.revokeObjectURL(f.url)
          return
        }
        cree = f.url
        setUrl(f.url)
      })
      .catch(() => vivant && setEchec(true))
    // Libéré au démontage : une photo de consultation n'a pas à rester en mémoire de l'onglet.
    return () => {
      vivant = false
      if (cree) URL.revokeObjectURL(cree)
    }
  }, [fileKey])

  if (echec) return <p className="text-[11px] text-[var(--erreur-texte)]">Image indisponible.</p>
  if (!url) return <span className="block h-32 w-48 animate-pulse rounded-md bg-secondary" />
  return <img src={url} alt="Photo transmise en consultation" className="max-h-64 rounded-md" />
}

function Bulle({ m, aMoi, onSupprimer }: { m: SessionMessage; aMoi: boolean; onSupprimer: () => void }) {
  const cles = m.mediaKeys.length > 0 ? m.mediaKeys : m.fileKey ? [m.fileKey] : []

  if (m.deletedAt) {
    return (
      <li className={'flex ' + (aMoi ? 'justify-end' : 'justify-start')}>
        <span className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] italic text-[var(--texte-tertiaire)]">
          Message supprimé
        </span>
      </li>
    )
  }

  return (
    <li className={'group flex flex-col gap-1 ' + (aMoi ? 'items-end' : 'items-start')}>
      <div
        className={
          'max-w-[min(34rem,85%)] rounded-lg px-3 py-2 ' +
          (aMoi ? 'bg-[var(--ap-50)] text-foreground' : 'border border-border bg-card text-foreground')
        }
      >
        {cles.map((k) => (
          <Media key={k} fileKey={k} />
        ))}
        {m.body ? <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{m.body}</p> : null}
      </div>
      <span className="flex items-center gap-1.5 px-1 text-[10px] text-[var(--texte-tertiaire)]">
        {heureFr(m.createdAt)}
        {m.editedAt ? <span>· modifié</span> : null}
        {/* Accusés : `status` n'est renseigné que sur MES messages (contrat M06). */}
        {aMoi && m.status ? <span>· {m.status === 'read' ? 'lu' : m.status === 'delivered' ? 'reçu' : 'envoyé'}</span> : null}
        {aMoi ? (
          <button
            type="button"
            onClick={onSupprimer}
            aria-label="Supprimer ce message"
            className="ul-au-survol rounded p-0.5 text-[var(--texte-tertiaire)] hover:text-[var(--erreur-texte)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </li>
  )
}

// ── Le compte-rendu ────────────────────────────────────────────────────────

/**
 * Le compte-rendu, rédigeable PENDANT la séance (EF-06-08).
 *
 * D-021 le rend obligatoire, et RM-06-04 en fait la condition du paiement : « Gains crédités
 * uniquement après dépôt du compte-rendu (qualité avant trésorerie). » Le brouillon est conservé
 * localement — une fermeture d'onglet en pleine rédaction ne doit pas coûter vingt minutes de texte.
 */
function CompteRendu({ session, onDepose }: { session: CareSession; onDepose: () => void }) {
  const cle = `ulamu-compte-rendu-${session.id}`
  const [diagnostic, setDiagnostic] = useState('')
  const [recommandations, setRecommandations] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    try {
      const brut = localStorage.getItem(cle)
      if (brut) {
        const d = JSON.parse(brut) as { diagnostic?: string; recommandations?: string }
        setDiagnostic(d.diagnostic ?? '')
        setRecommandations(d.recommandations ?? '')
      }
    } catch {
      // Un brouillon illisible n'est pas une raison de bloquer l'écran : on repart d'une page vierge.
    }
  }, [cle])

  useEffect(() => {
    if (diagnostic || recommandations) localStorage.setItem(cle, JSON.stringify({ diagnostic, recommandations }))
  }, [cle, diagnostic, recommandations])

  const deposer = useMutation({
    mutationFn: () => api.depositReport(session.id, { diagnosis: diagnostic.trim(), recommendations: recommandations.trim() }),
    onSuccess: () => {
      localStorage.removeItem(cle)
      onDepose()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  if (session.reportDepositedAt) {
    return (
      <Carte icone={FileText} titre="Compte-rendu" sousTitre="Déposé — vos gains sont crédités">
        <Avis ton="succes">Compte-rendu déposé le {new Date(session.reportDepositedAt).toLocaleString('fr-FR')}.</Avis>
      </Carte>
    )
  }

  return (
    <Carte
      icone={FileText}
      titre="Compte-rendu"
      sousTitre="Obligatoire — vos gains ne sont crédités qu'à son dépôt (RM-06-04)"
    >
      <div>
        <Label htmlFor="cr-diagnostic" className="mb-1.5 block text-[13px]">
          Diagnostic
        </Label>
        <Textarea id="cr-diagnostic" rows={4} maxLength={8000} value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="cr-recommandations" className="mb-1.5 block text-[13px]">
          Recommandations
        </Label>
        <Textarea
          id="cr-recommandations"
          rows={4}
          maxLength={8000}
          value={recommandations}
          onChange={(e) => setRecommandations(e.target.value)}
        />
      </div>
      {/*
        24 heures, pas 48 : PM-30 vaut 86 400 s et EF-06-08 le dit. Un médecin qui croit disposer du
        double voit ses gains gelés sans comprendre pourquoi.
      */}
      <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
        Vous pouvez le rédiger pendant la consultation, et jusqu'à <strong className="text-foreground">24 heures</strong> après
        sa fin. Passé ce délai, vos gains sont gelés et l'administration est alertée.
      </p>
      <div>
        <Button
          type="button"
          onClick={() => deposer.mutate()}
          disabled={deposer.isPending || diagnostic.trim().length === 0 || recommandations.trim().length === 0}
        >
          {deposer.isPending ? 'Dépôt…' : 'Déposer le compte-rendu'}
        </Button>
      </div>
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function ConsultationPage() {
  const { sessionId = '' } = useParams()
  const qc = useQueryClient()
  const moi = useSessionStore((s) => s.me)
  const [brouillon, setBrouillon] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const recuA = useRef(Date.now())
  const finFil = useRef<HTMLDivElement>(null)
  const champFichier = useRef<HTMLInputElement>(null)

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const s = await api.session(sessionId)
      recuA.current = Date.now()
      return s
    },
    // Trois secondes : le décompteur, l'indicateur de frappe et les accusés ne valent que frais.
    // Le mobile fait de même — il n'y a pas de canal poussé (M06 est interrogé en boucle).
    refetchInterval: 3_000,
    retry: false,
  })

  const active = session.data?.status === 'ACTIVE'
  const messages = useQuery({
    queryKey: ['session', sessionId, 'messages'],
    queryFn: () => api.sessionMessages(sessionId),
    refetchInterval: active ? 3_000 : false,
    enabled: !!session.data,
    retry: false,
  })

  const reste = useDecompteurServeur(session.data?.remainingSeconds ?? 0, recuA.current)

  // On suit le bas du fil à chaque arrivée : une consultation se lit dans l'ordre, pas à rebours.
  useEffect(() => {
    finFil.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.items.length])

  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['session', sessionId] })
    void qc.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] })
  }

  const envoyer = useMutation({
    mutationFn: (texte: string) =>
      // `clientMsgId` : si le réseau coupe après l'envoi mais avant la réponse, le rejeu ne crée pas
      // un doublon (ADR-12). C'est le serveur qui reconnaît la clé.
      api.sendMessage(sessionId, { clientMsgId: crypto.randomUUID(), kind: 'TEXT', body: texte }),
    onSuccess: () => {
      setBrouillon('')
      rafraichir()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const envoyerPhoto = useMutation({
    mutationFn: (f: File) =>
      new Promise<unknown>((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onerror = () => reject(new Error('Fichier illisible'))
        lecteur.onload = async () => {
          const brut = String(lecteur.result)
          // Deux temps : on téléverse, puis on envoie la CLÉ. Le message ne porte jamais les octets.
          const up = await api.uploadSessionMedia(sessionId, {
            fileBase64: brut.slice(brut.indexOf(',') + 1),
            mime: f.type,
          })
          resolve(await api.sendMessage(sessionId, { clientMsgId: crypto.randomUUID(), kind: 'PHOTO', fileKey: up.fileKey }))
        }
        lecteur.readAsDataURL(f)
      }),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const supprimer = useMutation({
    mutationFn: (id: string) => api.deleteSessionMessage(sessionId, id),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const prolonger = useMutation({
    mutationFn: () => api.extendSession(sessionId, 10),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  // Signal de frappe, au plus une fois toutes les quatre secondes : le serveur lui donne ~6 s de vie.
  const dernierPing = useRef(0)
  const signalerFrappe = () => {
    const t = Date.now()
    if (t - dernierPing.current < 4000) return
    dernierPing.current = t
    void api.typing(sessionId).catch(() => undefined)
  }

  if (session.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Ouverture de la consultation…
      </p>
    )
  }

  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Connexion au fil interrompue" sousTitre="La consultation n'est pas perdue">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos messages déjà envoyés sont arrivés, et le minuteur continue de tourner côté serveur.
          </p>
          <div>
            <Button type="button" onClick={() => session.refetch()}>
              Reprendre la consultation
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const s = session.data
  const etat = ETATS[s.status]
  const pre = s.preConsultation
  const peutProlonger = active && s.extensionTotalSec < 1800

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Stethoscope size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">Consultation</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--texte-tertiaire)]">
            <Lock size={12} strokeWidth={1.8} aria-hidden="true" />
            Échange chiffré · {s.durationMin} minutes
          </p>
        </span>
        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
        {s.status === 'ACTIVE' || s.status === 'PREPARING' ? (
          <span
            className={
              'font-mono text-[20px] font-bold tabular-nums ' + (reste < 120 && active ? 'text-[var(--erreur-texte)]' : 'text-foreground')
            }
            aria-label="Temps restant"
          >
            {mmss(reste)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <section aria-label="Fil de la consultation" className="flex min-w-0 flex-1 flex-col gap-4">
          {s.status === 'PREPARING' ? (
            <Carte icone={Clock} titre="En attente du patient" sousTitre="Le décompteur n'a pas encore démarré">
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                Le patient remplit sa pré-consultation. La séance démarrera à sa transmission — ou
                automatiquement dix minutes après le paiement, sans quoi personne n'attendrait indéfiniment.
              </p>
            </Carte>
          ) : null}

          {s.status === 'REFUNDED' ? (
            <Avis ton="erreur">
              Cette consultation a été remboursée au patient. Aucun gain ne sera crédité.
            </Avis>
          ) : null}

          <Carte icone={UserRound} titre="Échange" sousTitre={active ? 'Chiffré de bout en bout au repos' : "L'échange est clos et archivé"}>
            {messages.isPending ? (
              <p className="flex items-center gap-2 py-4 text-[12px] text-[var(--texte-tertiaire)]">
                <Spinner className="size-3.5" /> Chargement du fil…
              </p>
            ) : (
              <div className="max-h-[46vh] overflow-y-auto">
                <ul className="flex flex-col gap-3">
                  {(messages.data?.items ?? []).length === 0 ? (
                    <li className="py-6 text-center text-[12px] text-[var(--texte-tertiaire)]">
                      {active ? 'La consultation vient de commencer.' : 'Aucun message n’a été échangé.'}
                    </li>
                  ) : (
                    (messages.data?.items ?? []).map((m) => (
                      <Bulle key={m.id} m={m} aMoi={m.senderId === moi?.accountId} onSupprimer={() => supprimer.mutate(m.id)} />
                    ))
                  )}
                </ul>
                <div ref={finFil} />
              </div>
            )}

            {s.otherPartyTyping && active ? (
              <p className="text-[11px] italic text-[var(--texte-tertiaire)]">Le patient écrit…</p>
            ) : null}

            {active ? (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (brouillon.trim()) envoyer.mutate(brouillon.trim())
                }}
              >
                <input
                  ref={champFichier}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) envoyerPhoto.mutate(f)
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Envoyer une photo"
                  onClick={() => champFichier.current?.click()}
                  disabled={envoyerPhoto.isPending}
                >
                  {envoyerPhoto.isPending ? <Spinner className="size-4" /> : <ImagePlus size={16} strokeWidth={1.6} aria-hidden="true" />}
                </Button>
                <Textarea
                  aria-label="Votre message"
                  rows={1}
                  maxLength={8000}
                  value={brouillon}
                  placeholder="Écrivez votre message…"
                  className="min-h-9 resize-none"
                  onChange={(e) => {
                    setBrouillon(e.target.value)
                    signalerFrappe()
                  }}
                  onKeyDown={(e) => {
                    // Entrée envoie, Maj+Entrée passe à la ligne — la convention de toute messagerie.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (brouillon.trim()) envoyer.mutate(brouillon.trim())
                    }
                  }}
                />
                <Button type="submit" size="icon" aria-label="Envoyer" disabled={envoyer.isPending || brouillon.trim().length === 0}>
                  <Send size={16} strokeWidth={1.6} aria-hidden="true" />
                </Button>
              </form>
            ) : null}

            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </Carte>

          {peutProlonger ? (
            <div>
              {/* EF-06-07 : à la SEULE initiative du professionnel, gratuitement, plafond +30 min. */}
              <Button type="button" size="sm" variant="outline" onClick={() => prolonger.mutate()} disabled={prolonger.isPending}>
                <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                Prolonger de 10 minutes
              </Button>
              <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                Gratuit pour le patient · {Math.round(s.extensionTotalSec / 60)} min déjà offertes sur 30 au maximum.
              </p>
            </div>
          ) : null}
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <Carte icone={FileText} titre="Contexte patient" sousTitre="Transmis avec la pré-consultation">
            {pre ? (
              <>
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                    Symptômes
                  </p>
                  <p className="mt-0.5 text-[13px] leading-[1.55] whitespace-pre-wrap text-foreground">{pre.symptoms}</p>
                </div>
                {pre.sinceWhen ? (
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                      Depuis
                    </p>
                    <p className="mt-0.5 text-[13px] text-foreground">{pre.sinceWhen}</p>
                  </div>
                ) : null}
                {pre.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pre.attachments.map((k) => (
                      <Media key={k} fileKey={k} />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Le patient n'a pas encore transmis sa pré-consultation.
              </p>
            )}
          </Carte>

          {s.status !== 'REFUNDED' ? <CompteRendu session={s} onDepose={rafraichir} /> : null}
        </aside>
      </div>
    </div>
  )
}
