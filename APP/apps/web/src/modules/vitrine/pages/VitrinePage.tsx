/**
 * C2 — Ma vitrine. D'après `docs/maquettes/C2 - Ma vitrine.dc.html`, largement repensé.
 *
 * ── Le parti pris ──────────────────────────────────────────────────────────────────────────────
 *
 * La maquette traite cet écran comme un formulaire administratif : des champs à gauche, un aperçu
 * en timbre-poste dans une colonne latérale, un bouton « Publier ». Ce n'est pas un formulaire.
 * C'est un MIROIR DE CONCURRENCE — et la seule question qu'un médecin s'y pose est : « est-ce qu'un
 * patient me choisit, moi, plutôt que les trois autres de la liste ? »
 *
 * Trois décisions en découlent, et elles gouvernent tout le fichier :
 *
 *  1. **L'aperçu montre la LISTE**, pas une fiche isolée. La fiche du médecin est insérée parmi ses
 *     confrères réels, tirés de `GET /v1/directory` avec ses propres filtres. Un patient ne voit
 *     jamais une fiche seule : il compare. Se relire ne sert à rien ; se voir comparé, si.
 *
 *  2. **L'écran dit ce qui rend INVISIBLE.** `RM-05-01` exclut en base tout professionnel qui n'est
 *     pas vérifié ET sous contrat signé. On peut donc soigner chaque mot et n'apparaître nulle part.
 *     La maquette n'en dit rien et parle de « Prêt à publier », un état qu'elle a inventé. Ici, les
 *     trois conditions réelles sont en tête, et elles sont lues du serveur.
 *
 *  3. **Aucun bouton « Publier ».** `PATCH me/professional-profile` publie immédiatement — il n'y a
 *     pas d'état intermédiaire à représenter. L'enregistrement se fait tout seul après la frappe, et
 *     l'écran dit où il en est. Inventer une publication différée ajouterait la seule question qu'on
 *     veut éviter : « ai-je publié ? »
 *
 * ── Ce qui a été retiré, et pourquoi (§9 du plan) ──────────────────────────────────────────────
 *
 * Langues de consultation et lieux de consultation : n'existent NULLE PART — ni en base, ni dans
 * l'annuaire, ni dans la recherche. « Visibilité, 30 derniers jours » : aucune vue de vitrine n'est
 * comptée, et la phrase « une vitrine complète est consultée deux fois plus souvent » n'a aucune
 * source. Un chiffre inventé sur cet écran serait exactement ce qu'on s'interdit depuis B2.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Camera, Check, Loader2, Plus, Store, Tag, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Critere, Pilule, Segments } from '@/components/ulamu/parts'
import { CarteAnnuaire } from '@/modules/vitrine/CarteAnnuaire'
import {
  api,
  ApiError,
  urlAvatar,
  type DirectoryItem,
  type MeResponse,
  type Offer,
  type PresenceState,
} from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

/** La présentation est bornée à 400 caractères — la contrainte de la maquette, plus stricte que les
 *  2000 du serveur. Une bio courte se lit ; le serveur ne s'en plaindra jamais. */
const BIO_MAX = 400

// ── Enregistrement automatique ──────────────────────────────────────────────

type EtatEnregistrement = 'repos' | 'en-cours' | 'enregistre' | 'echec'

/**
 * Enregistre après la frappe, sans bouton.
 *
 * Le serveur publie immédiatement : il n'y a rien à « publier » plus tard. Un bouton n'ajouterait
 * qu'une question — « ai-je publié ? » — sur un écran où l'on ajuste deux phrases. Le délai laisse
 * le temps de finir sa pensée sans envoyer une requête par touche.
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

// ── Tarifs ──────────────────────────────────────────────────────────────────

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

/** Repère de marché — calculé sur les confrères réels, jamais inventé. */
function Marche({ prix, categorie }: { prix: number[]; categorie: string }) {
  if (prix.length === 0) return null
  const tries = [...prix].sort((a, b) => a - b)
  const mediane = tries[Math.floor(tries.length / 2)] as number
  return (
    <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
      {tries.length === 1 ? 'Un autre' : `Les ${tries.length} autres`} {categorie} de votre arrondissement{' '}
      {tries.length === 1 ? 'demande' : 'demandent'}{' '}
      {tries[0] === tries[tries.length - 1] ? (
        <strong className="text-foreground">{xaf(tries[0] as number)} F</strong>
      ) : (
        <>
          entre <strong className="text-foreground">{xaf(tries[0] as number)}</strong> et{' '}
          <strong className="text-foreground">{xaf(tries[tries.length - 1] as number)} F</strong>, médiane{' '}
          <strong className="text-foreground">{xaf(mediane)} F</strong>
        </>
      )}
      .
    </p>
  )
}

