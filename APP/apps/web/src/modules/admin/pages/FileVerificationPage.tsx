/**
 * E1 — File de vérification. D'après `docs/maquettes/E1 - File de verification.dc.html` et M03.
 *
 * L'autre bout de C1 : ici, l'administration décide si un soignant peut exercer. C'est la décision
 * la plus lourde de la plateforme — sans badge ET contrat signé, un professionnel n'existe pour
 * aucun patient (RM-03-01).
 *
 * ── Le trou que cet écran a révélé ────────────────────────────────────────────────────────────
 *
 * La file ne renvoyait que `documentCount` : un NOMBRE. L'administration savait qu'un dossier
 * contenait quatre pièces, sans pouvoir en ouvrir une seule — les identifiants n'étaient exposés
 * nulle part. On décidait de la vérification d'un soignant **sans regarder ses documents**.
 * `GET /admin/verification/:caseId` a été ajouté pour ça (24/08/2026).
 *
 * ── Trois écarts à la maquette ────────────────────────────────────────────────────────────────
 *
 * 1. **« 72 heures ouvrées » → 72 heures.** PM-11 vaut 72, mais `m03.policies` le dit sans détour :
 *    « MVP : heures pleines — les heures ouvrées seront affinées avec le modèle opérationnel ».
 *    Annoncer « ouvrées » promettrait un calcul que personne ne fait.
 * 2. **La checklist de contrôle des pièces reste LOCALE.** Rien ne la stocke côté serveur. Elle aide
 *    l'examinateur à ne rien oublier pendant qu'il travaille ; elle disparaît au rechargement, et
 *    l'écran ne prétend pas le contraire.
 * 3. **« Prendre le plus urgent » retiré.** La file est déjà triée par ancienneté et les dépassements
 *    remontent en tête : le bouton ne ferait que cliquer la première ligne à la place de l'humain,
 *    en lui retirant le coup d'œil qui lui dit POURQUOI elle est première.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock, FileText, Gavel, Inbox, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionApresEchec } from '@/components/layout/RappelTotpAdmin'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import { api, ApiError, type DocumentKind, type VerificationStatus } from '@/lib/api'
import { SqueletteTableau } from '@/components/ulamu/Squelette'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Les intitulés des pièces — identiques à ceux que voit le déposant, pour qu'on parle de la même. */
const PIECES: Record<DocumentKind, string> = {
  ID: 'Pièce d’identité',
  DIPLOMA: 'Diplôme',
  LICENSE: 'Attestation d’inscription à l’Ordre',
  PHOTO: 'Photo d’identité',
  ADDRESS_PROOF: 'Justificatif d’adresse',
}

const ETATS: Record<VerificationStatus, { libelle: string; ton: TonPilule }> = {
  DRAFT: { libelle: 'À compléter', ton: 'neutre' },
  SUBMITTED: { libelle: 'À prendre', ton: 'alerte' },
  IN_REVIEW: { libelle: 'En examen', ton: 'info' },
  NEEDS_INFO: { libelle: 'Complément demandé', ton: 'alerte' },
  REJECTED: { libelle: 'Refusé', ton: 'erreur' },
  VERIFIED: { libelle: 'Vérifié', ton: 'succes' },
  REVOKED: { libelle: 'Révoqué', ton: 'erreur' },
}

/** « il y a 3 jours » — sur une file, l'ancienneté compte plus que la date. */
function depuis(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'à l’instant'
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return `il y a ${j} jour${j > 1 ? 's' : ''}`
}

// ── Le dossier examiné ─────────────────────────────────────────────────────

