/**
 * C6 — Mes gains. D'après `docs/maquettes/C6 - Mes gains.dc.html` et le cahier des charges M13.
 *
 * L'argent : ce qui est retirable, ce qui attend, ce qui a bougé, et comment le faire venir sur son
 * Mobile Money.
 *
 * ── L'écart majeur : le « compte de versement » n'existe pas ───────────────────────────────────
 *
 * La maquette montre un compte enregistré — « Mobile Money · MTN Congo · Vérifié · +242 06 •• •• 03 »
 * — avec un bouton « Changer de compte » et une confirmation par code. **Rien de tout cela n'existe.**
 * Aucun modèle de compte de versement en base ; `startWithdrawal` lit `actorAccount.phone`, c'est-à-dire
 * le TÉLÉPHONE DU COMPTE ULAMU lui-même.
 *
 * Conséquence, et elle est importante à dire : changer de numéro de versement, c'est changer le
 * téléphone de son compte — dans Mes paramètres, avec la double preuve qu'exige EF-01-07. L'écran
 * l'explique et y renvoie, au lieu d'afficher un réglage qui n'existe pas.
 *
 * L'opérateur, lui, se choisit à CHAQUE retrait : il n'est mémorisé nulle part.
 *
 * ── Trois autres écarts ───────────────────────────────────────────────────────────────────────
 *
 * • **Le retrait se fait en DEUX temps**, pas un. EF-13-07 : les frais sont annoncés AVANT
 *   confirmation. `start` chiffre et envoie un code, `confirm` exige mot de passe ET code. La
 *   maquette n'affichait qu'un bouton « Confirmer le retrait ».
 * • **« Relevé » (export) retiré** : aucun endpoint ne produit un relevé de gains.
 * • **« Décompte du mois »** : aucun découpage mensuel côté serveur, mais chaque mouvement porte sa
 *   date. L'agrégation est faite ici, sur des données réelles — c'est un calcul, pas une invention.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownToLine, Banknote, History, Hourglass, Smartphone, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { api, ApiError, type Earnings, type MomoOperator, type WithdrawalQuote } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')
const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

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
    onError: (e) => setErreur(messageDe(e)),
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
    onError: (e) => setErreur(messageDe(e)),
  })

  if (gains.availableXaf === 0) {
    return (
      <Carte icone={ArrowDownToLine} titre="Retirer mes gains" sousTitre="Rien à retirer pour l'instant">
        <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          Vos honoraires deviennent retirables une fois le compte-rendu de la consultation déposé.
        </p>
      </Carte>
    )
  }

  return (
    <Carte icone={ArrowDownToLine} titre="Retirer mes gains" sousTitre="Vers votre Mobile Money, en deux étapes">
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
              <NativeSelect id="operateur" value={operateur} onChange={(e) => setOperateur(e.target.value as MomoOperator)}>
                {OPERATEURS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
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
          {/* EF-13-07 : les frais sont annoncés AVANT confirmation. C'est le sens des deux temps. */}
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

// ── Écran ──────────────────────────────────────────────────────────────────

export function GainsPage() {
  const qc = useQueryClient()
  const moi = useSessionStore((s) => s.me)
  const id = moi?.accountId ?? ''

  const gains = useQuery({
    queryKey: ['earnings', id],
    queryFn: () => api.earnings('PROFESSIONAL', id),
    enabled: !!id,
    retry: false,
  })

  /**
   * Le décompte du mois en cours.
   *
   * Le serveur ne découpe rien par mois — mais chaque mouvement porte sa date. L'agrégation est
   * donc un CALCUL sur des données réelles, pas une estimation : on additionne ce qui existe.
   */
  const moisEnCours = useMemo(() => {
    const entries = gains.data?.entries ?? []
    const debut = new Date()
    debut.setDate(1)
    debut.setHours(0, 0, 0, 0)
    const duMois = entries.filter((e) => new Date(e.createdAt) >= debut)
    return {
      credits: duMois.filter((e) => e.type === 'CREDIT').reduce((t, e) => t + e.amountXaf, 0),
      nombre: duMois.filter((e) => e.type === 'CREDIT').length,
    }
  }, [gains.data?.entries])

  if (gains.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Lecture de vos gains…
      </p>
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
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            Honoraires nets, après la commission ULAMU déjà déduite
          </p>
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Carte icone={Banknote} titre="Disponible au retrait" sousTitre="Retirable maintenant">
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
              Cet argent vous attend. Il devient retirable dès que vous déposez le compte-rendu de la
              consultation correspondante.
            </p>
          ) : null}
        </Carte>

        <Carte icone={History} titre="Ce mois-ci" sousTitre="Depuis le 1er du mois">
          <p className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none text-foreground">
            {xaf(moisEnCours.credits)} <span className="text-[13px] font-normal text-[var(--texte-tertiaire)]">F</span>
          </p>
          <p className="text-[11px] text-[var(--texte-tertiaire)]">
            {moisEnCours.nombre} consultation{moisEnCours.nombre > 1 ? 's' : ''} créditée{moisEnCours.nombre > 1 ? 's' : ''}
          </p>
        </Carte>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <section aria-label="Mouvements" className="flex min-w-0 flex-1 flex-col gap-4">
          <Carte icone={History} titre="Mouvements" sousTitre="Le journal fait foi (EF-13-06)">
            {g.entries.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
                Aucun mouvement pour le moment. Votre première consultation créditée apparaîtra ici.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {g.entries.map((e) => {
                  const t = MOUVEMENTS[e.type] ?? { libelle: e.type, ton: 'neutre' as TonPilule }
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                      <Pilule ton={t.ton}>{t.libelle}</Pilule>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--texte-tertiaire)]">{dateFr(e.createdAt)}</span>
                      <span
                        className={
                          'shrink-0 font-mono text-[13px] font-semibold tabular-nums ' +
                          (e.amountXaf < 0 ? 'text-[var(--erreur-texte)]' : 'text-foreground')
                        }
                      >
                        {e.amountXaf > 0 ? '+' : ''}
                        {xaf(e.amountXaf)} F
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Carte>

          {g.withdrawals.length > 0 ? (
            <Carte icone={ArrowDownToLine} titre="Retraits demandés" sousTitre="Où en est l'argent que vous avez demandé">
              <ul className="flex flex-col gap-1.5">
                {g.withdrawals.map((w) => {
                  const t = ETATS_RETRAIT[w.status] ?? { libelle: w.status, ton: 'neutre' as TonPilule }
                  return (
                    <li key={w.id} className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2">
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
