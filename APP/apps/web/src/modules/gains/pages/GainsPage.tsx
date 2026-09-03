/**
 * C6 — Mes gains. D'après `docs/maquettes/C6 - Mes gains.dc.html` et le cahier des charges M13.
 *
 * L'argent : ce qui est retirable, ce qui attend, ce qui a bougé, et comment le faire venir sur son
 * Mobile Money.
 *
 * ── Ce que le serveur a dû apprendre à dire (S2 et S3) ─────────────────────────────────────────
 *
 * **S2 — le brut et la commission.** Le journal ne portait que le NET. Le brut et la commission
 * existaient, mais dans la part de paiement, que la vue ne joignait pas : un médecin lisait
 * « + 11 000 XAF » sans savoir ce que le patient avait payé ni ce qui avait été prélevé. C'est ce
 * silence que les maquettes comblaient en écrivant « 12 % » — quatre fois dans cet écran.
 *
 * Et **12 % n'était pas seulement faux, le principe l'était** : le taux appliqué à un paiement est
 * celui du contrat signé de CE bénéficiaire-là (RM-13-07), pas un paramètre global. Deux médecins
 * peuvent avoir deux taux le même jour. Aucun écran ne peut calculer une commission ; il ne peut que
 * lire celle qui a été appliquée. **Le taux n'est donc écrit nulle part ici — il est déduit, ligne
 * par ligne, de ce que le serveur a réellement prélevé.**
 *
 * **S3 — le délai d'exécution.** EF-13-07 veut que les frais ET le délai soient connus avant
 * l'engagement. Les frais y étaient ; le délai vient de PM-36, servi dans le récapitulatif.
 *
 * ── Les écarts à la maquette ──────────────────────────────────────────────────────────────────
 *
 * 1. **« Prochain versement le 5 septembre » : le versement mensuel n'existe pas.** Le cahier décrit
 *    un retrait à la demande (EF-13-07), et **aucune tâche planifiée n'existe côté serveur** — ni
 *    cron, ni lot. Le mensuel n'était qu'un décor : le garder aurait voulu dire le construire.
 * 2. **« Commission ULAMU de 12 % » retiré**, ainsi que les trois autres occurrences — voir S2.
 * 3. **« 5 000 XAF minimum » retiré.** Aucun minimum n'existe : le serveur accepte tout entier
 *    positif. Le prix plancher d'une offre est de 500 XAF ; un minimum à 5 000 aurait imposé douze
 *    consultations avant le premier retrait.
 * 4. **« Compte de versement · Vérifié · Changer de compte » retiré.** Rien de tel n'existe : le
 *    retrait part sur le TÉLÉPHONE DU COMPTE ULAMU. Changer de numéro de versement, c'est changer
 *    son téléphone, avec la double preuve d'EF-01-07. L'écran le dit et y renvoie.
 * 5. **« 500 XAF de frais opérateur » retiré.** Les frais ULAMU valent PM-02 (0 %) et sont annoncés
 *    dans le récapitulatif ; les frais de l'opérateur seront ceux de l'agrégateur retenu, qui n'est
 *    pas choisi (ADR-09). Écrire un montant serait inventer un barème.
 * 6. **Colonne « CANAL » (Téléconsultation / Cabinet) retirée** — la messagerie est le seul portail,
 *    et un médecin n'est rattachable à aucun cabinet. Elle ne dit quelque chose que pour un retrait :
 *    l'opérateur. C'est ce qu'elle affiche désormais, et rien pour les autres lignes.
 * 7. **« + 12 % vs juillet » retiré** — la comparaison au mois précédent supposerait un historique
 *    complet ; le journal en sert cinquante lignes.
 * 8. **« Relevé » (export) retiré** — aucun endpoint ne produit de relevé de gains.
 *
 * ── Le retrait se fait en DEUX temps, pas un ───────────────────────────────────────────────────
 *
 * EF-13-07 : le récapitulatif d'abord — montant, frais, délai — puis mot de passe ET code reçu. La
 * maquette n'affichait qu'un bouton « Confirmer le retrait ».
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  History,
  Hourglass,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import { api, type Earnings, type MomoOperator, type WithdrawalQuote } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { SqueletteCartes } from '@/components/ulamu/Squelette'
import { messageErreur } from '@/lib/message-erreur'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const moisFr = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' })

/** « moins d'une heure », « 24 h », « 3 jours » — un délai servi par le serveur, dit en clair. */
function delaiFr(secondes: number): string {
  if (secondes < 3600) return "moins d'une heure"
  const h = Math.round(secondes / 3600)
  if (h < 48) return `${h} h`
  return `${Math.round(h / 24)} jours`
}

