/**
 * E2 — Supervision financière. D'après `docs/maquettes/E2 - Supervision financiere.dc.html` et M13.
 *
 * Deux responsabilités que rien d'autre ne porte : trancher les remboursements manuels, et vérifier
 * que l'argent de la base correspond à celui de l'agrégateur.
 *
 * ── Le seuil de double validation n'est pas écrit ici ──────────────────────────────────────────
 *
 * La maquette annonce « plus de **100 000 XAF** exige l'accord de deux administrateurs ». La règle
 * qu'elle décrit est **juste** — deux administrateurs distincts, pas d'auto-validation (RM-13-06) —
 * seul le nombre est faux : PM-35 vaut 50 000.
 *
 * Mais l'écran n'a aucune raison de connaître ce nombre. **C'est le serveur qui pose
 * `PENDING_SECOND_APPROVAL` à la création de la demande** : quand l'écran reçoit ce statut, la
 * décision est déjà prise, il ne la recalcule pas. Le seuil n'apparaît donc que dans la PHRASE
 * d'explication, lue de `GET /v1/admin/parameters` — et si un super-administrateur change PM-35 dans
 * E3, cette phrase suit toute seule.
 *
 * ── Ce que « écart non instruit sous 7 jours » cachait ─────────────────────────────────────────
 *
 * La maquette écrit : « un écart non instruit sous 7 jours est signalé au porteur ». Trois choses
 * fausses (famille 2, point 4) :
 *
 * • Le rapprochement est **quotidien** (EF-13-09) et l'alerte part **immédiatement**, dans la même
 *   transaction que l'audit. Sept jours est environ quarante fois plus lent que la réalité, et donne
 *   une image molle d'un mécanisme strict.
 * • **La notion d'écart « instruit » n'existe pas** : ni table, ni statut, ni cycle de vie. Le
 *   rapprochement calcule un rapport, alerte, journalise — rien ne reste à cocher.
 * • « Signalé au porteur » désigne un destinataire inexistant : l'alerte va aux **administrateurs
 *   Finance**, c'est-à-dire à la personne qui lit cet écran.
 *
 * ⚠️ **Limite assumée du rapprochement** : la route `POST /finance/reconcile` **déclenche** un
 * rapprochement, elle ne relit pas le dernier rapport — aucune table ne le stocke. Le rapport
 * s'affiche donc APRÈS le clic, jamais au chargement. Le conserver demanderait une table et une
 * écriture dans la tâche quotidienne : hors périmètre, et dit à l'écran plutôt que caché.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Play,
  Scale,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionApresEchec } from '@/components/layout/RappelTotpAdmin'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { api, ApiError, type RefundRequest, type RefundStatus } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { SqueletteCartes } from '@/components/ulamu/Squelette'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const ETATS: Record<RefundStatus, { libelle: string; ton: TonPilule }> = {
  PENDING_SECOND_APPROVAL: { libelle: 'Attend un second accord', ton: 'alerte' },
  APPROVED: { libelle: 'Approuvée', ton: 'succes' },
  REJECTED: { libelle: 'Rejetée', ton: 'erreur' },
  EXECUTED: { libelle: 'Versée', ton: 'succes' },
}

type Onglet = 'a-trancher' | 'historique' | 'rapprochement'

// ── Une demande de remboursement ───────────────────────────────────────────

/**
 * Une ligne de la file.
 *
 * RM-13-06 : l'approbateur doit être **quelqu'un d'autre** que le demandeur, et le serveur le
 * vérifie. L'écran le vérifie AUSSI — non pour décider à sa place, mais pour ne pas proposer un
 * bouton qui reviendra en erreur. La raison est écrite sur la ligne, pas dans un message d'échec.
 */
