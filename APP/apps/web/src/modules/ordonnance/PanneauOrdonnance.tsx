/**
 * C7 — Ordonnance. **Écran neuf : aucune maquette n'existe pour lui.**
 *
 * D'après le cahier M09 (EF-09-01 à EF-09-05, CU-09-01, CU-09-04) et l'écran mobile
 * `apps/mobile/src/screens/OrdonnanceScreen.tsx`, qui montre le côté patient de la même ordonnance.
 *
 * ── Pourquoi un panneau, et pas une page ───────────────────────────────────────────────────────
 *
 * On ne prescrit QUE depuis une session active (RM-09-01, D-014), et le décompteur tourne pendant
 * qu'on écrit. Envoyer le médecin sur une autre page, c'est lui faire perdre le fil au sens propre :
 * il ne voit plus ce que le patient écrit, et il revient sans savoir combien de temps il a perdu.
 * Le panneau glisse par-dessus, le fil reste derrière, le minuteur reste visible.
 *
 * ── Les trois choses que cet écran doit dire, et qu'il serait facile de taire ───────────────────
 *
 * 1. **Le scellement est définitif** (EF-09-04, RM-09-05). Une fois envoyée, l'ordonnance ne se
 *    modifie plus — jamais, par personne. La seule issue après une erreur est de l'annuler avec un
 *    motif et d'en rédiger une autre. C'est dit AVANT le bouton, pas après.
 * 2. **Le garde-fou allergies ne couvre pas tout** (EF-09-02, EF-09-03). Il ne regarde que les
 *    lignes du référentiel : une ligne en texte libre n'est vérifiée par personne. Et la
 *    comparaison se fait par ressemblance de noms — utile, pas exhaustive. Un médecin qui croit
 *    l'écran infaillible est plus dangereux qu'un médecin sans garde-fou.
 * 3. **Le passage outre est tracé** (EF-09-03). Le motif n'est pas une formalité : il est enregistré
 *    au journal d'audit, avec le nom du médicament et celui de l'allergie.
 *
 * ── Ce que l'écran ne calcule pas ──────────────────────────────────────────────────────────────
 *
 * La durée de validité (PM-10) n'apparaît nulle part dans ce fichier. Le serveur renvoie `expiresAt`
 * et l'écran affiche cette date. Si le super-administrateur change PM-10 dans E3, l'affichage suit —
 * c'est la même règle que le compte-rendu de C5, et pour la même raison.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  AlertTriangle,
  Check,
  FileWarning,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { SqueletteLignes } from '@/components/ulamu/Squelette'
import {
  api,
  ApiError,
  estAlerteAllergie,
  type AllergyConflict,
  type Medicament,
  type Prescription,
} from '@/lib/api'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const ETATS: Record<Prescription['status'], { libelle: string; ton: TonPilule }> = {
  ACTIVE: { libelle: 'Active', ton: 'succes' },
  PARTIALLY_DISPENSED: { libelle: 'Partiellement délivrée', ton: 'info' },
  DISPENSED: { libelle: 'Délivrée', ton: 'neutre' },
  CANCELLED: { libelle: 'Annulée', ton: 'erreur' },
  EXPIRED: { libelle: 'Expirée', ton: 'alerte' },
}

/** Le nom lisible d'un médicament du référentiel : DCI, dosage, forme. */
const libelleMedicament = (m: Medicament) =>
  [m.dci, m.dosage, m.form ? `(${m.form})` : null].filter(Boolean).join(' ')

/** Une ligne en cours de rédaction. `medicament` renseigné ⇒ ligne référentielle (EF-09-02). */
interface LigneBrouillon {
  cle: string
  medicament: Medicament | null
  /** Renseigné seulement pour une ligne HORS référentiel — sans garde-fou automatique. */
  texteLibre: string
  posologie: string
  dureeJours: string
  quantite: string
}

