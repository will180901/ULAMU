/**
 * C2 — Ma vitrine. D'après `docs/maquettes/C2 - Ma vitrine.dc.html`, **affichée** le 27/08/2026.
 *
 * ── Pourquoi ce fichier a été réécrit ──────────────────────────────────────────────────────────
 *
 * La version précédente avait raison sur les FAITS — elle avait retiré les langues, les lieux et les
 * « vues de fiche » inventées, et pour les bonnes raisons. Mais elle disait aussi d'elle-même :
 * « largement repensé… ce n'est pas un formulaire, c'est un miroir de concurrence… aucun bouton
 * Publier… l'aperçu montre la LISTE, pas une fiche isolée ».
 *
 * C'est précisément ce que le porteur a refusé le 25/08. **La maquette décide de la FORME**, le
 * cahier décide des faits. On restaure donc la forme mesurée sur la maquette — deux colonnes,
 * 968 px d'édition et un rail d'aperçu de 320 px — et on garde les faits corrigés.
 *
 * Sont donc partis avec la refonte : la liste de confrères en guise d'aperçu, le repère de marché
 * (aucun équivalent dans la maquette), et le réglage de présence — qui vit désormais dans la barre
 * du haut, où l'alignement l'a placé (famille 4, point 5).
 *
 * ── Les blocs, et leur sort ────────────────────────────────────────────────────────────────────
 *
 * • **Identité professionnelle** — gardée. Nom et spécialité en lecture seule (arbitrage porteur du
 *   27/08 : le Badge Vérifié atteste d'une qualification contrôlée par pièces ; la laisser modifier
 *   librement ferait mentir le badge). La route serveur reste ouverte — dette signalée au plan.
 * • **Langues de consultation** — retirée. D-005 / PM-15 : français uniquement.
 * • **Lieux de consultation** (cabinets, adresses, horaires) — retirée. La fiche d'un professionnel
 *   ne porte qu'un seul champ géographique, `district`, et EF-05-01 n'en connaît pas d'autre.
 * • **Tarifs affichés** — refondue en « Mes offres ». La maquette propose trois MODES fixes
 *   (téléconsultation / cabinet / créneau prioritaire) ; le modèle serveur n'a pas de modes, mais
 *   des offres libres : libellé, durée, prix, type standard ou suivi. Le « créneau prioritaire »
 *   promettait en plus une « réponse garantie sous 2 heures » qui n'engage personne.
 * • **Aperçu patient** — gardé, en rail de 320 px comme mesuré.
 * • **« Prêt à publier »** (4 contrôles inventés) — remplacée par la vraie règle : RM-05-01, vérifié
 *   ET sous contrat signé. On peut soigner chaque mot et n'apparaître nulle part.
 * • **« Visibilité »** — les 318 vues de fiche ne sont comptées NULLE PART. Les deux autres chiffres
 *   existent : « demandes reçues » et le taux de confirmation. Le bloc devient « Ce que les patients
 *   voient » (famille 4, point 7), alimenté par la VRAIE route publique — **et il reste dans le rail
 *   de droite**, là où la maquette le pose. Il avait d'abord été déplacé à gauche par confort de
 *   lecture ; c'était une raison, pas un fait, et la règle ne l'autorisait pas. Remis le 27/08.
 *
 * ── Deux principes tenus ───────────────────────────────────────────────────────────────────────
 *
 * **Aucun chiffre métier n'est écrit ici.** Le taux de commission vient du contrat signé
 * (`agreement.commissionPct`) — deux médecins peuvent avoir deux taux. Les bornes d'une offre
 * viennent de `GET /v1/offers/limits` (PM-09 / PM-06 / PM-25), ajouté le 27/08 pour cette raison.
 *
 * **Aucun bouton « Publier ».** `PATCH /v1/me/professional-profile` publie immédiatement : il n'y a
 * pas d'état de brouillon à représenter. En inventer un ajouterait la seule question qu'on veut
 * éviter — « ai-je publié ? ». L'enregistrement se fait après la frappe et l'écran dit où il en est.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Camera, Check, Eye, Loader2, Plus, ShieldCheck, Star, Store, Tag, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Critere, Pilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import {
  api,
  ApiError,
  urlAvatar,
  type MeResponse,
  type Offer,
  type OfferKind,
  type OfferLimits,
} from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

/**
 * La présentation est bornée à 400 caractères — la contrainte de la MAQUETTE, plus stricte que les
 * 2000 du serveur. Étant plus stricte, elle ne provoque jamais de refus : c'est un choix de forme,
 * et sur la forme la maquette décide. Une bio courte se lit.
 */