// ── Écran ───────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  GENERAL_PRACTITIONER: 'médecins généralistes',
  SPECIALIST: 'spécialistes',
  DENTIST: 'dentistes',
  MIDWIFE: 'sages-femmes',
  NURSE: 'infirmiers',
  COMMUNITY_HEALTH_WORKER: 'agents de santé',
}

export function VitrinePage() {
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)
  const [vue, setVue] = useState<'liste' | 'seule'>('liste')
  const [erreur, setErreur] = useState<string | null>(null)

  // Brouillon local : l'aperçu suit la frappe, l'enregistrement suit à 800 ms.
  const [specialite, setSpecialite] = useState(me?.specialty ?? '')
  const [bio, setBio] = useState(me?.biography ?? '')
  const [district, setDistrict] = useState(me?.district ?? '')

  const verif = useQuery({ queryKey: ['verification'], queryFn: () => api.verificationMine(), retry: false })
  const offres = useQuery({ queryKey: ['offers'], queryFn: () => api.myOffers() })
  const presence = useQuery({ queryKey: ['presence'], queryFn: () => api.myPresence() })
  const annuaire = useQuery({
    queryKey: ['directory', me?.category, district],
    queryFn: () => api.searchDirectory({ category: me?.category ?? undefined, district: district || undefined }),
    enabled: !!me,
  })

  const enregistrerProfil = useMutation({
    mutationFn: (v: { specialty: string; biography: string; district: string }) => api.updateMyProfessionalProfile(v),
    onSuccess: (m: MeResponse) => setMe(m),
  })
  const etatProfil = useEnregistrementAuto(
    { specialty: specialite, biography: bio, district },
    (v) => enregistrerProfil.mutateAsync(v),
    !!me,
  )

  const changerPresence = useMutation({
    mutationFn: (etat: PresenceState) => api.setPresence(etat),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['presence'] })
      void qc.invalidateQueries({ queryKey: ['directory'] })
    },
  })
  const desactiverOffre = useMutation({
    mutationFn: (id: string) => api.deactivateOffer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
    onError: (e) => setErreur(messageDe(e)),
  })

  // ── Les trois conditions qui décident de la visibilité (RM-05-01) ──────────
  const actives = (offres.data ?? []).filter((o) => o.active)
  const signe = verif.data?.agreement?.signedAt != null
  const verifie = verif.data?.status === 'VERIFIED'
  const conditions = [
    { ok: verifie, label: verifie ? 'Dossier vérifié' : 'Dossier pas encore vérifié' },
    { ok: signe, label: signe ? 'Contrat signé' : 'Contrat de partenariat non signé' },
    { ok: actives.length > 0, label: actives.length > 0 ? `${actives.length} tarif(s) publié(s)` : 'Aucun tarif publié' },
  ]
  const trouvable = conditions.every((c) => c.ok)
  const commissionPct = verif.data?.agreement?.commissionPct ?? 10

  // ── La fiche du médecin, telle qu'un patient la verra ──────────────────────
  const confreres = (annuaire.data?.items ?? []).filter((i) => i.professionalId !== me?.accountId)
  const moiDansAnnuaire = (annuaire.data?.items ?? []).find((i) => i.professionalId === me?.accountId)
  const moinsChere = actives.reduce<Offer | null>((min, o) => (min === null || o.priceXaf < min.priceXaf ? o : min), null)

  const maFiche: DirectoryItem | null = useMemo(() => {
    if (!me) return null
    // Les notes et la réactivité viennent de l'annuaire quand on y figure déjà — jamais inventées.
    // Le reste suit le brouillon, pour que l'aperçu réagisse à la frappe.
    return {
      professionalId: me.accountId,
      displayName: [me.firstName, me.lastName].filter(Boolean).join(' ') || (me.username ?? ''),
      category: (me.category ?? 'GENERAL_PRACTITIONER') as DirectoryItem['category'],
      specialty: specialite || null,
      district: district || null,
      badgeVerified: verifie,
      rating: moiDansAnnuaire?.rating ?? { avg: null, count: 0 },
      reactivity: moiDansAnnuaire?.reactivity ?? { confirmRatePct: null, avgConfirmDelayS: null },
      presence: presence.data?.state ?? 'OFFLINE',
      availableNow: presence.data?.availableForInitiation ?? false,
      cheapestOffer: moinsChere
        ? {
            id: moinsChere.id,
            label: moinsChere.label,
            durationMin: moinsChere.durationMin,
            priceXaf: moinsChere.priceXaf,
            kind: moinsChere.kind,
          }
        : null,
      relevanceScore: 0,
    }
  }, [me, specialite, district, verifie, moiDansAnnuaire, presence.data, moinsChere])

  if (!me || verif.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Chargement de votre vitrine…
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Store size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Ma vitrine
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            Ce que voit un patient de Brazzaville quand il cherche un soignant
          </p>
        </span>
        <Segments
          label="Ma disponibilité"
          valeur={presence.data?.state ?? 'OFFLINE'}
          onChange={(v) => changerPresence.mutate(v)}
          options={[
            { cle: 'ONLINE' as PresenceState, label: 'En ligne' },
            { cle: 'DO_NOT_DISTURB' as PresenceState, label: 'Ne pas déranger' },
            { cle: 'OFFLINE' as PresenceState, label: 'Hors ligne' },
          ]}
        />
      </div>

      {/* ── Êtes-vous trouvable ? ────────────────────────────────────────── */}
      <section
        className={
          'ul-grain-fine mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[10px] border p-4 ' +
          (trouvable ? 'border-[var(--succes-bordure)] bg-[var(--succes-fond)]' : 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)]')
        }
      >
        <span className="min-w-0 flex-1 basis-56">
          <span className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
              {trouvable ? 'Vous apparaissez dans les recherches' : 'Vous n’apparaissez dans aucune recherche'}
            </span>
            <Pilule ton={trouvable ? 'succes' : 'alerte'}>{trouvable ? 'Visible' : 'Invisible'}</Pilule>
          </span>
          <span className="mt-1 block text-[11px] leading-[1.5] text-[var(--texte-secondaire)]">
            {trouvable
              ? 'Un patient qui cherche votre spécialité dans votre arrondissement vous trouve.'
              : 'L’annuaire écarte en base tout soignant qui ne remplit pas ces trois conditions. Tant qu’elles ne sont pas réunies, ce que vous écrivez ici ne sera vu par personne.'}
          </span>
        </span>
        <span className="flex shrink-0 flex-col gap-1">
          {conditions.map((c) => (
            <Critere key={c.label} ok={c.ok} label={c.label} />
          ))}
        </span>
        {!verifie || !signe ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/verification">Ouvrir mon dossier</Link>
          </Button>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-5">
        {/* ── Colonne d'édition ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <Carte
            icone={Camera}
            titre="Identité professionnelle"
            sousTitre="Le nom vient de votre dossier vérifié — il ne se modifie pas ici"
            action={<Enregistrement etat={etatProfil} />}
          >
            <BlocPhoto me={me} rafraichir={setMe} />

            <div className="flex flex-wrap gap-3">
              <div className="min-w-0 flex-1 basis-52">
                <Label htmlFor="specialite" className="mb-1.5 block text-[13px]">
                  Spécialité
                </Label>
                <Input
                  id="specialite"
                  value={specialite}
                  maxLength={120}
                  onChange={(e) => setSpecialite(e.target.value)}
                  placeholder="Cardiologie"
                />
              </div>
              <div className="min-w-0 flex-1 basis-52">
                <Label htmlFor="district" className="mb-1.5 block text-[13px]">
                  Arrondissement
                </Label>
                <Input
                  id="district"
                  value={district}
                  maxLength={80}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Bacongo"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio" className="mb-1.5 block text-[13px]">
                Présentation
              </Label>
              <Textarea
                id="bio"
                rows={4}
                value={bio}
                maxLength={BIO_MAX}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ce que vous soignez, comment vous travaillez."
              />
              <p className="mt-1 flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-[var(--texte-tertiaire)]">
                {/*
                  L'avertissement de l'Ordre est ce que la maquette contient de meilleur : une
                  promesse de résultat expose le praticien, pas la plateforme. On le garde tel quel.
                */}
                <span>Évitez les promesses de résultat : la charte de l’Ordre l’interdit.</span>
                <span className={bio.length > BIO_MAX - 40 ? 'font-semibold text-[var(--alerte-texte)]' : undefined}>
                  {bio.length} / {BIO_MAX}
                </span>
              </p>
            </div>
          </Carte>

          <Carte
            icone={Tag}
            titre="Tarifs affichés"
            sousTitre={`Montants en XAF vus par le patient · commission ULAMU de ${commissionPct} % déduite`}
          >
            {offres.isPending ? (
              <p className="flex items-center gap-2 text-[12px] text-[var(--texte-tertiaire)]">
                <Spinner className="size-3.5" /> Lecture de vos tarifs…
              </p>
            ) : (offres.data ?? []).length === 0 ? (
              <Avis ton="alerte">
                Aucun tarif publié — c’est la troisième condition pour apparaître dans les recherches. Un patient ne peut
                pas vous solliciter sans savoir ce qu’il paie.
              </Avis>
            ) : (
              <ul className="flex flex-col gap-2">
                {(offres.data ?? []).map((o) => (
                  <LigneOffre
                    key={o.id}
                    offre={o}
                    commissionPct={commissionPct}
                    enCours={desactiverOffre.isPending}
                    onDesactiver={() => desactiverOffre.mutate(o.id)}
                  />
                ))}
              </ul>
            )}

            <Marche
              prix={confreres.map((c) => c.cheapestOffer?.priceXaf).filter((p): p is number => typeof p === 'number')}
              categorie={CATEGORIES[me.category ?? ''] ?? 'confrères'}
            />

            <NouvelleOffre onCree={() => qc.invalidateQueries({ queryKey: ['offers'] })} commissionPct={commissionPct} />
            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </Carte>
        </div>

        {/* ── Colonne d'aperçu ───────────────────────────────────────────── */}
        <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
              <Users size={15} strokeWidth={1.6} aria-hidden="true" className="text-[var(--ap-600)]" />
              Vu par un patient
            </span>
            <Segments
              label="Forme de l’aperçu"
              valeur={vue}
              onChange={setVue}
              options={[
                { cle: 'liste' as const, label: 'Dans la liste' },
                { cle: 'seule' as const, label: 'Ma fiche' },
              ]}
            />
          </div>

          <div className="rounded-[10px] border border-border bg-[var(--fond-surface-2)] p-3">
            {vue === 'seule' || confreres.length === 0 ? (
              <>
                {maFiche ? <CarteAnnuaire item={maFiche} avatarUrl={me.avatarKey ? urlAvatar(me.avatarKey) : null} moi /> : null}
                {confreres.length === 0 && vue === 'liste' ? (
                  <p className="mt-3 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                    Aucun autre {CATEGORIES[me.category ?? ''] ?? 'confrère'} n’exerce dans cet arrondissement pour
                    l’instant — vous y êtes seul.
                  </p>
                ) : null}
              </>
            ) : (
              <ul className="flex flex-col gap-2">
                {/* Sa carte en tête : c'est la position qu'il cherche, et elle rend la comparaison
                    immédiate sans qu'il ait à faire défiler. */}
                {maFiche ? (
                  <li>
                    <CarteAnnuaire item={maFiche} avatarUrl={me.avatarKey ? urlAvatar(me.avatarKey) : null} moi />
                  </li>
                ) : null}
                {confreres.slice(0, 3).map((c) => (
                  <li key={c.professionalId}>
                    <CarteAnnuaire item={c} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!trouvable ? (
            <p className="text-[11px] leading-[1.5] text-[var(--alerte-texte)]">
              Cet aperçu montre ce que vous seriez. Tant que les trois conditions ne sont pas réunies, votre fiche
              n’apparaît dans aucune liste.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

// ── Photo ───────────────────────────────────────────────────────────────────

function BlocPhoto({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = useMutation({
    mutationFn: (f: File) =>
      new Promise<MeResponse>((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onerror = () => reject(new Error('Fichier illisible'))
        lecteur.onload = () => {
          const brut = String(lecteur.result)
          resolve(api.setAvatar({ imageBase64: brut.slice(brut.indexOf(',') + 1), mime: f.type }))
        }
        lecteur.readAsDataURL(f)
      }),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })
  const retirer = useMutation({ mutationFn: () => api.removeAvatar(), onSuccess: rafraichir })

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ap-600)]">
        {me.avatarKey ? (
          <img src={urlAvatar(me.avatarKey)} alt="Votre photo" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">
            {[me.firstName?.[0], me.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
        <p className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          C’est le visage qu’un patient voit avant de vous solliciter. JPEG, PNG ou WebP · 2 Mo maximum.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={champ}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              setErreur(null)
              if (!f) return
              if (f.size > 2 * 1024 * 1024) return setErreur('Image trop lourde : 2 Mo maximum.')
              envoyer.mutate(f)
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => champ.current?.click()} disabled={envoyer.isPending}>
            {envoyer.isPending ? 'Envoi…' : me.avatarKey ? 'Remplacer' : 'Téléverser'}
          </Button>
          {me.avatarKey ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => retirer.mutate()}>
              Retirer
            </Button>
          ) : null}
        </div>
        {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
      </div>
    </div>
  )
}

// ── Nouvelle offre ──────────────────────────────────────────────────────────

function NouvelleOffre({ onCree, commissionPct }: { onCree: () => void; commissionPct: number }) {
  const [ouvert, setOuvert] = useState(false)
  const [label, setLabel] = useState('Consultation')
  const [duree, setDuree] = useState('30')
  const [prix, setPrix] = useState('')
  const [kind, setKind] = useState<'STANDARD' | 'FOLLOW_UP'>('STANDARD')
  const [erreur, setErreur] = useState<string | null>(null)

  const creer = useMutation({
    mutationFn: () =>
      api.createOffer({ label: label.trim(), durationMin: Number(duree), priceXaf: Number(prix), kind }),
    onSuccess: () => {
      setOuvert(false)
      setPrix('')
      onCree()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const montant = Number(prix) || 0
  const net = montant - Math.round((montant * commissionPct) / 100)

  if (!ouvert) {
    return (
      <div>
        <Button type="button" size="sm" onClick={() => setOuvert(true)}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Ajouter un tarif
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary p-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="offre-label" className="mb-1.5 block text-[13px]">
            Intitulé
          </Label>
          <Input id="offre-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="w-28 shrink-0">
          <Label htmlFor="offre-duree" className="mb-1.5 block text-[13px]">
            Durée
          </Label>
          <NativeSelect id="offre-duree" value={duree} onChange={(e) => setDuree(e.target.value)}>
            {['15', '20', '30', '45', '60'].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="w-32 shrink-0">
          <Label htmlFor="offre-prix" className="mb-1.5 block text-[13px]">
            Prix patient
          </Label>
          <Input id="offre-prix" inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="w-36 shrink-0">
          <Label htmlFor="offre-kind" className="mb-1.5 block text-[13px]">
            Type
          </Label>
          <NativeSelect id="offre-kind" value={kind} onChange={(e) => setKind(e.target.value as 'STANDARD' | 'FOLLOW_UP')}>
            <option value="STANDARD">Consultation</option>
            <option value="FOLLOW_UP">Suivi</option>
          </NativeSelect>
        </div>
      </div>

      {montant > 0 ? (
        <p className="text-[12px] text-[var(--texte-secondaire)]">
          Le patient paie <strong className="text-foreground">{xaf(montant)} F</strong>, vous percevez{' '}
          <strong className="text-foreground">{xaf(net)} F</strong> après la commission de {commissionPct} %.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => creer.mutate()} disabled={creer.isPending || montant <= 0 || label.trim() === ''}>
          {creer.isPending ? 'Création…' : 'Publier ce tarif'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
      </div>
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </div>
  )
}
