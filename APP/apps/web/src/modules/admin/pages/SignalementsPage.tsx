/**
 * E6 — Signalements. D'après `docs/maquettes/E6 - Signalements.dc.html` et M04 (EF-04-05/06, CU-04-04).
 *
 * La modération : ce qu'un utilisateur reproche à un autre, et ce que l'administration en fait.
 * Chaque décision est **immuable** — le serveur refuse de rejuger un signalement tranché.
 *
 * ── L'écart le plus lourd : le signaleur est CACHÉ, exprès ─────────────────────────────────────
 *
 * La maquette montre le plaignant à côté du mis en cause : initiales, référence, « 1er signalement
 * déposé ». **Le serveur retire l'identité du signaleur avant de servir** (`redactReportForAdmin`,
 * RM-04-04). Ce n'est pas un oubli à combler : c'est la condition pour qu'on ose signaler un
 * praticien dont on dépend. Un modérateur qui verrait qui accuse pourrait, sciemment ou non, en
 * tenir compte.
 *
 * L'écran le dit, plutôt que de laisser un vide qu'on prendrait pour une donnée manquante.
 *
 * ── Les autres écarts ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **« Ces signalements passent avant tout autre dossier » est faux.** Le serveur trie par
 *    **gravité d'abord, ancienneté ensuite** (CU-04-04) : un spam en retard reste derrière un
 *    harcèlement du jour. Promettre l'inverse ferait chercher en tête une ligne qui n'y est pas.
 * 2. **Aucun délai n'est écrit.** Le seuil vit dans PM-23, que cette route ne sert pas — et
 *    l'écran n'y a pas accès : la lecture des paramètres est réservée au super-administrateur. Le
 *    serveur envoie un drapeau `isOverdue` ; c'est lui qu'on affiche, sans le traduire en heures.
 * 3. **La chronologie est entièrement inventée.** « Demande d'explication envoyée au praticien »,
 *    « aucune réponse · relance automatique » : rien de tel n'existe — aucun échange avec le mis en
 *    cause, aucune relance. Il reste la date de dépôt, qui est vraie.
 * 4. **« Suspendre 15 jours » et « Bannir définitivement » ne sont pas des décisions d'ici.** Les
 *    quatre issues du serveur sont : classer sans suite, avertir, **transmettre** à l'administration
 *    des comptes, **transmettre** à la vérification. Une suspension se décide en E7, avec son propre
 *    motif ; un bannissement y demande en plus un second administrateur. Et aucune durée n'existe.
 * 5. **`SIG-2026-00218` et « USR-2026-00298 » retirés** — ces formats n'existent pas.
 * 6. **« 3ᵉ signalement · 1 confirmé » retiré.** Aucune route ne compte les signalements visant une
 *    même personne. Le calculer sur la file affichée donnerait un chiffre partiel présenté comme un
 *    antécédent — c'est-à-dire la pire forme d'approximation sur un écran qui décide de sanctions.
 * 7. **Bouton d'export retiré** (famille 3, groupe D) — l'export ne concerne que le journal d'audit.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Flag, Gavel, ShieldQuestion, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { api, type ReportDecision, type UserReport } from '@/lib/api'
import { SqueletteCartes } from '@/components/ulamu/Squelette'
import { messageErreur } from '@/lib/message-erreur'

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Les six motifs du serveur, dits en français — et rangés par gravité, comme lui les range. */
const MOTIFS: Record<string, { label: string; ton: TonPilule }> = {
  HARASSMENT: { label: 'Harcèlement', ton: 'erreur' },
  SUSPECTED_FAKE_PROFILE: { label: 'Profil suspecté faux', ton: 'alerte' },
  MISLEADING_INFORMATION: { label: 'Information trompeuse', ton: 'alerte' },
  INAPPROPRIATE_BEHAVIOR: { label: 'Comportement inapproprié', ton: 'info' },
  SPAM: { label: 'Spam', ton: 'neutre' },
  OTHER: { label: 'Autre', ton: 'neutre' },
}