function LigneRemboursement({
  demande,
  moi,
  onDecide,
}: {
  demande: RefundRequest
  moi: string
  onDecide: () => void
}) {
  const [erreur, setErreur] = useState<string | null>(null)
  const etat = ETATS[demande.status]
  const mienne = demande.requestedBy === moi
  const attend = demande.status === 'PENDING_SECOND_APPROVAL'

  const approuver = useMutation({
    mutationFn: () => api.approveRefund(demande.requestId),
    onSuccess: onDecide,
    onError: (e) => setErreur(messageDe(e)),
  })

  const rejeter = useMutation({
    mutationFn: () => api.rejectRefund(demande.requestId),
    onSuccess: onDecide,
    onError: (e) => setErreur(messageDe(e)),
  })

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-foreground">{demande.reason}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">
            Déposée le {dateFr(demande.createdAt)}
            {/*
              L'écran ne connaît que des identifiants d'administrateurs : la file ne sert pas leurs
              noms. « Initiée par Patrick Okemba » de la maquette demanderait une requête par ligne
              sur des comptes d'administration — on dit ce qui compte réellement : est-ce la vôtre.
            */}
            {mienne ? ' · initiée par vous' : ' · initiée par un autre administrateur'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-[family-name:var(--font-display)] text-[17px] font-bold tabular-nums text-foreground">
            {demande.amountXaf === null ? '—' : `${xaf(demande.amountXaf)} XAF`}
          </span>
          <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
        </span>
      </div>

      {attend ? (
        <div className="mt-2.5">
          {mienne ? (
            /*
              RM-13-06 : personne ne valide sa propre demande. Le serveur refuserait ; l'écran ne
              propose donc pas le bouton, et dit pourquoi — un bouton grisé sans raison se lit
              comme une panne.
            */
            <Avis ton="info">
              Vous avez initié cette demande : un autre administrateur Finance doit la trancher.
            </Avis>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => approuver.mutate()}
                  disabled={approuver.isPending || rejeter.isPending}
                >
                  <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" />
                  {approuver.isPending ? 'Enregistrement…' : 'Contresigner'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => rejeter.mutate()}
                  disabled={approuver.isPending || rejeter.isPending}
                >
                  {rejeter.isPending ? 'Enregistrement…' : 'Refuser'}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">
                Votre accord déclenche le versement au patient. Il est inscrit au journal à votre nom.
              </p>
            </>
          )}
        </div>
      ) : demande.decidedAt ? (
        <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">Tranchée le {dateFr(demande.decidedAt)}</p>
      ) : null}

      {erreur ? (
        <div className="mt-2">
          <Avis ton="erreur">{erreur}</Avis>
        </div>
      ) : null}
    </li>
  )
}

// ── Le rapprochement ───────────────────────────────────────────────────────