const ligneVide = (): LigneBrouillon => ({
  cle: crypto.randomUUID(),
  medicament: null,
  texteLibre: '',
  posologie: '',
  dureeJours: '',
  quantite: '1',
})

// ── Le choix du médicament ─────────────────────────────────────────────────

/**
 * Recherche au référentiel (EF-09-02). Le serveur exige deux caractères — en dessous il renvoie une
 * liste vide, ce qui ressemblerait à « aucun résultat » : l'écran le dit plutôt que de laisser
 * croire à un référentiel vide.
 */
function ChoixMedicament({
  valeur,
  onChoisir,
  onTexteLibre,
}: {
  valeur: Medicament | null
  onChoisir: (m: Medicament) => void
  onTexteLibre: () => void
}) {
  const [terme, setTerme] = useState('')
  const [terme300, setTerme300] = useState('')

  // 300 ms : on ne lance pas une requête par frappe. Le référentiel ne bouge pas pendant une séance.
  useEffect(() => {
    const id = setTimeout(() => setTerme300(terme), 300)
    return () => clearTimeout(id)
  }, [terme])

  const resultats = useQuery({
    queryKey: ['medicaments', terme300],
    queryFn: () => api.searchMedicaments(terme300),
    enabled: terme300.trim().length >= 2,
    retry: false,
    staleTime: 10 * 60_000,
  })

  if (valeur) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--succes-bordure)] bg-[var(--succes-fond)] px-2.5 py-2">
        <Pill size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[var(--succes-texte)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-foreground">{libelleMedicament(valeur)}</span>
          {valeur.commercialNames.length > 0 ? (
            <span className="block truncate text-[11px] text-[var(--texte-tertiaire)]">
              aussi appelé {valeur.commercialNames.join(', ')}
            </span>
          ) : null}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--texte-tertiaire)]"
        />
        <Input
          aria-label="Chercher un médicament"
          placeholder="Nom ou molécule — « para », « coartem »…"
          className="pl-8"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
        />
      </div>

      {terme.trim().length > 0 && terme.trim().length < 2 ? (
        <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">Encore une lettre — la recherche démarre à deux.</p>
      ) : null}

      {resultats.isFetching ? (
        <SqueletteLignes nombre={3} libelle="Recherche au référentiel…" className="mt-1.5" />
      ) : null}

      {resultats.data && resultats.data.items.length > 0 ? (
        <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-border">
          {resultats.data.items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onChoisir(m)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-2.5 py-1.5 text-left last:border-b-0 hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span className="text-[13px] text-foreground">{libelleMedicament(m)}</span>
                {m.commercialNames.length > 0 ? (
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">{m.commercialNames.join(', ')}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {resultats.data && resultats.data.items.length === 0 && terme300.trim().length >= 2 ? (
        <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">
          Aucun médicament de ce nom au référentiel.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onTexteLibre}
        className="mt-1.5 text-[11px] text-[var(--ap-600)] underline underline-offset-2 hover:text-[var(--ap-700)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Prescrire hors référentiel
      </button>
    </div>
  )
}

// ── Une ligne de l'ordonnance en cours ─────────────────────────────────────

function LigneEnCours({
  ligne,
  index,
  supprimable,
  onChanger,
  onSupprimer,
}: {
  ligne: LigneBrouillon
  index: number
  supprimable: boolean
  onChanger: (l: LigneBrouillon) => void
  onSupprimer: () => void
}) {
  const horsReferentiel = ligne.medicament === null && ligne.texteLibre !== ''
  const id = (champ: string) => `ligne-${ligne.cle}-${champ}`

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
          Ligne {index + 1}
        </span>
        {supprimable ? (
          <button
            type="button"
            onClick={onSupprimer}
            aria-label={`Retirer la ligne ${index + 1}`}
            className="rounded p-0.5 text-[var(--texte-tertiaire)] hover:text-[var(--erreur-texte)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <Trash2 size={13} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {horsReferentiel ? (
        <div>
          <Label htmlFor={id('libre')} className="mb-1.5 block text-[13px]">
            Médicament (hors référentiel)
          </Label>
          <Input
            id={id('libre')}
            maxLength={300}
            value={ligne.texteLibre}
            placeholder="Nom exact tel qu'il doit être délivré"
            onChange={(e) => onChanger({ ...ligne, texteLibre: e.target.value })}
          />
          {/*
            EF-09-02 : une ligne hors référentiel est acceptée, mais AUCUN garde-fou ne la relit.
            Le dire sur la ligne elle-même, et pas seulement en tête de panneau — c'est ici que le
            médecin décide.
          */}
          <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-[1.45] text-[var(--alerte-texte)]">
            <FileWarning size={12} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
            Non vérifié : le contrôle des allergies ne s'applique pas à cette ligne.
          </p>
          <button
            type="button"
            onClick={() => onChanger({ ...ligne, texteLibre: '' })}
            className="mt-1 text-[11px] text-[var(--ap-600)] underline underline-offset-2 hover:text-[var(--ap-700)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            Revenir au référentiel
          </button>
        </div>
      ) : (
        <div>
          <span className="mb-1.5 block text-[13px] font-medium">Médicament</span>
          <ChoixMedicament
            valeur={ligne.medicament}
            onChoisir={(m) => onChanger({ ...ligne, medicament: m, texteLibre: '' })}
            // Un espace : c'est ce qui bascule la ligne en mode texte libre sans rien préremplir.
            onTexteLibre={() => onChanger({ ...ligne, medicament: null, texteLibre: ' ' })}
          />
          {ligne.medicament ? (
            <button
              type="button"
              onClick={() => onChanger({ ...ligne, medicament: null })}
              className="mt-1 text-[11px] text-[var(--ap-600)] underline underline-offset-2 hover:text-[var(--ap-700)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              Choisir un autre médicament
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-2.5">
        <Label htmlFor={id('posologie')} className="mb-1.5 block text-[13px]">
          Posologie
        </Label>
        <Textarea
          id={id('posologie')}
          rows={2}
          maxLength={300}
          value={ligne.posologie}
          placeholder="Ex : 1 comprimé matin et soir, pendant les repas"
          className="resize-none"
          onChange={(e) => onChanger({ ...ligne, posologie: e.target.value })}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div>
          <Label htmlFor={id('duree')} className="mb-1.5 block text-[13px]">
            Durée (jours)
          </Label>
          <Input
            id={id('duree')}
            type="number"
            min={1}
            inputMode="numeric"
            value={ligne.dureeJours}
            placeholder="facultatif"
            onChange={(e) => onChanger({ ...ligne, dureeJours: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={id('quantite')} className="mb-1.5 block text-[13px]">
            Quantité à délivrer
          </Label>
          <Input
            id={id('quantite')}
            type="number"
            min={1}
            inputMode="numeric"
            value={ligne.quantite}
            onChange={(e) => onChanger({ ...ligne, quantite: e.target.value })}
          />
        </div>
      </div>
    </li>
  )
}

// ── Le garde-fou allergies ─────────────────────────────────────────────────

/**
 * L'alerte du garde-fou (EF-09-03) : bloquante, mais pas un verrou.
 *
 * Deux issues seulement, et elles sont toutes les deux explicites : retirer le médicament, ou le
 * prescrire quand même avec un motif. Le motif est OBLIGATOIRE parce qu'il est tracé — on
 * n'enregistre pas un « oui » sans savoir pourquoi.
 */
function AlerteAllergie({
  conflit,
  motif,
  onMotif,
  onRetirer,
}: {
  conflit: AllergyConflict
  motif: string
  onMotif: (v: string) => void
  onRetirer: () => void
}) {
  const idMotif = `motif-${conflit.medicamentId}`
  return (
    <li className="rounded-lg border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] p-3">
      <p className="flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--erreur-texte)]">
        <ShieldAlert size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
        <span>
          <strong className="font-semibold">{conflit.medicamentLabel}</strong> heurte une allergie
          déclarée au Carnet : <strong className="font-semibold">{conflit.allergies.join(', ')}</strong>.
        </span>
      </p>

      <div className="mt-2.5">
        <Label htmlFor={idMotif} className="mb-1.5 block text-[12px]">
          Motif de la prescription malgré l'alerte
        </Label>
        <Textarea
          id={idMotif}
          rows={2}
          maxLength={500}
          value={motif}
          placeholder="Ex : allergie ancienne, réintroduction sous surveillance"
          className="resize-none bg-card"
          onChange={(e) => onMotif(e.target.value)}
        />
        <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-secondaire)]">
          Ce motif est enregistré au journal, avec le nom du médicament et celui de l'allergie.
        </p>
      </div>

      <div className="mt-2">
        <Button type="button" size="sm" variant="outline" onClick={onRetirer}>
          <X size={13} strokeWidth={1.9} aria-hidden="true" />
          Retirer ce médicament
        </Button>
      </div>
    </li>
  )
}

// ── L'ordonnance scellée ───────────────────────────────────────────────────

/** Le QR, fabriqué SUR LE POSTE : le jeton ne part vers aucun service extérieur. */
function CodeQR({ jeton }: { jeton: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    void QRCode.toDataURL(jeton, { margin: 1, width: 176 }).then((u) => vivant && setUrl(u))
    return () => {
      vivant = false
    }
  }, [jeton])

  if (!url) return <span className="block size-44 animate-pulse rounded-md bg-secondary" />
  return (
    <img
      src={url}
      alt="Sceau de l’ordonnance"
      className="size-44 rounded-md border border-border bg-white p-1"
    />
  )
}

function OrdonnanceScellee({ ordonnance, onAnnulee }: { ordonnance: Prescription; onAnnulee: () => void }) {
  const [motif, setMotif] = useState('')
  const [demandeAnnulation, setDemandeAnnulation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const etat = ETATS[ordonnance.status]

  const annuler = useMutation({
    mutationFn: () => api.cancelPrescription(ordonnance.id, motif.trim()),
    onSuccess: onAnnulee,
    onError: (e) => setErreur(messageDe(e)),
  })

  const annulable = ordonnance.status === 'ACTIVE' || ordonnance.status === 'PARTIALLY_DISPENSED'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
        <span className="text-[12px] text-[var(--texte-tertiaire)]">
          Rédigée le {new Date(ordonnance.createdAt).toLocaleString('fr-FR')}
        </span>
      </div>

      {ordonnance.qrToken ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/40 p-4">
          <CodeQR jeton={ordonnance.qrToken} />
          <p className="text-center text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
            {/*
              02/09/2026 (chantier 27) — cette phrase disait « Le patient présente ce code en
              pharmacie ». Elle est devenue fausse le jour même : la chaîne du médicament est sortie
              du produit (D-052), aucune officine n'est reliée à ULAMU, et plus rien ne lit ce code.

              L'y laisser aurait envoyé un patient tendre son téléphone à un comptoir où on lui
              aurait répondu qu'on ne scanne pas ça — et il aurait cru son ordonnance invalide. Le
              médecin, lui, aurait cru avoir transmis quelque chose.

              Ce que le code EST encore : le sceau qui prouve que l'ordonnance n'a pas été modifiée
              depuis sa signature. Ce qu'il n'est plus : un moyen de retirer des médicaments.
            */}
            Ce code scelle l'ordonnance : il prouve qu'elle n'a pas été modifiée depuis votre
            signature. Il ne sert pas à la délivrance — ULAMU n'est relié à aucune officine. Le
            patient la retrouve dans son application et la présente comme une ordonnance papier.
          </p>
          {/* L'échéance vient du serveur (PM-10) : aucun nombre de jours n'est écrit ici. */}
          <p className="text-[12px] font-medium text-foreground">
            Valable jusqu'au {new Date(ordonnance.expiresAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      ) : (
        <Avis ton="alerte">
          {/*
            02/09/2026 (chantier 29) — disait « son code a été rendu inerte ». C'était MON
            incohérence : le chantier 27, deux panneaux plus haut, venait de redéfinir ce code comme
            un SCEAU qui ne sert pas à la délivrance. Annoncer sa mise hors service comme la
            conséquence d'une annulation le redonnait pour un ticket.

            Ce qui compte pour un médecin qui annule : l'ordonnance ne doit plus être suivie, et
            c'est au patient de le savoir.
          */}
          Cette ordonnance est annulée : elle ne doit plus être suivie
          {ordonnance.cancelReason ? ` (${ordonnance.cancelReason})` : ''}. Le patient en est
          informé — prévenez-le aussi de vive voix s'il a déjà pu la présenter.
        </Avis>
      )}

      <ul className="flex flex-col gap-2">
        {ordonnance.lines.map((l, i) => (
          <li key={l.id} className="rounded-lg border border-border p-2.5">
            <p className="text-[13px] font-medium text-foreground">
              {l.medicationName ?? l.freeText ?? `Ligne ${i + 1}`}
              {l.medicationName === null ? (
                <span className="ml-1.5 text-[11px] font-normal text-[var(--alerte-texte)]">hors référentiel</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[12px] leading-[1.5] whitespace-pre-wrap text-[var(--texte-secondaire)]">
              {l.posology}
            </p>
            <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
              {l.qtyPrescribed} à délivrer
              {l.durationDays ? ` · ${l.durationDays} jour${l.durationDays > 1 ? 's' : ''}` : ''}
              {l.qtyDispensed > 0 ? ` · ${l.qtyDispensed} déjà délivré${l.qtyDispensed > 1 ? 's' : ''}` : ''}
            </p>
          </li>
        ))}
      </ul>

      {annulable ? (
        <div className="rounded-lg border border-border p-3">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Une ordonnance scellée ne se modifie pas (RM-09-05). En cas d'erreur, annulez-la — son
            code devient inerte définitivement — et rédigez-en une nouvelle.
          </p>
          {demandeAnnulation ? (
            <div className="mt-2.5">
              <Label htmlFor="motif-annulation" className="mb-1.5 block text-[13px]">
                Motif de l'annulation
              </Label>
              <Textarea
                id="motif-annulation"
                rows={2}
                maxLength={500}
                value={motif}
                placeholder="Ex : erreur de dosage"
                className="resize-none"
                onChange={(e) => setMotif(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => annuler.mutate()}
                  disabled={annuler.isPending || motif.trim().length === 0}
                >
                  {annuler.isPending ? 'Annulation…' : "Confirmer l'annulation"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setDemandeAnnulation(false)}>
                  Renoncer
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDemandeAnnulation(true)}>
                Annuler cette ordonnance
              </Button>
            </div>
          )}
          {erreur ? <div className="mt-2"><Avis ton="erreur">{erreur}</Avis></div> : null}
        </div>
      ) : null}
    </div>
  )
}

// ── Le panneau ─────────────────────────────────────────────────────────────

export function PanneauOrdonnance({ sessionId, active }: { sessionId: string; active: boolean }) {
  const qc = useQueryClient()
  const [ouvert, setOuvert] = useState(false)
  const [lignes, setLignes] = useState<LigneBrouillon[]>(() => [ligneVide()])
  const [conflits, setConflits] = useState<AllergyConflict[]>([])
  const [motifs, setMotifs] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<string | null>(null)

  /**
   * Les ordonnances déjà prescrites, filtrées sur CETTE séance. `myPrescribed` sert le prescripteur
   * (la route `me` sert le patient — un médecin qui l'appelait récupérait ses propres ordonnances
   * en tant que patient, c'est-à-dire rien).
   */
  const prescrites = useQuery({
    queryKey: ['prescriptions', 'prescribed'],
    queryFn: () => api.myPrescribed(),
    retry: false,
    staleTime: 60_000,
  })

  const deLaSeance = useMemo(
    () => (prescrites.data?.items ?? []).filter((p) => p.sessionId === sessionId),
    [prescrites.data, sessionId],
  )

  const sceller = useMutation({
    mutationFn: () => {
      const payload = {
        lines: lignes.map((l) => ({
          ...(l.medicament ? { medicamentId: l.medicament.id } : { freeText: l.texteLibre.trim() }),
          posology: l.posologie.trim(),
          ...(l.dureeJours.trim() ? { durationDays: Number(l.dureeJours) } : {}),
          qtyPrescribed: Number(l.quantite),
        })),
        // Seuls les conflits effectivement motivés partent : un motif vide n'est pas un accord.
        overrides: conflits
          .filter((c) => (motifs[c.medicamentId] ?? '').trim().length > 0)
          .map((c) => ({ medicamentId: c.medicamentId, reason: motifs[c.medicamentId].trim() })),
      }
      return api.createPrescription(sessionId, payload)
    },
    onSuccess: () => {
      setLignes([ligneVide()])
      setConflits([])
      setMotifs({})
      setErreur(null)
      void qc.invalidateQueries({ queryKey: ['prescriptions', 'prescribed'] })
    },
    onError: (e) => {
      // EF-09-03 : le 409 du garde-fou n'est pas une panne, c'est une étape. On affiche les
      // conflits et on attend une décision, au lieu de renvoyer un message d'erreur opaque.
      if (e instanceof ApiError && estAlerteAllergie(e.details)) {
        setConflits(e.details.conflicts)
        setErreur(null)
        return
      }
      setConflits([])
      setErreur(messageDe(e))
    },
  })

  const retirerMedicament = (medicamentId: string) => {
    setLignes((ls) => {
      const restantes = ls.filter((l) => l.medicament?.id !== medicamentId)
      return restantes.length > 0 ? restantes : [ligneVide()]
    })
    setConflits((cs) => cs.filter((c) => c.medicamentId !== medicamentId))
  }

  const ligneComplete = (l: LigneBrouillon) =>
    (l.medicament !== null || l.texteLibre.trim().length > 0) &&
    l.posologie.trim().length > 0 &&
    Number(l.quantite) >= 1

  const pretASceller = lignes.length > 0 && lignes.every(ligneComplete)
  // Chaque conflit doit être tranché : soit le médicament est retiré, soit son motif est écrit.
  const conflitsEnAttente = conflits.filter((c) => (motifs[c.medicamentId] ?? '').trim().length === 0)

  return (
    <>
      <Carte
        icone={Pill}
        titre="Ordonnance"
        sousTitre={active ? 'Rédigeable pendant la consultation' : "La prescription est fermée avec la séance"}
      >
        {deLaSeance.length > 0 ? (
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            {deLaSeance.length === 1
              ? 'Une ordonnance a été scellée pour cette consultation.'
              : `${deLaSeance.length} ordonnances ont été scellées pour cette consultation.`}
          </p>
        ) : active ? (
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Aucune ligne prescrite. Vous ne pourrez plus prescrire une fois la séance terminée
            (RM-09-01).
          </p>
        ) : (
          <p className="text-[12px] leading-[1.55] text-[var(--texte-tertiaire)]">
            Aucune ordonnance n'a été rédigée pendant cette consultation.
          </p>
        )}

        {active || deLaSeance.length > 0 ? (
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => setOuvert(true)}>
              {deLaSeance.length > 0 && !active ? "Revoir l'ordonnance" : "Rédiger l'ordonnance"}
            </Button>
          </div>
        ) : null}
      </Carte>

      <Sheet open={ouvert} onOpenChange={setOuvert}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Ordonnance</SheetTitle>
            <SheetDescription>
              Le fil de la consultation reste ouvert derrière ce panneau — le minuteur continue.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4">
            {deLaSeance.map((o) => (
              <OrdonnanceScellee
                key={o.id}
                ordonnance={o}
                onAnnulee={() => void qc.invalidateQueries({ queryKey: ['prescriptions', 'prescribed'] })}
              />
            ))}

            {!active ? (
              <Avis ton="info">
                On ne prescrit que depuis une séance active (RM-09-01, D-014). Cette consultation est
                close : l'ordonnance ci-dessus reste consultable, mais aucune nouvelle ne peut être
                rédigée.
              </Avis>
            ) : (
              <>
                {deLaSeance.length > 0 ? <div className="h-px bg-border" /> : null}

                {/*
                  La limite du garde-fou, dite une fois en tête et rappelée sur chaque ligne libre.
                  Elle est permanente : ce n'est pas un avertissement qu'on ferme.
                */}
                <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/50 p-2.5 text-[11px] leading-[1.5] text-[var(--texte-secondaire)]">
                  <AlertTriangle size={13} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                  <span>
                    Le contrôle des allergies ne porte que sur les médicaments du référentiel, et
                    compare des noms : il est utile, il n'est pas exhaustif. Une ligne hors
                    référentiel n'est vérifiée par personne.
                  </span>
                </p>

                <ul className="flex flex-col gap-3">
                  {lignes.map((l, i) => (
                    <LigneEnCours
                      key={l.cle}
                      ligne={l}
                      index={i}
                      supprimable={lignes.length > 1}
                      onChanger={(maj) => setLignes((ls) => ls.map((x) => (x.cle === l.cle ? maj : x)))}
                      onSupprimer={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
                    />
                  ))}
                </ul>

                <div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLignes((ls) => [...ls, ligneVide()])}>
                    <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                    Ajouter une ligne
                  </Button>
                </div>

                {conflits.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-[var(--erreur-texte)]">
                      Alerte allergie — {conflits.length === 1 ? 'un médicament' : `${conflits.length} médicaments`} à
                      trancher
                    </p>
                    <ul className="flex flex-col gap-2">
                      {conflits.map((c) => (
                        <AlerteAllergie
                          key={c.medicamentId}
                          conflit={c}
                          motif={motifs[c.medicamentId] ?? ''}
                          onMotif={(v) => setMotifs((m) => ({ ...m, [c.medicamentId]: v }))}
                          onRetirer={() => retirerMedicament(c.medicamentId)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/*
                  RM-09-05 : l'avertissement d'immuabilité arrive AVANT le bouton. Après, il ne
                  servirait plus qu'à expliquer un regret.
                */}
                <Avis ton="alerte">
                  Une fois envoyée, l'ordonnance est scellée : ni vous ni personne ne pourra la
                  modifier. La seule issue en cas d'erreur est de l'annuler avec un motif et d'en
                  rédiger une autre.
                </Avis>

                {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

                <div>
                  <Button
                    type="button"
                    onClick={() => sceller.mutate()}
                    disabled={sceller.isPending || !pretASceller || conflitsEnAttente.length > 0}
                  >
                    {sceller.isPending ? (
                      <>
                        <Spinner className="size-4" /> Scellement…
                      </>
                    ) : (
                      <>
                        <Check size={15} strokeWidth={2} aria-hidden="true" />
                        Sceller l'ordonnance
                      </>
                    )}
                  </Button>
                  {!pretASceller ? (
                    <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                      Chaque ligne demande un médicament, une posologie et une quantité.
                    </p>
                  ) : conflitsEnAttente.length > 0 ? (
                    <p className="mt-1 text-[11px] text-[var(--erreur-texte)]">
                      Retirez le médicament en cause, ou écrivez le motif qui justifie de le
                      prescrire malgré l'alerte.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