const ETATS: Record<string, { label: string; ton: TonPilule }> = {
  OPEN: { label: 'À traiter', ton: 'alerte' },
  IN_REVIEW: { label: 'Pris en charge', ton: 'info' },
  DISMISSED: { label: 'Classé sans suite', ton: 'neutre' },
  ACTION_TAKEN: { label: 'Décision rendue', ton: 'succes' },
}

/**
 * Les QUATRE issues réelles (EF-04-06), avec ce que chacune fait vraiment.
 *
 * Deux d'entre elles ne tranchent pas : elles **transmettent**. C'est important à dire — un
 * modérateur qui croit avoir suspendu quelqu'un ne rouvrira pas le dossier ailleurs.
 */
const ISSUES: Array<{ cle: ReportDecision; label: string; effet: string }> = [
  {
    cle: 'DISMISSED',
    label: 'Classer sans suite',
    effet: "Aucun manquement retenu. Le signaleur est informé de l'issue, sans que son identité soit révélée.",
  },
  {
    cle: 'WARNING',
    label: 'Avertir',
    effet: "L'avertissement est inscrit au dossier et notifié. Aucune restriction d'accès : la personne continue d'exercer.",
  },
  {
    cle: 'ESCALATED_M16',
    label: "Transmettre à l'administration des comptes",
    effet:
      "Vous ne suspendez ni ne bannissez ici : vous transmettez. La sanction se décide dans « Comptes », avec son propre motif — et un bannissement y demande en plus un second administrateur.",
  },
  {
    cle: 'ESCALATED_M03',
    label: 'Transmettre à la vérification',
    effet: "Le dossier de vérification de la personne est réexaminé : c'est le chemin quand ce sont ses pièces ou son droit d'exercer qui sont en cause.",
  },
]

type Onglet = 'ouverts' | 'traites' | 'tous'

// ── Le signalement examiné ─────────────────────────────────────────────────