function Dossier({ caseId, onDecide }: { caseId: string; onDecide: () => void }) {
  const [controlees, setControlees] = useState<Set<string>>(new Set())
  const [decision, setDecision] = useState<'VERIFIED' | 'REJECTED' | 'NEEDS_INFO'>('VERIFIED')
  const [motif, setMotif] = useState('')
  const [pieceVisee, setPieceVisee] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [apercu, setApercu] = useState<{ url: string; type: string; titre: string } | null>(null)
  const [ouverture, setOuverture] = useState<string | null>(null)

  const dossier = useQuery({ queryKey: ['admin-case', caseId], queryFn: () => api.adminCase(caseId), retry: false })
  const qc = useQueryClient()

  const prendre = useMutation({
    mutationFn: () => api.claimCase(caseId),
    onSuccess: () => {
      setErreur(null)
      void qc.invalidateQueries({ queryKey: ['admin-case', caseId] })
      onDecide()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const decider = useMutation({
    mutationFn: () =>
      api.decideCase(caseId, {
        decision,
        reasons: motif.trim(),
        ...(pieceVisee ? { documentId: pieceVisee } : {}),
      }),
    onSuccess: () => {
      setMotif('')
      setPieceVisee('')
      setErreur(null)
      void qc.invalidateQueries({ queryKey: ['admin-case', caseId] })
      onDecide()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const voir = async (id: string, titre: string) => {
    setOuverture(id)
    setErreur(null)
    try {
      const f = await api.adminDocumentUrl(caseId, id)
      setApercu({ ...f, titre })
    } catch (e) {
      setErreur(messageDe(e))
    } finally {
      setOuverture(null)
    }
  }

  const fermerApercu = () => {
    if (apercu) URL.revokeObjectURL(apercu.url)
    setApercu(null)
  }

  if (dossier.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Ouverture du dossier…
      </p>
    )
  }
  if (dossier.isError || !dossier.data) {
    return <Avis ton="erreur">Ce dossier n'a pas pu être ouvert. Réessayez dans un moment.</Avis>
  }

  const d = dossier.data
  const etat = ETATS[d.status]
  const enExamen = d.status === 'IN_REVIEW'
  const toutesControlees = d.documents.length > 0 && d.documents.every((x) => controlees.has(x.id))

  return (
    <div className="flex flex-col gap-4">
      <Carte icone={UserRound} titre={d.subjectName} sousTitre={`Déposé ${depuis(d.submittedAt)} · dossier ${d.caseId.slice(0, 8).toUpperCase()}`}>
        <p className="flex flex-wrap items-center gap-2">
          <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
          {d.agreementSignedAt ? <Pilule ton="succes">Contrat signé</Pilule> : null}
        </p>
        {d.missingDocuments.length > 0 ? (
          <Avis ton="alerte">
            {d.missingDocuments.length} pièce{d.missingDocuments.length > 1 ? 's' : ''} obligatoire
            {d.missingDocuments.length > 1 ? 's' : ''} manquante{d.missingDocuments.length > 1 ? 's' : ''} :{' '}
            {d.missingDocuments.map((k) => PIECES[k]).join(', ')}.
          </Avis>
        ) : null}
      </Carte>

      {!enExamen && d.status === 'SUBMITTED' ? (
        <Carte icone={ShieldCheck} titre="Prendre le dossier en charge" sousTitre="Il sera verrouillé pour les autres administrateurs">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Prenez-le en charge avant de décider. Sans cela, deux administrateurs pourraient l'examiner
            en même temps et rendre deux décisions contradictoires sur le même soignant.
          </p>
          <div>
            <Button type="button" onClick={() => prendre.mutate()} disabled={prendre.isPending}>
              {prendre.isPending ? 'Prise en charge…' : 'Prendre en charge'}
            </Button>
          </div>
        </Carte>
      ) : null}

      <Carte
        icone={FileText}
        titre="Pièces justificatives"
        sousTitre="Cochez ce que vous avez contrôlé — la coche vous suit pendant l'examen, elle n'est pas enregistrée"
      >
        {d.documents.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-[var(--texte-tertiaire)]">Aucune pièce déposée.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {d.documents.map((doc, i) => {
              const titre = PIECES[doc.kind]
              const numero = d.documents.filter((x) => x.kind === doc.kind).length > 1 ? ` (page ${i + 1})` : ''
              return (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <Checkbox
                    id={`ctrl-${doc.id}`}
                    checked={controlees.has(doc.id)}
                    onCheckedChange={(v) =>
                      setControlees((s) => {
                        const n = new Set(s)
                        if (v) n.add(doc.id)
                        else n.delete(doc.id)
                        return n
                      })
                    }
                  />
                  <Label htmlFor={`ctrl-${doc.id}`} className="min-w-0 flex-1 basis-40 cursor-pointer text-[13px] font-normal">
                    {titre}
                    {numero}
                    <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">Déposée le {dateFr(doc.createdAt)}</span>
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => voir(doc.id, titre)} disabled={ouverture === doc.id}>
                    {ouverture === doc.id ? 'Ouverture…' : 'Voir'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Carte>

      {d.decisions.length > 0 ? (
        <Carte icone={Clock} titre="Journal du dossier" sousTitre="Les décisions sont en insertion seule (RM-03-02)">
          <ul className="flex flex-col gap-2">
            {d.decisions.map((x) => (
              <li key={x.id} className="rounded-md border border-border bg-card px-3 py-2">
                <p className="flex flex-wrap items-center gap-2">
                  <Pilule ton={x.decision === 'VERIFIED' ? 'succes' : 'erreur'}>{ETATS[x.decision as VerificationStatus]?.libelle ?? x.decision}</Pilule>
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">{dateFr(x.decidedAt)}</span>
                  {x.documentKind ? <Pilule ton="alerte">{PIECES[x.documentKind]}</Pilule> : null}
                </p>
                <p className="mt-1 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">{x.reasons}</p>
              </li>
            ))}
          </ul>
        </Carte>
      ) : null}

      {enExamen ? (
        <Carte icone={Gavel} titre="Décision" sousTitre="Elle est définitive, motivée, et attribuée à votre compte">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 basis-48">
              <Label htmlFor="decision" className="mb-1.5 block text-[13px]">
                Décision
              </Label>
              <Liste
                id="decision"
                valeur={decision}
                onChange={setDecision}
                options={[
                  { cle: 'VERIFIED' as const, label: 'Vérifier', aide: 'Le soignant pourra exercer dès son contrat signé' },
                  { cle: 'NEEDS_INFO' as const, label: 'Demander un complément', aide: 'Le dossier revient au déposant, qui peut le corriger' },
                  { cle: 'REJECTED' as const, label: 'Refuser', aide: 'Le motif lui est transmis : il dit exactement quoi corriger' },
                ]}
              />
            </div>
            {decision !== 'VERIFIED' ? (
              <div className="min-w-0 flex-1 basis-48">
                <Label htmlFor="piece-visee" className="mb-1.5 block text-[13px]">
                  Pièce concernée
                </Label>
                {/*
                  Nommer la pièce transforme un refus en consigne. Sans elle, « copie non certifiée
                  conforme » laisse le soignant deviner laquelle de ses quatre pièces reprendre.
                */}
                <Liste
                  id="piece-visee"
                  valeur={pieceVisee}
                  onChange={setPieceVisee}
                  options={[
                    { cle: '', label: 'Le dossier dans son ensemble' },
                    ...d.documents.map((doc) => ({ cle: doc.id, label: PIECES[doc.kind] })),
                  ]}
                />
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="motif" className="mb-1.5 block text-[13px]">
              Motif transmis au demandeur
            </Label>
            <Textarea id="motif" rows={3} maxLength={2000} value={motif} onChange={(e) => setMotif(e.target.value)} />
            <p className="mt-1 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Le soignant lira ce texte tel quel. Un motif qui n'indique pas quoi corriger le renverra
              au support, et le dossier reviendra inchangé.
            </p>
          </div>

          {!toutesControlees && d.documents.length > 0 ? (
            <Avis ton="info">
              {controlees.size} pièce{controlees.size > 1 ? 's' : ''} contrôlée{controlees.size > 1 ? 's' : ''} sur{' '}
              {d.documents.length}. Rien ne vous en empêche, mais décider sans avoir tout ouvert engage votre compte.
            </Avis>
          ) : null}

          <div>
            <Button type="button" onClick={() => decider.mutate()} disabled={decider.isPending || motif.trim().length === 0}>
              {decider.isPending ? 'Enregistrement…' : 'Enregistrer la décision'}
            </Button>
          </div>
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
        </Carte>
      ) : null}

      {erreur && !enExamen ? <Avis ton="erreur">{erreur}</Avis> : null}

      {/* Même tiroir que « Ma vérification » : la liste reste visible pendant qu'on ouvre une pièce. */}
      <Sheet open={apercu !== null} onOpenChange={(v) => (v ? undefined : fermerApercu())}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="text-[15px]">{apercu?.titre}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-secondary p-4">
            {apercu ? (
              apercu.type.startsWith('image/') ? (
                <img src={apercu.url} alt={apercu.titre} className="mx-auto max-w-full rounded-md" />
              ) : (
                <iframe src={apercu.url} sandbox="" title={apercu.titre} className="h-full min-h-[70vh] w-full rounded-md border border-border bg-card" />
              )
            ) : null}
          </div>
          <SheetFooter className="flex-row justify-end border-t border-border">
            <SheetClose asChild>
              <Button type="button" size="sm">
                Fermer
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Les quatre tuiles de tête ──────────────────────────────────────────────

function Tuile({
  icone: Icone,
  intitule,
  valeur,
  detail,
  ton = 'neutre',
}: {
  icone: typeof Inbox
  intitule: string
  valeur: number
  detail: string
  ton?: 'neutre' | 'erreur'
}) {
  return (
    <div className="min-w-0 flex-1 basis-48 rounded-[10px] border border-border bg-card p-3.5">
      <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
        <Icone size={12} strokeWidth={1.9} aria-hidden="true" />
        {intitule}
      </p>
      <p
        className={
          'mt-1 font-[family-name:var(--font-display)] text-[26px] font-bold leading-none ' +
          (ton === 'erreur' && valeur > 0 ? 'text-[var(--erreur-texte)]' : 'text-foreground')
        }
      >
        {valeur}
      </p>
      <p className="mt-1.5 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{detail}</p>
    </div>
  )
}

/** « il y a 26 h » de retard, ou « 4 h » de marge — le délai restant, sur la cible du serveur. */
function delaiRestant(waitingSince: string, targetHours: number): { texte: string; depasse: boolean } {
  const ecouleH = (Date.now() - new Date(waitingSince).getTime()) / 3_600_000
  const resteH = targetHours - ecouleH
  const abs = Math.abs(resteH)
  const dit = abs >= 24 ? `${Math.floor(abs / 24)} j ${Math.round(abs % 24)} h` : `${Math.max(1, Math.round(abs))} h`
  return resteH < 0 ? { texte: `− ${dit}`, depasse: true } : { texte: dit, depasse: false }
}

type OngletFile = 'a-traiter' | 'hors-delai' | 'tranches' | 'tous'

// ── Écran ──────────────────────────────────────────────────────────────────

export function FileVerificationPage() {
  const [params, setParams] = useSearchParams()
  const choisi = params.get('dossier')
  const [onglet, setOnglet] = useState<OngletFile>('a-traiter')
  const qc = useQueryClient()

  /** La charge de travail : déposés et pris en charge. C'est le défaut du serveur. */
  const file = useQuery({ queryKey: ['verification-queue'], queryFn: () => api.verificationQueue(), retry: false })

  /**
   * Les dossiers déjà tranchés — deux appels, parce que la route ne filtre que sur UN statut.
   *
   * Ils ne servent qu'à l'onglet « Tranchés » et à sa tuile : c'est ce qui permet à un
   * administrateur de vérifier son propre travail de la semaine, ce que la file active ne montre
   * jamais.
   */
  const verifies = useQuery({
    queryKey: ['verification-queue', 'VERIFIED'],
    queryFn: () => api.verificationQueue('VERIFIED'),
    retry: false,
  })
  const refuses = useQuery({
    queryKey: ['verification-queue', 'REJECTED'],
    queryFn: () => api.verificationQueue('REJECTED'),
    retry: false,
  })

  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['verification-queue'] })
  }

  const actifs = file.data?.items ?? []
  const tranches = [...(verifies.data?.items ?? []), ...(refuses.data?.items ?? [])]
  const cible = file.data?.targetHours ?? 72

  const enAttente = actifs.filter((it) => it.status === 'SUBMITTED')
  const prisEnCharge = actifs.filter((it) => it.status === 'IN_REVIEW')
  const horsDelai = actifs.filter((it) => it.overdue)

  /**
   * Tranchés « cette semaine ».
   *
   * `waitingSince` est la date de dernière mise à jour du dossier ; pour un dossier décidé, c'est
   * la décision qui l'a écrite en dernier. L'approximation est assumée et bornée : elle ne sert
   * qu'à un compte indicatif, jamais à une décision.
   */
  const SEMAINE_MS = 7 * 24 * 3_600_000
  const tranchesRecents = tranches.filter((it) => Date.now() - new Date(it.waitingSince).getTime() < SEMAINE_MS)

  const visibles =
    onglet === 'a-traiter'
      ? actifs
      : onglet === 'hors-delai'
        ? horsDelai
        : onglet === 'tranches'
          ? tranches
          : [...actifs, ...tranches]

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Inbox size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            File de vérification
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {/*
              Le sous-titre ne compte QUE si le serveur a répondu. Tant qu'il n'a pas répondu — ou
              qu'il a échoué — il n'y a pas « 0 » : il n'y a pas de nombre. Écrire 0 en cas de panne
              disait « rien à traiter » à un administrateur dont la file était peut-être pleine.
              Constaté le 01/09/2026 pendant la relecture visuelle, en servant des 500 à l'écran.
            */}
            {file.isSuccess ? (
              <>
                {actifs.length} dossier{actifs.length > 1 ? 's' : ''} ouvert{actifs.length > 1 ? 's' : ''}
                {horsDelai.length > 0 ? ` · ${horsDelai.length} hors délai` : ''} · les plus anciens en tête
              </>
            ) : (
              <>Les plus anciens en tête</>
            )}
          </p>
        </span>
      </div>

      {file.isPending ? (
        <SqueletteTableau colonnes={7} lignes={4} libelle="Chargement de la file…" />
      ) : file.isError ? (
        <div className="mx-auto max-w-lg py-8">
          <Carte icone={AlertTriangle} titre="La file n'a pas pu être chargée" sousTitre="Aucune décision n'est enregistrable hors ligne">
            <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
              Une décision non journalisée serait invalide : elle doit être horodatée et attribuée à un
              administrateur nommé (RM-03-02). Rien ne se décide donc sans le serveur.
            </p>
            <div>
              <ActionApresEchec surReessayer={() => file.refetch()} />
            </div>
          </Carte>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Tuile icone={Inbox} intitule="En attente" valeur={enAttente.length} detail="Aucun administrateur assigné" />
            <Tuile
              icone={AlertTriangle}
              intitule="Hors délai"
              valeur={horsDelai.length}
              ton="erreur"
              /* Le seuil vient du serveur (PM-11) : aucun nombre d'heures n'est écrit ici. */
              detail={`Au-delà de ${cible} h · remontés en tête`}
            />
            <Tuile
              icone={ShieldCheck}
              intitule="Pris en charge"
              valeur={prisEnCharge.length}
              detail="Verrouillés par leur examinateur"
            />
            <Tuile
              icone={Gavel}
              intitule="Tranchés"
              valeur={tranchesRecents.length}
              detail="Sur sept jours · inscrits au journal"
            />
          </div>

          {horsDelai.length > 0 ? (
            <div className="mb-4">
              {/*
                « 72 heures OUVRÉES », dit la maquette. Le mot est faux : `m03.policies` compte des
                heures pleines et note lui-même que les heures ouvrées « seront affinées avec le
                modèle opérationnel ». Un dossier déposé vendredi soir est en retard le lundi, pas
                le mercredi — et l'annoncer autrement ferait attendre l'administration pour rien.
              */}
              <Avis ton="erreur">
                {`${horsDelai.length} dossier${horsDelai.length > 1 ? 's ont' : ' a'} dépassé le délai de ${cible} heures. Ils remontent en tête de file : la file est traitée du plus ancien au plus récent.`}
              </Avis>
            </div>
          ) : null}

          <div className="mb-4">
            <Segments
              label="Filtrer la file"
              valeur={onglet}
              onChange={setOnglet}
              options={[
                { cle: 'a-traiter', label: `À traiter ${actifs.length}` },
                { cle: 'hors-delai', label: `Hors délai ${horsDelai.length}` },
                { cle: 'tranches', label: `Tranchés ${tranches.length}` },
                { cle: 'tous', label: `Tous ${actifs.length + tranches.length}` },
              ]}
            />
          </div>

          {visibles.length === 0 ? (
            <Carte icone={Inbox} titre="Aucun dossier" sousTitre={onglet === 'a-traiter' ? 'La file est à jour' : 'Rien dans cette vue'}>
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                {onglet === 'a-traiter'
                  ? 'Tous les dossiers déposés ont été traités. Les nouveaux arrivent ici dès leur dépôt.'
                  : 'Changez de vue pour retrouver les autres dossiers.'}
              </p>
            </Carte>
          ) : (
            /* Une file se lit en colonnes : on y compare des délais, on n'y fait pas défiler des
               fiches. Sous 1024 px la comparaison n'est plus possible de toute façon — chaque ligne
               devient une carte (`ul-tableau-cartes`, globals.css), au lieu de cacher 529 px. */
            <div className="ul-tableau-defilant overflow-x-auto rounded-[10px] border border-border">
              <table role="table" className="ul-tableau-cartes w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr role="row" className="border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)]">
                    {['Dossier', 'Demandeur', 'Type', 'Pièces', 'Statut', 'Délai', ''].map((t, i) => (
                      <th
                        key={t || `action-${i}`}
                        role="columnheader"
                        scope="col"
                        className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]"
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((it) => {
                    const etat = ETATS[it.status]
                    const delai = delaiRestant(it.waitingSince, cible)
                    const clos = it.status === 'VERIFIED' || it.status === 'REJECTED' || it.status === 'REVOKED'
                    return (
                      <tr role="row" key={it.caseId} className="border-b border-border align-top last:border-b-0">
                        <td role="cell" data-libelle="Dossier" className="px-3 py-3 whitespace-nowrap">
                          {/*
                            « DOS-2026-00341 » n'existe pas : les identifiants sont des UUID. On en
                            montre le début, qui suffit à désigner un dossier sans l'inventer.
                          */}
                          <span className="block font-mono text-[12px] text-foreground">
                            {it.caseId.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="block text-[11px] text-[var(--texte-tertiaire)]">{depuis(it.waitingSince)}</span>
                        </td>

                        <td role="cell" data-libelle="Demandeur" className="px-3 py-3">
                          <span className="block text-[13px] font-medium text-foreground">{it.subjectName}</span>
                          <span className="block font-mono text-[11px] text-[var(--texte-tertiaire)]">{it.subject}</span>
                        </td>

                        <td role="cell" data-libelle="Type" className="px-3 py-3 whitespace-nowrap text-[13px] text-[var(--texte-secondaire)]">
                          {it.subjectKind === 'PROFESSIONAL' ? 'Soignant' : 'Structure'}
                        </td>

                        <td role="cell" data-libelle="Pièces" className="px-3 py-3 whitespace-nowrap text-[13px] text-[var(--texte-secondaire)]">
                          {/*
                            La maquette écrit « 4 / 4 ». Le total exigé dépend du type de sujet et
                            n'est PAS servi par la file — l'inventer ici serait recopier une règle
                            que le serveur seul applique. On dit ce qu'on sait : combien il y en a.
                          */}
                          {it.documentCount} pièce{it.documentCount > 1 ? 's' : ''}
                        </td>

                        <td role="cell" data-libelle="Statut" className="px-3 py-3">
                          {/* Deux seuils distincts (EF-03-03) : cible dépassée, puis escalade. */}
                          {it.overdue ? (
                            <Pilule ton="erreur">Hors délai</Pilule>
                          ) : it.overdueTarget ? (
                            <Pilule ton="alerte">En retard</Pilule>
                          ) : (
                            <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
                          )}
                        </td>

                        <td role="cell" data-libelle="Délai" className="px-3 py-3 whitespace-nowrap">
                          {clos ? (
                            <span className="text-[12px] text-[var(--texte-tertiaire)]">—</span>
                          ) : (
                            <>
                              <span
                                className={
                                  'block text-[13px] font-medium tabular-nums ' +
                                  (delai.depasse ? 'text-[var(--erreur-texte)]' : 'text-foreground')
                                }
                              >
                                {delai.texte}
                              </span>
                              <span className="block text-[11px] text-[var(--texte-tertiaire)]">
                                {delai.depasse ? 'hors délai' : `sur ${cible} h`}
                              </span>
                            </>
                          )}
                        </td>

                        <td role="cell" data-libelle="" className="px-3 py-3 whitespace-nowrap text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={it.overdue ? 'default' : 'outline'}
                            onClick={() => setParams({ dossier: it.caseId }, { replace: true })}
                          >
                            {it.status === 'IN_REVIEW' ? 'Poursuivre' : clos ? 'Revoir' : 'Examiner'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] text-[var(--texte-tertiaire)]">
            {visibles.length} dossier{visibles.length > 1 ? 's' : ''} affiché{visibles.length > 1 ? 's' : ''} · triés du
            plus ancien au plus récent
          </p>
        </>
      )}

      {/*
        Le dossier s'ouvre en panneau, pas en colonne : l'examen demande de la place — pièces à
        ouvrir, motif à écrire — et la file doit rester derrière, pour qu'on sache ce qui attend.
      */}
      <Sheet open={!!choisi} onOpenChange={(o) => !o && setParams({}, { replace: true })}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Examen du dossier</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {choisi ? <Dossier caseId={choisi} onDecide={rafraichir} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
