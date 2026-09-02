/**
 * B3 · Aide — écrire à l'administration, et lire sa réponse (01/09/2026, dette 8quater).
 *
 * ── Ce que cet écran remplace ──────────────────────────────────────────────────────────────────
 *
 * Une adresse de courriel, `support@ulamu.cg`, dont le domaine n'appartient pas au projet : ni
 * achetée, ni relevée. Elle figurait dans les mentions légales — **acceptées à l'inscription, donc
 * valant preuve** — et derrière « Écrire à l'administration » en C1. On promettait une voie de
 * contact qui ne menait nulle part.
 *
 * ── Pourquoi la réponse vit ICI, et pas ailleurs ───────────────────────────────────────────────
 *
 * Un formulaire qui envoie sans jamais rien rendre est pire que l'adresse morte qu'il remplace :
 * au moins, avec une adresse, on sait qu'on n'a pas eu de réponse. C'est pourquoi cet écran montre
 * **les deux moitiés** — ce qu'on a demandé et ce qu'on a reçu. Sans domaine à acheter, sans boîte
 * à relever.
 *
 * ── Ce qu'il ne prétend pas être ───────────────────────────────────────────────────────────────
 *
 * Ce n'est pas une messagerie. Une demande reçoit **une** réponse, et elle est close : ULAMU n'a
 * pas de messagerie interne, et les échanges n'existent que pendant une consultation. Afficher un
 * fil de discussion laisserait croire à un aller-retour que rien ne fait vivre.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { LifeBuoy, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avis, Carte, Pilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import { api, ApiError, type SupportProcedureType } from '@/lib/api'
import { SqueletteCartes } from '@/components/ulamu/Squelette'

const messageDe = (e: unknown) =>
  e instanceof ApiError ? e.message : "Votre demande n'a pas pu être envoyée. Réessayez dans un moment."

/**
 * Les quatre sujets sont ceux des procédures support déjà outillées côté administration : une
 * demande désigne ainsi directement la procédure guidée qui la traitera. « Autre » n'est pas un
 * fourre-tout paresseux — c'est la seule case honnête quand aucune des trois ne correspond.
 */
const SUJETS: ReadonlyArray<{ cle: SupportProcedureType; label: string; aide: string }> = [
  { cle: 'PHONE_CHANGE', label: 'J’ai perdu mon numéro', aide: 'Le code de connexion arrive sur une ligne que je n’ai plus' },
  { cle: 'RECORD_TRANSFER', label: 'Mon carnet de santé', aide: 'Transfert, correction ou accès à mon dossier' },
  /*
    02/09/2026 (chantier 29) — « Ma structure · Titulaire injoignable » est retiré des sujets
    proposés. ULAMU a trois acteurs depuis D-051 : personne n'administre plus de structure, donc
    personne ne peut avoir ce problème.

    Le laisser aurait été pire qu'inutile : un soignant qui le choisit dépose une demande qu'aucun
    administrateur ne saura traiter — la procédure guidée correspondante a elle aussi été retirée
    des choix d'E7 le même jour. Une case qui mène à une file morte est une promesse de réponse
    qu'on ne tiendra pas.

    ⚠️ Le sujet reste connu du serveur (`SupportProcedureType`), et E7 sait encore l'AFFICHER :
    des demandes déposées avant cette date le portent. On cesse de l'offrir, on ne l'efface pas.
  */
  { cle: 'OTHER', label: 'Autre demande', aide: 'Tout ce qui n’entre dans aucune des trois' },
]