function Detail({ signalement, onDecide }: { signalement: UserReport; onDecide: () => void }) {
  const [issue, setIssue] = useState<ReportDecision | null>(null)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  const decider = useMutation({
    mutationFn: () => api.decideReport(signalement.id, { decision: issue as ReportDecision, reasons: motif.trim() }),
    onSuccess: onDecide,
    onError: (e) => setErreur(messageErreur(e)),
  })

  const motifDe = MOTIFS[signalement.reasonCode] ?? { label: signalement.reasonCode, ton: 'neutre' as TonPilule }
  const etat = ETATS[signalement.status] ?? { label: signalement.status, ton: 'neutre' as TonPilule }
  const tranche = signalement.status === 'DISMISSED' || signalement.status === 'ACTION_TAKEN'
  const choisie = ISSUES.find((i) => i.cle === issue)

  return (
    <div className="flex flex-col gap-4">
      <Carte icone={Flag} titre={motifDe.label} sousTitre={`Déposé le ${dateHeureFr(signalement.createdAt)}`}>
        <p className="flex flex-wrap items-center gap-2">
          <Pilule ton={etat.ton}>{etat.label}</Pilule>
          {signalement.isOverdue ? <Pilule ton="erreur">Hors délai</Pilule> : null}
        </p>

        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            Ce qui est reproché
          </p>
          <p className="mt-0.5 text-[13px] leading-[1.6] whitespace-pre-wrap text-foreground">
            {signalement.reasonText ?? 'Aucune précision n’a été jointe au signalement.'}
          </p>
        </div>
      </Carte>

      <Carte icone={UserX} titre="Les parties" sousTitre="Ce que l'administration peut voir, et ce qu'elle ne doit pas voir">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            Mis en cause
          </p>
          {/*
            Seul l'identifiant est servi : la file ne joint ni le nom ni la fiche. Le chercher
            demanderait une requête par ligne sur des comptes, exactement ce que RM-16-02 restreint.
          */}
          <p className="mt-0.5 font-mono text-[13px] text-foreground">
            {signalement.targetType} · {signalement.targetId.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/*
          RM-04-04. Ce n'est pas une donnée manquante : le serveur la RETIRE avant de servir. C'est
          la condition pour qu'on ose signaler un praticien dont on dépend — et un modérateur qui
          verrait qui accuse pourrait, sciemment ou non, en tenir compte.
        */}
        <Avis ton="info">
          L'identité du signaleur ne vous est pas transmise, et ne peut pas l'être. C'est ce qui
          permet de signaler quelqu'un dont on dépend. Il sera informé de votre décision, jamais
          l'inverse.
        </Avis>
      </Carte>

      {tranche ? (
        <Carte icone={Gavel} titre="Décision rendue" sousTitre="Les décisions de modération sont immuables">
          <Avis ton="succes">
            Ce signalement a été tranché. Le serveur refuse de le rejuger : une décision de modération
            ne se reprend pas.
          </Avis>
        </Carte>
      ) : (
        <Carte icone={Gavel} titre="Rendre une décision" sousTitre="Motivée, tracée, et définitive">
          <div className="flex flex-col gap-2">
            {ISSUES.map((i) => (
              <label
                key={i.cle}
                className={
                  'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ' +
                  (issue === i.cle ? 'border-[var(--ap-300)] bg-[var(--ap-50)]' : 'border-border bg-card hover:bg-secondary')
                }
              >
                <input
                  type="radio"
                  name="issue"
                  checked={issue === i.cle}
                  onChange={() => setIssue(i.cle)}
                  className="mt-0.5 size-3.5 shrink-0 accent-[var(--ap-500)]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-foreground">{i.label}</span>
                  <span className="block text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{i.effet}</span>
                </span>
              </label>
            ))}
          </div>

          <div>
            <Label htmlFor="motif-decision" className="mb-1.5 block text-[13px]">
              Motif
            </Label>
            <Textarea
              id="motif-decision"
              rows={3}
              maxLength={2000}
              value={motif}
              placeholder="Ce que vous avez constaté, et ce qui fonde votre décision"
              className="resize-none"
              onChange={(e) => setMotif(e.target.value)}
            />
            <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
              Il est inscrit au journal d'audit à votre nom, et il est <strong>définitif</strong> : ce
              signalement ne pourra plus être rejugé.
            </p>
          </div>

          {choisie ? <Avis ton="alerte">{choisie.effet}</Avis> : null}
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

          <div>
            <Button
              type="button"
              onClick={() => decider.mutate()}
              disabled={decider.isPending || issue === null || motif.trim().length === 0}
            >
              {decider.isPending ? 'Enregistrement…' : 'Rendre cette décision'}
            </Button>
            {issue === null ? (
              <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">Choisissez d'abord une issue.</p>
            ) : null}
          </div>
        </Carte>
      )}
    </div>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function SignalementsPage() {
  const [onglet, setOnglet] = useState<Onglet>('ouverts')
  const [choisi, setChoisi] = useState<string | null>(null)
  const qc = useQueryClient()

  const tous = useQuery({ queryKey: ['reports'], queryFn: () => api.reports(), retry: false })

  const liste = tous.data?.items ?? []
  const ouverts = liste.filter((r) => r.status === 'OPEN' || r.status === 'IN_REVIEW')
  const traites = liste.filter((r) => r.status === 'DISMISSED' || r.status === 'ACTION_TAKEN')
  const horsDelai = ouverts.filter((r) => r.isOverdue)

  const visibles = onglet === 'ouverts' ? ouverts : onglet === 'traites' ? traites : liste
  const selection = liste.find((r) => r.id === choisi) ?? null

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Flag size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Signalements
          </h1>
          {/*
            Aucun délai écrit : le seuil vit dans PM-23, que cette route ne sert pas — et l'écran
            n'y a pas accès, la lecture des paramètres étant réservée au super-administrateur. Le
            serveur envoie un drapeau ; c'est lui qu'on affiche.
          */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {/*
              Le sous-titre ne compte QUE si le serveur a répondu. Tant qu'il n'a pas répondu — ou
              qu'il a échoué — il n'y a pas « 0 » : il n'y a pas de nombre. Écrire 0 en cas de panne
              disait « rien à traiter » à un administrateur dont la file était peut-être pleine.
              Constaté le 01/09/2026 pendant la relecture visuelle, en servant des 500 à l'écran.
            */}
            {tous.isSuccess ? (
              <>
                {ouverts.length} ouvert{ouverts.length > 1 ? 's' : ''}
                {horsDelai.length > 0 ? `, dont ${horsDelai.length} hors délai` : ''} ·{' '}
              </>
            ) : null}
            les plus graves d'abord
          </p>
        </span>
      </div>

      {tous.isPending ? (
        <SqueletteCartes nombre={3} hauteur={96} libelle="Lecture des signalements…" />
      ) : tous.isError ? (
        <div className="mx-auto max-w-lg py-8">
          <Carte icone={AlertTriangle} titre="Les signalements n'ont pas pu être lus" sousTitre="Aucune décision n'est perdue">
            <div>
              <Button type="button" onClick={() => tous.refetch()}>
                Réessayer
              </Button>
            </div>
          </Carte>
        </div>
      ) : (
        <>
          {horsDelai.length > 0 ? (
            <div className="mb-4">
              {/*
                La maquette écrit : « ces signalements passent avant tout autre dossier de la file ».
                C'est faux. Le serveur trie par GRAVITÉ d'abord, ancienneté ensuite (CU-04-04) : un
                spam en retard reste derrière un harcèlement déposé ce matin. Promettre l'inverse
                ferait chercher en tête une ligne qui n'y est pas.
              */}
              <Avis ton="erreur">
                {`${horsDelai.length} signalement${horsDelai.length > 1 ? 's ont' : ' a'} dépassé le délai de traitement. La file reste triée par gravité puis par ancienneté : un signalement en retard ne passe pas devant un plus grave.`}
              </Avis>
            </div>
          ) : null}

          <div className="mb-4">
            <Segments
              label="Filtrer les signalements"
              valeur={onglet}
              onChange={setOnglet}
              options={[
                { cle: 'ouverts', label: `Ouverts ${ouverts.length}` },
                { cle: 'traites', label: `Tranchés ${traites.length}` },
                { cle: 'tous', label: `Tous ${liste.length}` },
              ]}
            />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
            <section aria-label="File des signalements" className="w-full shrink-0 lg:w-80">
              <Carte icone={ShieldQuestion} titre="File" sousTitre="Gravité, puis ancienneté">
                {visibles.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
                    {onglet === 'ouverts'
                      ? 'Aucun signalement en attente. Ceux qui arrivent apparaissent ici.'
                      : 'Rien dans cette vue.'}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {visibles.map((r) => {
                      const m = MOTIFS[r.reasonCode] ?? { label: r.reasonCode, ton: 'neutre' as TonPilule }
                      const actif = r.id === choisi
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            aria-current={actif ? 'true' : undefined}
                            onClick={() => setChoisi(r.id)}
                            className={
                              'w-full rounded-md border px-3 py-2 text-left transition-colors ' +
                              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
                              (actif
                                ? 'border-[var(--ap-200)] bg-[var(--ap-50)]'
                                : 'border-border bg-card hover:bg-secondary')
                            }
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <Pilule ton={m.ton}>{m.label}</Pilule>
                              {r.isOverdue ? <Pilule ton="erreur">Hors délai</Pilule> : null}
                            </span>
                            <span className="mt-1 block truncate text-[12px] text-[var(--texte-secondaire)]">
                              {r.reasonText ?? 'Sans précision'}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">
                              {dateHeureFr(r.createdAt)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Carte>
            </section>

            <div className="min-w-0 flex-1">
              {selection ? (
                <Detail
                  key={selection.id}
                  signalement={selection}
                  onDecide={() => {
                    setChoisi(null)
                    void qc.invalidateQueries({ queryKey: ['reports'] })
                  }}
                />
              ) : (
                <Carte icone={Flag} titre="Choisissez un signalement" sousTitre="Le détail et les issues s'affichent ici">
                  <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                    La file est triée par gravité puis par ancienneté : le premier de la liste est
                    celui qu'il faut regarder d'abord.
                  </p>
                  {/*
                    Dit une fois, en tête, plutôt qu'à chaque ouverture : c'est une propriété de
                    l'écran entier, pas d'un dossier.
                  */}
                  <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                    Vous ne verrez jamais qui a signalé. C'est ce qui permet de signaler quelqu'un
                    dont on dépend — le soignant qu'on retournera voir.
                  </p>
                </Carte>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