const BIO_MAX = 400

/** Traduit un délai de confirmation en langage humain — « 4 min » dit plus que « 240 s ». */
function delaiHumain(secondes: number | null): string | null {
  if (secondes === null) return null
  if (secondes < 60) return `${Math.round(secondes)} secondes`
  const min = Math.round(secondes / 60)
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''}`
  const h = Math.round(min / 60)
  return `${h} heure${h > 1 ? 's' : ''}`
}

// ── Enregistrement automatique ──────────────────────────────────────────────

type EtatEnregistrement = 'repos' | 'en-cours' | 'enregistre' | 'echec'

/**
 * Enregistre après la frappe, sans bouton — voir l'en-tête du fichier.
 * Le délai laisse le temps de finir sa pensée sans envoyer une requête par touche.
 */
function useEnregistrementAuto<T>(valeur: T, enregistrer: (v: T) => Promise<unknown>, actif: boolean) {
  const [etat, setEtat] = useState<EtatEnregistrement>('repos')
  const derniere = useRef<T>(valeur)
  const premiereFois = useRef(true)

  useEffect(() => {
    if (!actif) return
    // Le montage ne déclenche rien : on n'enregistre pas ce qu'on vient de lire.
    if (premiereFois.current) {
      premiereFois.current = false
      derniere.current = valeur
      return
    }
    if (JSON.stringify(valeur) === JSON.stringify(derniere.current)) return

    const minuteur = setTimeout(() => {
      derniere.current = valeur
      setEtat('en-cours')
      enregistrer(valeur)
        .then(() => setEtat('enregistre'))
        .catch(() => setEtat('echec'))
    }, 800)
    return () => clearTimeout(minuteur)
  }, [valeur, actif, enregistrer])

  return etat
}

function Enregistrement({ etat }: { etat: EtatEnregistrement }) {
  if (etat === 'repos') return null
  const contenu = {
    'en-cours': (
      <>
        <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Enregistrement…
      </>
    ),
    enregistre: (
      <>
        <Check size={11} strokeWidth={2.5} aria-hidden="true" /> Enregistré
      </>
    ),
    echec: <>Non enregistré — vérifiez votre connexion</>,
  }[etat]
  return (
    <span
      role="status"
      className={
        'flex items-center gap-1 text-[11px] ' +
        (etat === 'echec' ? 'text-[var(--erreur-texte)]' : 'text-[var(--texte-tertiaire)]')
      }
    >
      {contenu}
    </span>
  )
}

// ── Les offres ──────────────────────────────────────────────────────────────

function LigneOffre({
  offre,
  commissionPct,
  onDesactiver,
  enCours,
}: {
  offre: Offer
  commissionPct: number
  onDesactiver: () => void
  enCours: boolean
}) {
  const commission = Math.round((offre.priceXaf * commissionPct) / 100)
  const net = offre.priceXaf - commission

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
      <span className="min-w-0 flex-1 basis-44">
        <span className="block text-[13px] font-medium text-foreground">{offre.label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">
          {offre.durationMin} min · {offre.kind === 'FOLLOW_UP' ? 'suivi' : 'consultation'}
          {offre.active ? '' : ' · désactivée'}
        </span>
      </span>

      {/*
        Brut → commission → net, sur une seule ligne. La maquette posait un champ et une mention de
        commission ailleurs, laissant le médecin faire le calcul. Or c'est LA décision économique de
        l'écran : il doit voir ce qu'il touche sans sortir une calculatrice.
      */}
      <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-[var(--texte-tertiaire)]">
        <span>{xaf(offre.priceXaf)}</span>
        <span aria-hidden="true">−</span>
        <span>{xaf(commission)}</span>
        <span aria-hidden="true">=</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-[family-name:var(--font-display)] text-[16px] font-bold leading-none text-foreground">
          {xaf(net)}
        </span>
        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
          net pour vous
        </span>
      </span>

      {offre.active ? (
        <Button type="button" size="sm" variant="ghost" onClick={onDesactiver} disabled={enCours} aria-label={`Désactiver ${offre.label}`}>
          <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  )
}

/**
 * Formulaire d'ajout — les bornes sont ANNONCÉES, jamais découvertes par un refus.
 *
 * Elles viennent de `GET /v1/offers/limits` : la page n'écrit ni « 10 à 60 minutes », ni
 * « 500 XAF », ni « 5 offres ». Si le super-admin les change dans E3, cet écran suit.
 */
function AjoutOffre({
  bornes,
  commissionPct,
  onAjouter,
  enCours,
}: {
  bornes: OfferLimits
  commissionPct: number
  onAjouter: (dto: { label: string; durationMin: number; priceXaf: number; kind: OfferKind }) => void
  enCours: boolean
}) {
  const [label, setLabel] = useState('')
  const [duree, setDuree] = useState(String(bornes.durationMinMinutes))
  const [prix, setPrix] = useState(String(bornes.priceFloorXaf))
  const [kind, setKind] = useState<OfferKind>('STANDARD')

  const prixNum = Number(prix) || 0
  const net = prixNum - Math.round((prixNum * commissionPct) / 100)
  const complet = label.trim().length > 0 && Number(duree) > 0 && prixNum >= bornes.priceFloorXaf
  const plein = bornes.activeOffers >= bornes.maxActiveOffers

  if (plein) {
    return (
      <Avis ton="alerte">
        Vous avez {bornes.activeOffers} offres actives, soit le maximum. Désactivez-en une avant d’en publier
        une autre.
      </Avis>
    )
  }

  return (
    <form
      className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-[1fr_auto_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!complet) return
        onAjouter({ label: label.trim(), durationMin: Number(duree), priceXaf: prixNum, kind })
        setLabel('')
      }}
    >
      <span className="grid gap-1">
        <Label htmlFor="offre-label" className="text-[11px]">
          Libellé
        </Label>
        <Input
          id="offre-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Consultation de cardiologie"
          maxLength={120}
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-duree" className="text-[11px]">
          Durée
        </Label>
        <Input
          id="offre-duree"
          type="number"
          inputMode="numeric"
          value={duree}
          onChange={(e) => setDuree(e.target.value)}
          min={bornes.durationMinMinutes}
          max={bornes.durationMaxMinutes}
          className="w-24"
          aria-describedby="offre-bornes"
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-prix" className="text-[11px]">
          Prix patient
        </Label>
        <Input
          id="offre-prix"
          type="number"
          inputMode="numeric"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          min={bornes.priceFloorXaf}
          step={100}
          className="w-32"
          aria-describedby="offre-bornes"
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-type" className="text-[11px]">
          Type
        </Label>
        <Liste
          id="offre-type"
          valeur={kind}
          onChange={setKind}
          options={[
            { cle: 'STANDARD' as OfferKind, label: 'Consultation' },
            { cle: 'FOLLOW_UP' as OfferKind, label: 'Suivi', aide: 'Déclenche la proposition automatique après un compte-rendu' },
          ]}
        />
      </span>

      <p id="offre-bornes" className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)] sm:col-span-4">
        Durée entre <strong className="text-foreground">{bornes.durationMinMinutes}</strong> et{' '}
        <strong className="text-foreground">{bornes.durationMaxMinutes}</strong> minutes · prix minimum{' '}
        <strong className="text-foreground">{xaf(bornes.priceFloorXaf)} XAF</strong>, commission comprise ·{' '}
        <strong className="text-foreground">
          {bornes.activeOffers} sur {bornes.maxActiveOffers}
        </strong>{' '}
        offres actives.
        {prixNum >= bornes.priceFloorXaf ? (
          <>
            {' '}
            À ce prix, vous percevez <strong className="text-foreground">{xaf(net)} XAF</strong> par consultation.
          </>
        ) : null}
      </p>

      <span className="sm:col-span-4">
        <Button type="submit" size="sm" disabled={!complet || enCours}>
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
          Ajouter cette offre
        </Button>
      </span>
    </form>
  )
}

// ── Écran ───────────────────────────────────────────────────────────────────

export function VitrinePage() {
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)
  const [erreur, setErreur] = useState<string | null>(null)

  // Brouillon local : l'aperçu suit la frappe, l'enregistrement suit à 800 ms.
  const [bio, setBio] = useState(me?.biography ?? '')
  const [district, setDistrict] = useState(me?.district ?? '')

  const verif = useQuery({ queryKey: ['verification'], queryFn: () => api.verificationMine(), retry: false })
  const offres = useQuery({ queryKey: ['offers'], queryFn: () => api.myOffers() })
  const bornes = useQuery({ queryKey: ['offer-limits'], queryFn: () => api.offerLimits() })

  /**
   * « Ce que les patients voient » n'est pas une reconstitution : on appelle la VRAIE route publique
   * avec son propre identifiant. Elle filtre sur RM-05-01 — un refus est donc l'information même :
   * le médecin n'est pas dans l'annuaire.
   */
  const publique = useQuery({
    queryKey: ['directory-me', me?.accountId],
    queryFn: () => api.directoryProfile(me?.accountId ?? ''),
    enabled: !!me?.accountId,
    retry: false,
  })

  const enregistrerProfil = useMutation({
    mutationFn: (v: { biography: string; district: string }) => api.updateMyProfessionalProfile(v),
    onSuccess: (m: MeResponse) => {
      setMe(m)
      void qc.invalidateQueries({ queryKey: ['directory-me'] })
    },
  })
  const etatProfil = useEnregistrementAuto({ biography: bio, district }, (v) => enregistrerProfil.mutateAsync(v), !!me)

  const rafraichirOffres = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['offers'] })
    void qc.invalidateQueries({ queryKey: ['offer-limits'] })
    void qc.invalidateQueries({ queryKey: ['directory-me'] })
  }, [qc])

  const creerOffre = useMutation({
    mutationFn: (dto: { label: string; durationMin: number; priceXaf: number; kind: OfferKind }) => api.createOffer(dto),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageDe(e)),
  })
  const desactiverOffre = useMutation({
    mutationFn: (id: string) => api.deactivateOffer(id),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageDe(e)),
  })

  const avatar = useMutation({
    mutationFn: (dto: { imageBase64: string; mime: string } | null) =>
      dto ? api.setAvatar(dto) : api.removeAvatar(),
    onSuccess: (m: MeResponse) => {
      setMe(m)
      void qc.invalidateQueries({ queryKey: ['directory-me'] })
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  // Le taux vient du CONTRAT SIGNÉ, jamais d'une constante : deux médecins peuvent avoir deux taux
  // en même temps, selon qu'ils ont re-signé leur avenant ou non (RM-13-07).
  const commissionPct = verif.data?.agreement?.commissionPct ?? null
  const peutExercer = verif.data?.canPractice ?? false

  const nomAffiche = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || me?.username || '—'
  const listeOffres = offres.data ?? []
  const offresActives = useMemo(() => listeOffres.filter((o) => o.active), [listeOffres])

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-tight text-foreground">
            Ma vitrine
          </h1>
          <p className="mt-1 text-[13px] text-[var(--texte-secondaire)]">
            {peutExercer ? (
              <>
                Visible dans l’annuaire{me?.district ? ` de ${me.district}` : ''} · {offresActives.length} offre
                {offresActives.length > 1 ? 's' : ''} active{offresActives.length > 1 ? 's' : ''}
              </>
            ) : (
              'Votre fiche n’est pas encore visible des patients'
            )}
          </p>
        </div>
        <Enregistrement etat={etatProfil} />
      </header>

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      {/*
        Deux colonnes, mesurées sur la maquette le 27/08 : 968 px d'édition et un rail d'aperçu de
        320 px. L'aperçu n'est ni un onglet ni une fenêtre — il vit À CÔTÉ du formulaire et suit la
        frappe. C'est le cœur de l'écran, et c'est ce que la version précédente avait remplacé par
        une liste de confrères.
      */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <Carte icone={Store} titre="Identité professionnelle" sousTitre="Le nom et la spécialité proviennent de votre dossier vérifié">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--ap-600)]">
                  {me?.avatarKey ? (
                    <img src={urlAvatar(me.avatarKey)} alt="" className="size-full object-cover" />
                  ) : (
                    ((me?.firstName?.[0] ?? '') + (me?.lastName?.[0] ?? '')).toUpperCase() || '·'
                  )}
                </span>
                <span className="min-w-0 flex-1 basis-52">
                  <span className="block text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                    Photo visible par les patients dans l’annuaire · JPEG ou PNG, 2 Mo maximum.
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const lecteur = new FileReader()
                        lecteur.onload = () =>
                          avatar.mutate({ imageBase64: String(lecteur.result).split(',')[1] ?? '', mime: f.type })
                        lecteur.readAsDataURL(f)
                        e.target.value = ''
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary">
                      <Camera size={14} strokeWidth={1.6} aria-hidden="true" />
                      Téléverser
                    </span>
                  </label>
                  {me?.avatarKey ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => avatar.mutate(null)} disabled={avatar.isPending}>
                      Retirer
                    </Button>
                  ) : null}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <span className="grid gap-1">
                  <Label className="text-[11px]">Nom affiché</Label>
                  <Input value={nomAffiche} readOnly disabled />
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">Issu de votre pièce d’identité vérifiée.</span>
                </span>
                <span className="grid gap-1">
                  <Label className="text-[11px]">Spécialité</Label>
                  <Input value={me?.specialty ?? '—'} readOnly disabled />
                  {/*
                    Lecture seule par arbitrage du porteur (27/08). Le serveur l'autorise pourtant :
                    le Badge Vérifié atteste d'une qualification contrôlée par pièces, et un
                    cardiologue qui se renommerait « neurochirurgien » garderait son badge — le badge
                    mentirait. Fermer la route côté serveur reste une dette ouverte (§9 du plan).
                  */}
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">Une modification passe par l’administration.</span>
                </span>
              </div>

              <span className="grid gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="bio" className="text-[11px]">
                    Présentation
                  </Label>
                  <span className="font-mono text-[10px] text-[var(--texte-tertiaire)]">
                    {bio.length} / {BIO_MAX}
                  </span>
                </span>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  rows={4}
                  placeholder="Décrivez votre pratique en quelques phrases."
                />
                <span className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Évitez les promesses de résultat : la charte de l’Ordre l’interdit. {BIO_MAX} caractères maximum.
                </span>
              </span>

              {/*
                Remplace le bloc « Lieux de consultation » de la maquette — cabinets, adresses,
                horaires. Rien de tout cela n'existe : la fiche d'un professionnel ne porte qu'un
                seul champ géographique, et EF-05-01 n'en connaît pas d'autre.
              */}
              <span className="grid gap-1 sm:max-w-xs">
                <Label htmlFor="district" className="text-[11px]">
                  Arrondissement
                </Label>
                <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bacongo" />
                <span className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  C’est la seule information de lieu visible des patients, et elle sert aussi à vous trouver dans la
                  recherche.
                </span>
              </span>
            </div>
          </Carte>

          <Carte
            icone={Tag}
            titre="Mes offres"
            sousTitre="Montants en XAF, visibles avant toute demande"
            action={
              commissionPct !== null ? (
                <Pilule ton="neutre">commission {commissionPct} %</Pilule>
              ) : null
            }
          >
            <div className="grid gap-3">
              {offres.isLoading ? (
                <Spinner />
              ) : listeOffres.length === 0 ? (
                <p className="text-[13px] text-[var(--texte-tertiaire)]">
                  Aucune offre pour l’instant. Un patient ne peut vous solliciter que par une offre.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {listeOffres.map((o) => (
                    <LigneOffre
                      key={o.id}
                      offre={o}
                      commissionPct={commissionPct ?? 0}
                      onDesactiver={() => desactiverOffre.mutate(o.id)}
                      enCours={desactiverOffre.isPending}
                    />
                  ))}
                </ul>
              )}

              {bornes.data && commissionPct !== null ? (
                <AjoutOffre
                  bornes={bornes.data}
                  commissionPct={commissionPct}
                  onAjouter={(dto) => creerOffre.mutate(dto)}
                  enCours={creerOffre.isPending}
                />
              ) : null}

              {/*
                Famille 4, point 8 : la relance de suivi part TOUTE SEULE au dépôt du compte-rendu,
                si une offre « suivi » active existe. Aucun bouton — il ferait doublon avec l'envoi
                serveur. Deux phrases suffisent, et c'est ici qu'elles ont un sens.
              */}
              <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Une offre de type <strong className="text-foreground">suivi</strong> déclenche une proposition
                automatique au patient dès que vous déposez votre compte-rendu. Vous n’avez rien à envoyer.
              </p>
            </div>
          </Carte>

        </div>

        {/* Rail d'aperçu — 320 px, collant : il reste en vue pendant qu'on édite à gauche. */}
        <div className="grid content-start gap-4 lg:sticky lg:top-4">
          <Carte icone={Eye} titre="Aperçu patient" sousTitre="Tel qu’il apparaît dans l’annuaire">
            <div className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[12px] font-bold text-[var(--ap-600)]">
                  {me?.avatarKey ? (
                    <img src={urlAvatar(me.avatarKey)} alt="" className="size-full object-cover" />
                  ) : (
                    ((me?.firstName?.[0] ?? '') + (me?.lastName?.[0] ?? '')).toUpperCase() || '·'
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">{nomAffiche}</span>
                    {peutExercer ? (
                      <ShieldCheck size={13} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[var(--succes-accent)]" />
                    ) : null}
                  </span>
                  <span className="mt-px block truncate text-[11px] text-[var(--texte-tertiaire)]">
                    {[me?.specialty, district].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
              </div>

              {bio.trim() ? (
                <p className="mt-2.5 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">{bio}</p>
              ) : (
                <p className="mt-2.5 text-[12px] leading-[1.55] text-[var(--texte-tertiaire)]">
                  Sans présentation, votre fiche paraît vide à côté de celles de vos confrères.
                </p>
              )}

              {offresActives.length > 0 ? (
                <p className="mt-2.5 border-t border-border pt-2.5 text-[12px] text-[var(--texte-secondaire)]">
                  À partir de{' '}
                  <strong className="font-[family-name:var(--font-display)] text-[15px] font-bold text-foreground">
                    {xaf(Math.min(...offresActives.map((o) => o.priceXaf)))} XAF
                  </strong>
                </p>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Votre pastille de disponibilité s’affiche aussi sur cette fiche. Elle se règle dans la barre du haut.
            </p>
          </Carte>

          {/*
            Remplace « Prêt à publier » et ses quatre contrôles inventés (80 caractères de bio, une
            langue, un lieu, un tarif par mode). La VRAIE règle est RM-05-01 : seuls les
            professionnels vérifiés ET sous contrat signé apparaissent. On peut soigner chaque mot
            de cet écran et n'être visible nulle part.
          */}
          <Carte icone={ShieldCheck} titre="Êtes-vous visible ?" ton={peutExercer ? 'accent' : 'danger'}>
            <div className="grid gap-2">
              <Critere ok={verif.data?.status === 'VERIFIED'} label="Dossier vérifié par l’administration" />
              <Critere ok={!!verif.data?.agreement?.signedAt} label="Contrat de partenariat signé" />
              <Critere ok={offresActives.length > 0} label="Au moins une offre active" />

              {!peutExercer ? (
                <Avis ton="alerte">
                  Tant que ces conditions ne sont pas réunies, votre fiche n’apparaît pas dans l’annuaire — quel que
                  soit le soin apporté à cette page.{' '}
                  <Link to="/verification" className="underline underline-offset-2">
                    Voir mon dossier
                  </Link>
                </Avis>
              ) : offresActives.length === 0 ? (
                <Avis ton="alerte">
                  Vous êtes vérifié et sous contrat, mais sans offre active un patient n’a aucun moyen de vous
                  solliciter.
                </Avis>
              ) : null}
            </div>
          </Carte>

          {/*
            Remplace le bloc « Visibilité » de la maquette, **à sa place** — dans le rail de droite.
            Ses 318 vues de fiche ne sont comptées nulle part ; ce qui suit vient de la VRAIE route
            publique, c'est littéralement ce qu'un patient lit (famille 4, point 7).

            ⚠️ Ce bloc avait d'abord été posé dans la colonne de GAUCHE, au motif que la liste des
            commentaires tenait mal dans 320 px. C'était une raison, pas un fait — et la règle est
            que seule une contrainte réelle autorise à s'écarter de la maquette. Remis à droite le
            27/08 : les trois chiffres s'empilent, les avis sont compacts.
          */}
          <Carte icone={Users} titre="Ce que les patients voient" sousTitre="Chiffres publics, mis à jour tout seuls">
            {publique.isLoading ? (
              <Spinner />
            ) : publique.data ? (
              <div className="grid gap-3">
                <div className="grid gap-2.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                      Note moyenne
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <Star size={12} strokeWidth={1.8} aria-hidden="true" className="translate-y-px text-[var(--ton-ambre-icone)]" />
                      <strong className="font-[family-name:var(--font-display)] text-[16px] font-bold leading-none text-foreground">
                        {publique.data.rating.avg ?? '—'}
                      </strong>
                      <span className="text-[11px] text-[var(--texte-tertiaire)]">{publique.data.rating.count} avis</span>
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                      Taux de confirmation
                    </span>
                    <strong className="font-[family-name:var(--font-display)] text-[16px] font-bold leading-none text-foreground">
                      {publique.data.reactivity.confirmRatePct ?? '—'} %
                    </strong>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                      Délai moyen
                    </span>
                    <strong className="font-[family-name:var(--font-display)] text-[16px] font-bold leading-none text-foreground">
                      {delaiHumain(publique.data.reactivity.avgConfirmDelayS) ?? '—'}
                    </strong>
                  </span>
                </div>

                <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Le taux baisse quand une demande expire sans réponse — même une réponse négative vaut mieux
                  qu’une expiration. <strong className="text-foreground">Vous ne pouvez ni répondre à un avis, ni
                  le masquer</strong> ; un avis abusif se signale à l’administration.
                </p>

                {publique.data.latestComments.length > 0 ? (
                  <ul className="grid gap-1.5 border-t border-border pt-2.5">
                    {publique.data.latestComments.slice(0, 3).map((c, i) => (
                      <li key={i}>
                        <span className="flex items-baseline gap-1.5 text-[10px] text-[var(--ton-ambre-icone)]">
                          {'★'.repeat(c.score)}
                          <span className="text-[var(--texte-tertiaire)]">
                            {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </span>
                        <p className="text-[12px] leading-[1.45] text-[var(--texte-secondaire)]">{c.comment}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Ces chiffres apparaîtront dès que votre fiche sera publiée et qu’un patient vous aura sollicité.
              </p>
            )}
          </Carte>
        </div>
      </div>
    </div>
  )
}