function Rapprochement() {
  const [erreur, setErreur] = useState<string | null>(null)

  const lancer = useMutation({
    mutationFn: () => api.runReconciliation(),
    onError: (e) => setErreur(messageDe(e)),
  })

  const rapport = lancer.data

  return (
    <Carte icone={Scale} titre="Rapprochement" sousTitre="Comparer la base et le relevé de l'agrégateur">
      {/*
        Famille 2, point 4. La maquette annonce « un écart non instruit sous 7 jours est signalé au
        porteur ». Le rapprochement est QUOTIDIEN, l'alerte part IMMÉDIATEMENT, la notion d'écart
        « instruit » n'existe pas, et le destinataire n'est pas « le porteur » mais les
        administrateurs Finance — c'est-à-dire vous.
      */}
      <p className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
        Le rapprochement tourne chaque jour. Dès qu'un écart apparaît, l'alerte part immédiatement aux
        administrateurs Finance et l'écart est inscrit au journal d'audit — il n'y a rien à cocher,
        rien à instruire : il y a à comprendre pourquoi.
      </p>

      <div>
        <Button type="button" onClick={() => lancer.mutate()} disabled={lancer.isPending}>
          {lancer.isPending ? <Spinner className="size-4" /> : <Play size={14} strokeWidth={1.8} aria-hidden="true" />}
          {lancer.isPending ? 'Rapprochement…' : 'Lancer un rapprochement'}
        </Button>
        {/*
          Limite assumée : la route DÉCLENCHE, elle ne relit pas. Aucune table ne conserve le
          rapport, et en créer une pour l'afficher au chargement dépasse ce chantier. Le dire évite
          qu'on prenne un écran vide pour une absence d'écart.
        */}
        <p className="mt-1.5 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Le résultat s'affiche après le lancement : aucun rapport n'est conservé entre deux
          exécutions. Un écran vide ne veut donc pas dire « aucun écart ».
        </p>
      </div>

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      {rapport ? (
        <>
          {rapport.hasGaps ? (
            <Avis ton="erreur">
              Des écarts ont été trouvés. Ils sont déjà au journal d'audit et les administrateurs
              Finance en ont été prévenus.
            </Avis>
          ) : (
            <Avis ton="succes">
              Aucun écart : les {rapport.dbLines} lignes de la base correspondent aux{' '}
              {rapport.aggregatorLines} du relevé.
            </Avis>
          )}

          <dl className="flex flex-wrap gap-2">
            {[
              { label: 'Manquant en base', n: rapport.missingInDb.length },
              { label: "Manquant chez l'agrégateur", n: rapport.missingAtAggregator.length },
              { label: 'Montants divergents', n: rapport.amountMismatch.length },
            ].map((b) => (
              <div key={b.label} className="min-w-0 flex-1 basis-40 rounded-md border border-border bg-secondary p-2.5">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                  {b.label}
                </dt>
                <dd
                  className={
                    'mt-0.5 text-[19px] font-bold leading-none ' +
                    (b.n > 0 ? 'text-[var(--erreur-texte)]' : 'text-foreground')
                  }
                >
                  {b.n}
                </dd>
              </div>
            ))}
          </dl>

          {rapport.amountMismatch.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground">Montants divergents</p>
              <ul className="flex flex-col gap-1">
                {rapport.amountMismatch.map((m) => (
                  <li key={m.aggregatorRef} className="rounded-md border border-border px-2.5 py-1.5 text-[12px]">
                    <span className="font-mono text-[11px] text-[var(--texte-tertiaire)]">{m.aggregatorRef}</span>
                    <span className="block text-[var(--texte-secondaire)]">
                      base {xaf(m.dbAmountXaf)} XAF · relevé {xaf(m.aggregatorAmountXaf)} XAF
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-[11px] text-[var(--texte-tertiaire)]">
            Rapprochement effectué le {new Date(rapport.checkedAtIso).toLocaleString('fr-FR')}.
          </p>
        </>
      ) : null}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function FinancePage() {
  const [onglet, setOnglet] = useState<Onglet>('a-trancher')
  const moi = useSessionStore((s) => s.me)
  const qc = useQueryClient()

  const attente = useQuery({
    queryKey: ['admin-refunds', 'PENDING_SECOND_APPROVAL'],
    queryFn: () => api.adminRefunds('PENDING_SECOND_APPROVAL'),
    retry: false,
  })
  const toutes = useQuery({ queryKey: ['admin-refunds'], queryFn: () => api.adminRefunds(), retry: false })

  /**
   * PM-35, lu du serveur. C'est la SEULE raison pour laquelle cet écran connaît un seuil : pour
   * l'expliquer. La décision, elle, est prise côté serveur au moment de la demande.
   */
  const parametres = useQuery({ queryKey: ['parameters'], queryFn: () => api.parameters(), retry: false })
  const seuil = parametres.data?.find((p) => p.key === 'PM-35')?.value

  const rafraichir = () => void qc.invalidateQueries({ queryKey: ['admin-refunds'] })

  const enAttente = attente.data ?? []
  const historique = (toutes.data ?? []).filter((r) => r.status !== 'PENDING_SECOND_APPROVAL')
  const montantEnJeu = enAttente.reduce((t, r) => t + (r.amountXaf ?? 0), 0)
  const monId = moi?.accountId ?? ''

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Banknote size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Supervision financière
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {/*
              Le sous-titre ne compte QUE si le serveur a répondu. Tant qu'il n'a pas répondu — ou
              qu'il a échoué — il n'y a pas « 0 » : il n'y a pas de nombre. Écrire 0 en cas de panne
              disait « rien à traiter » à un administrateur dont la file était peut-être pleine.
              Constaté le 01/09/2026 pendant la relecture visuelle, en servant des 500 à l'écran.
            */}
            {attente.isSuccess ? (
              <>
                {enAttente.length} demande{enAttente.length > 1 ? 's' : ''} à trancher
                {montantEnJeu > 0 ? ` · ${xaf(montantEnJeu)} XAF en jeu` : ''}
              </>
            ) : (
              <>Remboursements manuels et rapprochement</>
            )}
          </p>
        </span>
      </div>

      {/*
        La règle de la maquette est JUSTE — deux administrateurs distincts, pas d'auto-validation.
        Seul le nombre était faux (100 000 au lieu de PM-35). Il est lu du serveur, jamais écrit :
        si E3 le change, cette phrase suit.
      */}
      <div className="mb-4">
        <Carte icone={ShieldCheck} titre="Double validation" sousTitre="RM-13-06 — deux administrateurs, jamais le même deux fois">
          <p className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
            {seuil
              ? `Un remboursement de plus de ${xaf(Number(seuil))} XAF exige l'accord de deux administrateurs différents. `
              : "Au-delà d'un certain montant, un remboursement exige l'accord de deux administrateurs différents. "}
            Personne ne peut valider une demande qu'il a lui-même initiée, ni la valider deux fois. Le
            serveur applique cette règle : cet écran ne fait que la dire.
          </p>
        </Carte>
      </div>

      <div className="mb-4">
        <Segments
          label="Vue de la supervision"
          valeur={onglet}
          onChange={setOnglet}
          /* Même règle que le sous-titre : un onglet ne porte un compte que si le compte est connu.
             « À trancher 0 » pendant une panne annonce une file vide qu'on n'a pas pu lire. */
          options={[
            { cle: 'a-trancher', label: attente.isSuccess ? `À trancher ${enAttente.length}` : 'À trancher' },
            { cle: 'historique', label: toutes.isSuccess ? `Historique ${historique.length}` : 'Historique' },
            { cle: 'rapprochement', label: 'Rapprochement' },
          ]}
        />
      </div>

      {onglet === 'rapprochement' ? (
        <Rapprochement />
      ) : onglet === 'a-trancher' ? (
        <Carte icone={Scale} titre="Remboursements à trancher" sousTitre="Les plus anciens en premier — un patient attend">
          {attente.isPending ? (
            <SqueletteCartes nombre={3} hauteur={104} libelle="Lecture de la file…" />
          ) : attente.isError ? (
            /*
              La phrase du serveur seule — « Erreur interne du serveur » — ne répond à aucune des
              deux questions qu'on se pose ici : qu'est-ce que je risque, et que puis-je faire ? Les
              six autres écrans d'administration y répondaient déjà ; celui-ci, non. Corrigé le
              01/09/2026 pendant la relecture visuelle.
            */
            <div className="flex flex-col gap-2 py-2">
              <Avis ton="erreur">
                La file n'a pas pu être lue. Aucune demande n'a été tranchée, et aucun montant n'a
                bougé : cet écran ne fait que lire. ({messageDe(attente.error)})
              </Avis>
              <div>
                <ActionApresEchec surReessayer={() => attente.refetch()} />
              </div>
            </div>
          ) : enAttente.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
              Aucune demande n'attend de second accord. Celles qui en demandent un apparaissent ici dès
              leur dépôt.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {enAttente.map((r) => (
                <LigneRemboursement key={r.requestId} demande={r} moi={monId} onDecide={rafraichir} />
              ))}
            </ul>
          )}
        </Carte>
      ) : (
        <Carte icone={UserRound} titre="Décisions passées" sousTitre="Approuvées, rejetées, versées">
          {toutes.isPending ? (
            <SqueletteCartes nombre={2} hauteur={88} libelle="Lecture des décisions passées…" />
          ) : historique.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
              Aucune décision enregistrée pour l'instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {historique.map((r) => (
                <LigneRemboursement key={r.requestId} demande={r} moi={monId} onDecide={rafraichir} />
              ))}
            </ul>
          )}
        </Carte>
      )}

      {/*
        La maquette compte « REMBOURSÉ EN AOÛT · 1,82 M · 24 décisions favorables ». La file sert les
        200 dernières demandes, sans total ni découpage par mois : additionner ce qu'elle renvoie
        donnerait un chiffre qui plafonne à 200 sans le dire. Omis plutôt qu'approximé — un montant
        financier faux est pire qu'un montant absent.
      */}
      <p className="mt-3 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
        La file sert les deux cents demandes les plus récentes : elle ne totalise pas les
        remboursements d'un mois. Le journal des mouvements fait foi (EF-13-06).
      </p>

      {enAttente.length === 0 && historique.length === 0 && !attente.isPending ? (
        <div className="mt-4">
          <Avis ton="info">
            <AlertTriangle size={13} strokeWidth={1.9} aria-hidden="true" className="inline" /> Les
            remboursements automatiques — une consultation sans réponse du soignant — ne passent pas
            par cette file : ils sont exécutés par le serveur, sans décision humaine (D-008).
          </Avis>
        </div>
      ) : null}
    </div>
  )
}