const LABEL_SUJET = new Map(SUJETS.map((s) => [s.cle, s.label]))

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function SectionAide() {
  const [params] = useSearchParams()
  // C1 arrive avec son sujet déjà connu : le pré-choisir évite de faire chercher à quelqu'un sa
  // propre situation dans une liste.
  const sujetDemande = params.get('sujet') as SupportProcedureType | null
  const [sujet, setSujet] = useState<SupportProcedureType>(
    SUJETS.some((s) => s.cle === sujetDemande) ? (sujetDemande as SupportProcedureType) : 'OTHER',
  )
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoyee, setEnvoyee] = useState(false)
  const qc = useQueryClient()

  const miennes = useQuery({ queryKey: ['support-requests'], queryFn: () => api.mySupportRequests(), retry: false })

  const envoyer = useMutation({
    mutationFn: () => api.createSupportRequest({ subject: sujet, body: texte.trim() }),
    onSuccess: () => {
      setTexte('')
      setEnvoyee(true)
      setErreur(null)
      void qc.invalidateQueries({ queryKey: ['support-requests'] })
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  // 10 caractères : la borne du serveur. L'annoncer ici évite un aller-retour pour l'apprendre.
  const assezEcrit = texte.trim().length >= 10

  return (
    <div className="flex flex-col gap-4">
      <Carte
        icone={LifeBuoy}
        titre="Écrire à l’administration"
        sousTitre="La réponse arrive sur cette page — ULAMU n’envoie pas de courriel de support"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sujet-aide">De quoi s’agit-il ?</Label>
          <Liste id="sujet-aide" className="max-w-sm" valeur={sujet} onChange={setSujet} options={SUJETS} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="texte-aide">Votre demande</Label>
          <Textarea
            id="texte-aide"
            rows={5}
            value={texte}
            maxLength={2000}
            placeholder="Décrivez votre situation en quelques phrases."
            onChange={(e) => {
              setTexte(e.target.value)
              setEnvoyee(false)
            }}
          />
          <p className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
            {texte.trim().length} / 2000 caractères. N’écrivez pas votre mot de passe ni un code de
            connexion : l’administration ne vous les demandera jamais.
          </p>
        </div>

        {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
        {envoyee ? (
          <Avis ton="succes">
            Votre demande est enregistrée. Elle apparaît ci-dessous, et la réponse s’y affichera —
            vous n’avez rien à relancer.
          </Avis>
        ) : null}

        <div>
          <Button type="button" onClick={() => envoyer.mutate()} disabled={!assezEcrit || envoyer.isPending}>
            {envoyer.isPending ? <Spinner className="size-4" /> : null}
            {envoyer.isPending ? 'Envoi…' : 'Envoyer ma demande'}
          </Button>
        </div>
      </Carte>

      <Carte icone={MessagesSquare} titre="Mes demandes" sousTitre="Ce que vous avez écrit, et ce qu’on vous a répondu">
        {miennes.isPending ? (
          <SqueletteCartes nombre={2} hauteur={116} libelle="Lecture de vos demandes…" />
        ) : miennes.isError ? (
          <Avis ton="erreur">
            Vos demandes n’ont pas pu être lues. Celles que vous avez envoyées sont conservées côté
            serveur : seul cet affichage manque.
          </Avis>
        ) : miennes.data.length === 0 ? (
          <p className="py-2 text-[12px] text-[var(--texte-tertiaire)]">
            Vous n’avez encore rien écrit à l’administration.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {miennes.data.map((d) => (
              <li key={d.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">
                    {LABEL_SUJET.get(d.subject) ?? d.subject}
                  </span>
                  {d.status === 'ANSWERED' ? (
                    <Pilule ton="succes">Répondue</Pilule>
                  ) : (
                    <Pilule ton="neutre">En attente</Pilule>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                  {dateHeureFr(d.createdAt)}
                </p>
                <p className="mt-2 text-[12px] leading-[1.6] whitespace-pre-wrap text-[var(--texte-secondaire)]">
                  {d.body}
                </p>

                {d.answer ? (
                  /* La réponse est visuellement distincte de la demande : sans cela, on relit son
                     propre texte en croyant lire celui de l'administration. */
                  <div className="mt-2.5 rounded-md border-l-2 border-[var(--ap-400)] bg-secondary p-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                      Réponse de l’administration · {d.answeredAt ? dateHeureFr(d.answeredAt) : '—'}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.6] whitespace-pre-wrap text-foreground">{d.answer}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-[var(--texte-tertiaire)]">
                    Aucune réponse pour l’instant. Elle s’affichera ici.
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Carte>
    </div>
  )
}