const OPERATEURS: Array<{ code: MomoOperator; label: string }> = [
  { code: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { code: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

/** Les trois types de mouvement, dits en français plutôt qu'en code. */
const MOUVEMENTS: Record<string, { libelle: string; ton: TonPilule }> = {
  CREDIT: { libelle: 'Consultation', ton: 'succes' },
  WITHDRAWAL: { libelle: 'Retrait', ton: 'info' },
  REVERSAL: { libelle: 'Remboursement', ton: 'erreur' },
}

const ETATS_RETRAIT: Record<string, { libelle: string; ton: TonPilule }> = {
  PENDING: { libelle: 'En cours', ton: 'alerte' },
  EXECUTED: { libelle: 'Versé', ton: 'succes' },
  FAILED: { libelle: 'Échoué', ton: 'erreur' },
}

/** Le numéro du compte, masqué : assez pour se reconnaître, pas assez pour être lu par-dessus l'épaule. */
const masquer = (tel: string) => (tel.length > 4 ? `${tel.slice(0, 8)} •• •• ${tel.slice(-2)}` : tel)

type OngletMouvements = 'tous' | 'honoraires' | 'retraits'

// ── Le retrait, en deux temps ──────────────────────────────────────────────

function Retrait({ gains, telephone, onFini }: { gains: Earnings; telephone: string; onFini: () => void }) {
  const [montant, setMontant] = useState('')
  const [operateur, setOperateur] = useState<MomoOperator>('MTN_MOMO')
  const [devis, setDevis] = useState<WithdrawalQuote | null>(null)
  const [motDePasse, setMotDePasse] = useState('')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  const somme = Number.parseInt(montant, 10)
  const valide = Number.isInteger(somme) && somme > 0 && somme <= gains.availableXaf

  const demarrer = useMutation({
    mutationFn: () =>
      api.startWithdrawal({ holderType: 'PROFESSIONAL', holderId: gains.holderId, amountXaf: somme, operator: operateur }),
    onSuccess: (q) => {
      setDevis(q)
      setErreur(null)
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  const confirmer = useMutation({
    mutationFn: () => api.confirmWithdrawal({ withdrawalId: devis!.withdrawalId, password: motDePasse, otpCode: code.trim() }),
    onSuccess: () => {
      setFait(true)
      setDevis(null)
      setMontant('')
      setMotDePasse('')
      setCode('')
      onFini()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  if (gains.availableXaf === 0) {
    return (
      <Carte icone={ArrowDownToLine} titre="Retirer mes gains" sousTitre="Rien à retirer pour l'instant">
        <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          Vos honoraires deviennent retirables une fois le compte-rendu de la consultation déposé.
          Il n'y a ni date de versement, ni montant minimum : dès qu'il y a de l'argent, il est à vous.
        </p>
      </Carte>
    )
  }

  return (
    <Carte icone={ArrowDownToLine} titre="Retirer mes gains" sousTitre="Disponible au retrait, à tout moment">
      {!devis ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-40">
              <Label htmlFor="montant" className="mb-1.5 block text-[13px]">
                Montant à retirer
              </Label>
              <Input
                id="montant"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(e.target.value.replace(/\D/g, ''))}
                placeholder={String(gains.availableXaf)}
              />
            </div>
            <div className="min-w-0 flex-1 basis-44">
              <Label htmlFor="operateur" className="mb-1.5 block text-[13px]">
                Opérateur
              </Label>
              {/* Choisi à CHAQUE retrait : le serveur ne le mémorise nulle part. */}
              <Liste
                id="operateur"
                valeur={operateur}
                onChange={setOperateur}
                options={OPERATEURS.map((o) => ({ cle: o.code, label: o.label }))}
              />
            </div>
          </div>
          {/*
            Aucun minimum n'est annoncé, parce qu'il n'y en a pas : le serveur accepte tout entier
            strictement positif. Le seul garde-fou est le solde, revérifié au moment du débit.
          */}
          <p className="text-[11px] text-[var(--texte-tertiaire)]">
            Disponible : {xaf(gains.availableXaf)} F · versé sur {masquer(telephone)}, le numéro de votre compte ULAMU.
          </p>
          <div>
            <Button type="button" onClick={() => demarrer.mutate()} disabled={!valide || demarrer.isPending}>
              {demarrer.isPending ? 'Calcul…' : 'Continuer'}
            </Button>
            {montant && !valide ? (
              <p className="mt-1.5 text-[11px] text-[var(--alerte-texte)]">
                {somme > gains.availableXaf ? 'Montant supérieur à votre solde disponible.' : 'Saisissez un montant entier positif.'}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {/* EF-13-07 : les frais ET le délai sont annoncés AVANT confirmation. Les deux temps sont là pour ça. */}
          <dl className="flex flex-col gap-2 rounded-md border border-border bg-secondary p-3">
            <div className="flex justify-between gap-4 text-[13px]">
              <dt className="text-muted-foreground">Montant demandé</dt>
              <dd className="font-medium text-foreground">{xaf(devis.amountXaf)} F</dd>
            </div>
            <div className="flex justify-between gap-4 text-[13px]">
              <dt className="text-muted-foreground">Frais ULAMU</dt>
              <dd className="font-medium text-foreground">{xaf(devis.ulamuFeeXaf)} F</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-[13px] font-medium text-foreground">Vous recevrez</dt>
              <dd className="font-[family-name:var(--font-display)] text-[19px] font-bold text-foreground">
                {xaf(devis.netToReceiveXaf)} F
              </dd>
            </div>
            {/* Le délai vient de PM-36 (S3) : aucune durée n'est écrite dans ce fichier. */}
            <div className="flex justify-between gap-4 text-[12px]">
              <dt className="text-muted-foreground">Versé sous</dt>
              <dd className="text-foreground">{delaiFr(devis.payoutDelaySeconds)}</dd>
            </div>
          </dl>
          <Avis ton="info">
            Un code de confirmation vient d'être envoyé. Le versement partira sur {masquer(telephone)}.
          </Avis>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 basis-44">
              <Label htmlFor="retrait-mdp" className="mb-1.5 block text-[13px]">
                Mot de passe
              </Label>
              <Input
                id="retrait-mdp"
                type="password"
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1 basis-40">
              <Label htmlFor="retrait-code" className="mb-1.5 block text-[13px]">
                Code reçu
              </Label>
              <Input id="retrait-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => confirmer.mutate()}
              disabled={confirmer.isPending || motDePasse.length === 0 || code.trim().length !== 6}
            >
              {confirmer.isPending ? 'Envoi…' : 'Confirmer le retrait'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDevis(null)}>
              Modifier le montant
            </Button>
          </div>
        </>
      )}
      {fait ? <Avis ton="succes">Retrait demandé. Vous serez prévenu dès qu'il est versé.</Avis> : null}
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── L'histogramme des mois ─────────────────────────────────────────────────

/**
 * Les honoraires nets, mois par mois. Barres en CSS : une bibliothèque de graphiques pour six
 * rectangles serait plus lourde que l'application elle-même.
 *
 * Le journal ne sert que ses cinquante derniers mouvements. Cet histogramme ne montre donc que ce
 * qu'il contient — et quand la limite est atteinte, il le dit, au lieu de laisser croire à un
 * historique complet.
 */
function Histogramme({ mois, tronque }: { mois: Array<{ cle: string; label: string; net: number }>; tronque: boolean }) {
  const max = Math.max(1, ...mois.map((m) => m.net))
  return (
    <Carte icone={History} titre="Honoraires nets par mois" sousTitre="Nets de commission, tels que le journal les porte">
      <div className="flex h-40 items-end gap-2" role="img" aria-label="Honoraires nets par mois">
        {mois.map((m) => (
          <span key={m.cle} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-[var(--texte-tertiaire)]">{m.net > 0 ? xaf(m.net) : ''}</span>
            <span
              className="w-full rounded-t-[3px] bg-[var(--ap-400)]"
              style={{ height: `${Math.max(2, (m.net / max) * 100)}%` }}
            />
            <span className="text-[10px] text-[var(--texte-tertiaire)]">{m.label}</span>
          </span>
        ))}
      </div>
      {tronque ? (
        <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
          Le journal sert ses cinquante derniers mouvements : les mois plus anciens peuvent être
          incomplets.
        </p>
      ) : null}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function GainsPage() {
  const qc = useQueryClient()
  const moi = useSessionStore((s) => s.me)
  const id = moi?.accountId ?? ''
  const [onglet, setOnglet] = useState<OngletMouvements>('tous')

  const gains = useQuery({
    queryKey: ['earnings', id],
    queryFn: () => api.earnings('PROFESSIONAL', id),
    enabled: !!id,
    retry: false,
  })

  /**
   * Les séances, pour dire COMBIEN de comptes-rendus retiennent l'argent en attente. Le montant
   * seul (`pendingXaf`) laisse un médecin devant une somme bloquée sans savoir ce qui la débloque.
   */
  const seances = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.mySessions(), retry: false })
  const aSigner = (seances.data?.items ?? []).filter((s) => s.status === 'ENDED' && !s.reportDepositedAt).length

  const entries = useMemo(() => gains.data?.entries ?? [], [gains.data])

  /**
   * Le décompte du mois en cours — brut, commission, net.
   *
   * Le serveur ne découpe rien par mois, mais chaque mouvement porte sa date ET, depuis S2, son
   * brut et sa commission. L'agrégation est donc une ADDITION de valeurs servies, pas une
   * estimation : aucun taux n'est appliqué ici.
   */
  const moisEnCours = useMemo(() => {
    const debut = new Date()
    debut.setDate(1)
    debut.setHours(0, 0, 0, 0)
    const credits = entries.filter((e) => e.type === 'CREDIT' && new Date(e.createdAt) >= debut)
    return {
      nombre: credits.length,
      brut: credits.reduce((t, e) => t + (e.grossXaf ?? 0), 0),
      commission: credits.reduce((t, e) => t + (e.commissionXaf ?? 0), 0),
      net: credits.reduce((t, e) => t + e.amountXaf, 0),
      /** Vrai si au moins une ligne n'a pas son détail : le total brut serait alors sous-estimé. */
      detailIncomplet: credits.some((e) => e.grossXaf === null),
    }
  }, [entries])

  /** Les six derniers mois, du plus ancien au plus récent — nets crédités uniquement. */
  const parMois = useMemo(() => {
    const cases: Array<{ cle: string; label: string; net: number }> = []
    const curseur = new Date()
    curseur.setDate(1)
    curseur.setHours(0, 0, 0, 0)
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(curseur)
      d.setMonth(d.getMonth() - i)
      cases.push({ cle: `${d.getFullYear()}-${d.getMonth()}`, label: moisFr(d), net: 0 })
    }
    const parCle = new Map(cases.map((c) => [c.cle, c]))
    for (const e of entries) {
      if (e.type !== 'CREDIT') continue
      const d = new Date(e.createdAt)
      const c = parCle.get(`${d.getFullYear()}-${d.getMonth()}`)
      if (c) c.net += e.amountXaf
    }
    return cases
  }, [entries])

  const visibles = useMemo(() => {
    if (onglet === 'honoraires') return entries.filter((e) => e.type === 'CREDIT' || e.type === 'REVERSAL')
    if (onglet === 'retraits') return entries.filter((e) => e.type === 'WITHDRAWAL')
    return entries
  }, [entries, onglet])

  if (gains.isPending) {
    return (
      <SqueletteCartes nombre={3} hauteur={104} libelle="Lecture de vos gains…" />
    )
  }

  if (gains.isError || !gains.data) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Vos gains n'ont pas pu être chargés" sousTitre="Rien n'est perdu">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Le journal des mouvements est tenu côté serveur : il reste intact. Vérifiez votre connexion, puis réessayez.
          </p>
          <div>
            <Button type="button" onClick={() => gains.refetch()}>
              Réessayer
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const g = gains.data
  const rafraichir = () => qc.invalidateQueries({ queryKey: ['earnings', id] })
  const nbHonoraires = entries.filter((e) => e.type === 'CREDIT' || e.type === 'REVERSAL').length
  const nbRetraits = entries.filter((e) => e.type === 'WITHDRAWAL').length

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Wallet size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">Mes gains</h1>
          {/*
            Ni date de versement, ni taux. Le versement mensuel n'existe pas côté serveur, et le taux
            appliqué dépend du contrat signé de chacun — il se lit ligne par ligne, plus bas.
          */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            Retirables à tout moment · la commission est déjà déduite de chaque montant
          </p>
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Carte icone={Banknote} titre="Disponible au retrait" sousTitre="À tout moment, sans minimum">
          <p className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none text-foreground">
            {xaf(g.availableXaf)} <span className="text-[13px] font-normal text-[var(--texte-tertiaire)]">F</span>
          </p>
        </Carte>

        <Carte icone={Hourglass} titre="En attente" sousTitre="Consultations honorées, compte-rendu manquant">
          <p className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none text-foreground">
            {xaf(g.pendingXaf)} <span className="text-[13px] font-normal text-[var(--texte-tertiaire)]">F</span>
          </p>
          {/*
            La chose la plus utile que cet écran puisse dire. RM-06-04 : « gains crédités uniquement
            après dépôt du compte-rendu — qualité avant trésorerie ». Un médecin qui voit de l'argent
            bloqué sans savoir pourquoi accuse la plateforme ; celui qui sait va écrire son rapport.
          */}
          {g.pendingXaf > 0 ? (
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              {aSigner > 0
                ? `${aSigner} compte${aSigner > 1 ? 's' : ''}-rendu${aSigner > 1 ? 's' : ''} à déposer. Cet argent devient retirable dès leur dépôt.`
                : 'Cet argent devient retirable dès le dépôt du compte-rendu de la consultation correspondante.'}
            </p>
          ) : null}
          {/*
            D-008, invariant n°9. Ce n'est pas la même chose que le compte-rendu manquant : là, la
            somme attend ; ici, elle peut disparaître entièrement. Dit près du montant en attente,
            parce que c'est cet argent-là qui est en jeu.
          */}
          {g.pendingXaf > 0 ? (
            <p className="text-[11px] leading-[1.5] text-[var(--alerte-texte)]">
              Une consultation terminée sans un seul message de votre part est intégralement
              remboursée au patient : elle ne sera jamais créditée.
            </p>
          ) : null}
        </Carte>

        <Carte icone={History} titre="Ce mois-ci" sousTitre="Depuis le 1er du mois">
          <p className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none text-foreground">
            {xaf(moisEnCours.net)} <span className="text-[13px] font-normal text-[var(--texte-tertiaire)]">F</span>
          </p>
          <p className="text-[11px] text-[var(--texte-tertiaire)]">
            {moisEnCours.nombre} consultation{moisEnCours.nombre > 1 ? 's' : ''} créditée{moisEnCours.nombre > 1 ? 's' : ''}
          </p>
        </Carte>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <section aria-label="Journal des gains" className="flex min-w-0 flex-1 flex-col gap-4">
          <Histogramme mois={parMois} tronque={entries.length >= 50} />

          {/*
            Le « Décompte du mois » de la maquette, avec ses vrais chiffres. La ligne de commission
            ne porte AUCUN taux écrit : elle en déduit un de ce qui a été prélevé — et si les contrats
            diffèrent d'un mois à l'autre, le pourcentage affiché suit, parce qu'il est calculé sur
            les montants et non posé d'avance.
          */}
          {moisEnCours.nombre > 0 ? (
            <Carte icone={Banknote} titre="Décompte du mois" sousTitre="En cours — brut, commission, net">
              <dl className="flex flex-col gap-2">
                <div className="flex justify-between gap-4 text-[13px]">
                  <dt className="text-muted-foreground">
                    Honoraires bruts
                    <span className="block text-[11px] text-[var(--texte-tertiaire)]">
                      {moisEnCours.nombre} consultation{moisEnCours.nombre > 1 ? 's' : ''} honorée
                      {moisEnCours.nombre > 1 ? 's' : ''}
                    </span>
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">{xaf(moisEnCours.brut)} F</dd>
                </div>
                <div className="flex justify-between gap-4 text-[13px]">
                  <dt className="text-muted-foreground">
                    Commission ULAMU
                    <span className="block text-[11px] text-[var(--texte-tertiaire)]">
                      Prélevée à la clôture, au taux de votre contrat signé
                    </span>
                  </dt>
                  <dd className="font-medium tabular-nums text-[var(--erreur-texte)]">− {xaf(moisEnCours.commission)} F</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="text-[13px] font-medium text-foreground">Net encaissé</dt>
                  <dd className="font-[family-name:var(--font-display)] text-[19px] font-bold tabular-nums text-foreground">
                    {xaf(moisEnCours.net)} F
                  </dd>
                </div>
              </dl>
              {moisEnCours.detailIncomplet ? (
                <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Le détail d'au moins un mouvement n'a pas pu être retrouvé : le brut et la commission
                  affichés sont donc incomplets. Le net, lui, est exact — c'est le journal qui le porte.
                </p>
              ) : null}
            </Carte>
          ) : null}

          <Carte icone={History} titre="Mouvements" sousTitre="Le journal fait foi (EF-13-06)">
            {entries.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
                Aucun mouvement pour le moment. Votre première consultation créditée apparaîtra ici.
                Une demande refusée ou expirée n'en produit aucun.
              </p>
            ) : (
              <>
                <Segments
                  label="Filtrer les mouvements"
                  valeur={onglet}
                  onChange={setOnglet}
                  options={[
                    { cle: 'tous', label: `Tous ${entries.length}` },
                    { cle: 'honoraires', label: `Honoraires ${nbHonoraires}` },
                    { cle: 'retraits', label: `Retraits ${nbRetraits}` },
                  ]}
                />
                <ul aria-label="Mouvements" className="flex flex-col gap-1.5">
                  {visibles.map((e) => {
                    const t = MOUVEMENTS[e.type] ?? { libelle: e.type, ton: 'neutre' as TonPilule }
                    return (
                      <li key={e.id} className="ul-ligne-dense flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                        <Pilule ton={t.ton}>{t.libelle}</Pilule>
                        <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--texte-tertiaire)]">{dateFr(e.createdAt)}</span>
                        <span className="shrink-0 text-right">
                          <span
                            className={
                              'block font-mono text-[13px] font-semibold tabular-nums ' +
                              (e.amountXaf < 0 ? 'text-[var(--erreur-texte)]' : 'text-foreground')
                            }
                          >
                            {e.amountXaf > 0 ? '+' : ''}
                            {xaf(e.amountXaf)} F
                          </span>
                          {/*
                            S2 : le brut et la commission, à côté du net. Le pourcentage est DÉDUIT
                            des deux montants — il n'est écrit nulle part, et il diffère légitimement
                            d'un médecin à l'autre (RM-13-07).
                          */}
                          {e.grossXaf !== null && e.commissionXaf !== null ? (
                            <span className="block text-[10px] text-[var(--texte-tertiaire)]">
                              brut {xaf(e.grossXaf)} · commission {xaf(e.commissionXaf)} (
                              {Math.round((e.commissionXaf / Math.max(1, e.grossXaf)) * 100)} %)
                            </span>
                          ) : null}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {visibles.length === 0 ? (
                  <p className="py-3 text-center text-[12px] text-[var(--texte-tertiaire)]">
                    Aucun mouvement de ce type.
                  </p>
                ) : null}
              </>
            )}
          </Carte>

          {g.withdrawals.length > 0 ? (
            <Carte icone={ArrowDownToLine} titre="Retraits demandés" sousTitre="Où en est l'argent que vous avez demandé">
              <ul className="flex flex-col gap-1.5">
                {g.withdrawals.map((w) => {
                  const t = ETATS_RETRAIT[w.status] ?? { libelle: w.status, ton: 'neutre' as TonPilule }
                  return (
                    <li key={w.id} className="ul-ligne-dense flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Pilule ton={t.ton}>{t.libelle}</Pilule>
                        <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--texte-tertiaire)]">
                          {dateFr(w.requestedAt)} · {OPERATEURS.find((o) => o.code === w.operator)?.label ?? w.operator}
                        </span>
                        <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-foreground">
                          {xaf(w.amountXaf)} F
                        </span>
                      </span>
                      {/* Un échec sans motif laisse le médecin sans recours : on le dit toujours. */}
                      {w.failReason ? <span className="text-[11px] text-[var(--erreur-texte)]">{w.failReason}</span> : null}
                    </li>
                  )
                })}
              </ul>
            </Carte>
          ) : null}
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <Retrait gains={g} telephone={moi?.phone ?? ''} onFini={rafraichir} />

          <Carte icone={Smartphone} titre="Où part l'argent" sousTitre="Le numéro de votre compte ULAMU">
            <p className="font-mono text-[14px] font-semibold text-foreground">{masquer(moi?.phone ?? '')}</p>
            {/*
              La maquette montrait un « compte de versement » enregistré, « Vérifié », avec un bouton
              « Changer de compte ». Rien de tel n'existe : aucun modèle en base, et le retrait part
              sur le téléphone du compte lui-même. Le dire, et renvoyer là où ça se change vraiment,
              vaut mieux qu'un réglage qui n'existe pas.
            */}
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Il n'y a pas de compte de versement séparé : les retraits partent sur le numéro de votre
              compte ULAMU. Pour en changer, modifiez votre téléphone — la preuve est demandée sur
              l'ancien ET le nouveau numéro.
            </p>
            <div>
              <Button asChild size="sm" variant="outline">
                <Link to="/parametres?section=securite">Modifier mon numéro</Link>
              </Button>
            </div>
          </Carte>
        </aside>
      </div>
    </div>
  )
}
