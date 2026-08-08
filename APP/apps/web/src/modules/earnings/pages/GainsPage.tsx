/**
 * Mes gains — M13, CU-13-04 / EF-13-07.
 *
 * Deux montants, jamais confondus : ce qui est **disponible** et ce qui est **en attente de
 * capture** (EF-13-06). Les additionner donnerait un solde flatteur mais faux, et un soignant
 * demanderait un retrait supérieur à ce qui peut réellement partir.
 *
 * ⚠️ Le retrait est une action sensible en deux temps, imposée par `EF-13-07` :
 *  1. **Le récapitulatif annonce les frais AVANT toute confirmation.** Un montant net découvert
 *     après coup est la meilleure façon de perdre la confiance d'un soignant sur son premier
 *     virement.
 *  2. **Mot de passe ET code OTP.** L'argent qui sort d'un compte ne se déclenche pas d'un clic.
 */
import { useCallback, useEffect, useState } from 'react'
import { Banknote, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, type Earnings, type MomoOperator, type WithdrawalQuote } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const xaf = (n: number) => `${n.toLocaleString('fr-FR')} XAF`

const OPERATEURS: { code: MomoOperator; label: string }[] = [
  { code: 'MTN_MOMO', label: 'MTN MoMo' },
  { code: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

export function GainsPage() {
  const me = useSessionStore((s) => s.me)
  const [gains, setGains] = useState<Earnings | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  /**
   * Le porteur des gains dépend du rôle, et le serveur vérifie l'accès de toute façon :
   *  • un **soignant** encaisse pour lui-même ;
   *  • une **structure** encaisse pour l'officine — et `EF-02-05` réserve les retraits au titulaire,
   *    ce que le serveur refusera à un simple membre.
   * Dupliquer la page pour ce seul paramètre aurait créé deux écrans à maintenir en parallèle, donc
   * deux occasions de divergence sur des règles qui touchent à l'argent.
   */
  const charger = useCallback(async () => {
    if (!me) return
    try {
      if (me.accountType === 'FACILITY_MEMBER') {
        const f = await api.myFacility()
        if (!f) {
          setEtat('erreur')
          return
        }
        setGains(await api.earnings('FACILITY', f.id))
      } else {
        setGains(await api.earnings('PROFESSIONAL', me.accountId))
      }
      setEtat('pret')
    } catch {
      setEtat((e) => (e === 'pret' ? 'pret' : 'erreur'))
    }
  }, [me])

  useEffect(() => {
    charger()
  }, [charger])

  if (etat === 'chargement') return <LoadingState label="Chargement de vos gains…" onRetry={charger} />
  if (etat === 'erreur' || !gains) return <ErrorState onRetry={charger} />

  return (
    <div>
      <PageHeader
        icon={<Wallet size={20} />}
        title="Mes gains"
        subtitle="Ce que vous avez perçu, et ce que vous pouvez retirer maintenant."
      />

      <section className="ul-card" aria-labelledby="solde-titre">
        <div className="ul-card__head">
          <h2 id="solde-titre" className="t-display-sm" style={{ margin: 0 }}>
            Solde
          </h2>
        </div>

        {/* Les deux montants sont SÉPARÉS et nommés. Les additionner donnerait un solde flatteur mais
            faux : le « en attente » ne peut pas encore partir. */}
        <div className="ul-choix" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="ul-choix__item is-active" style={{ cursor: 'default' }}>
            <Banknote size={18} aria-hidden="true" />
            <span>
              <span className="t-display-md" style={{ display: 'block' }}>
                {xaf(gains.availableXaf)}
              </span>
              <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                Disponible — retirable maintenant
              </span>
            </span>
          </div>
          <div className="ul-choix__item" style={{ cursor: 'default' }}>
            <Banknote size={18} aria-hidden="true" />
            <span>
              <span className="t-display-md" style={{ display: 'block' }}>
                {xaf(gains.pendingXaf)}
              </span>
              <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
                En attente — confirmé, pas encore versé
              </span>
            </span>
          </div>
        </div>
      </section>

      <SectionRetrait gains={gains} onFait={charger} />

      <section className="ul-card" aria-labelledby="mouvements-titre">
        <div className="ul-card__head">
          <h2 id="mouvements-titre" className="t-display-sm" style={{ margin: 0 }}>
            Mouvements
          </h2>
        </div>
        {gains.entries.length === 0 ? (
          <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
            Aucun mouvement pour l’instant. Vos gains apparaîtront ici après chaque consultation réglée.
          </p>
        ) : (
          <ul className="ul-doclist">
            {gains.entries.map((e) => (
              <li className="ul-docrow" key={e.id}>
                <span className="ul-docrow__label">
                  {e.type}
                  <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                    {new Date(e.createdAt).toLocaleString('fr-FR')} · {e.reference}
                  </span>
                </span>
                {/* Le signe est porté par la couleur ET par le texte : une sortie d'argent ne doit
                    jamais se distinguer d'une entrée par la seule teinte (CG-11). */}
                <StatusPill tone={e.amountXaf >= 0 ? 'success' : 'neutral'}>
                  {e.amountXaf >= 0 ? '+' : '−'} {xaf(Math.abs(e.amountXaf))}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ── Retrait en deux temps (EF-13-07) ─────────────────────────────────────────────────────────── */

function SectionRetrait({ gains, onFait }: { gains: Earnings; onFait: () => void }) {
  const [montant, setMontant] = useState('')
  const [operateur, setOperateur] = useState<MomoOperator>('MTN_MOMO')
  const [devis, setDevis] = useState<WithdrawalQuote | null>(null)
  const [motDePasse, setMotDePasse] = useState('')
  const [code, setCode] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  const valeur = Number(montant || 0)
  const excessif = valeur > gains.availableXaf

  const demander = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      setDevis(
        await api.startWithdrawal({
          holderType: gains.holderType,
          holderId: gains.holderId,
          amountXaf: valeur,
          operator: operateur,
        }),
      )
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Demande impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const confirmer = async () => {
    if (!devis) return
    setErreur(null)
    setOccupe(true)
    try {
      await api.confirmWithdrawal({ withdrawalId: devis.withdrawalId, password: motDePasse, otpCode: code })
      setFait(true)
      setDevis(null)
      setMontant('')
      setMotDePasse('')
      setCode('')
      onFait()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Confirmation impossible — vérifiez vos informations.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="ul-card" aria-labelledby="retrait-titre">
      <div className="ul-card__head">
        <h2 id="retrait-titre" className="t-display-sm" style={{ margin: 0 }}>
          Retirer mes gains
        </h2>
      </div>

      {fait ? (
        <div className="ul-notice" role="status">
          <p className="t-text-sm" style={{ margin: 0 }}>
            Retrait confirmé. Le versement part vers votre compte Mobile Money.
          </p>
        </div>
      ) : null}

      {!devis ? (
        <>
          <Field
            label="Montant à retirer (XAF)"
            value={montant}
            onChange={(e) => setMontant(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            error={excessif ? `Supérieur à votre solde disponible (${xaf(gains.availableXaf)})` : undefined}
            hint={!excessif ? `Disponible : ${xaf(gains.availableXaf)}` : undefined}
          />

          {/* M13 : l'opérateur est choisi EXPLICITEMENT, jamais déduit d'un préfixe de numéro. Même
              règle que sur le paiement patient — un versement envoyé au mauvais réseau se récupère
              mal. */}
          <div className="ul-choix" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {OPERATEURS.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => setOperateur(o.code)}
                aria-pressed={operateur === o.code}
                className={['ul-choix__item', 'saris-focus-ring', operateur === o.code ? 'is-active' : ''].filter(Boolean).join(' ')}
              >
                <span className="t-label-md">{o.label}</span>
              </button>
            ))}
          </div>

          <div>
            <Button onClick={demander} loading={occupe} disabled={occupe || valeur < 1 || excessif}>
              Continuer
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* EF-13-07 : les frais sont annoncés AVANT confirmation. Un net découvert après coup est
              la meilleure façon de perdre la confiance d'un soignant sur son premier virement. */}
          <div className="ul-notice ul-notice--warning" role="note">
            <p className="t-label-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TriangleAlert size={15} aria-hidden="true" /> Récapitulatif avant confirmation
            </p>
            <p className="t-text-sm" style={{ margin: 0 }}>
              Montant demandé : <strong>{xaf(devis.amountXaf)}</strong>
              <br />
              Frais ULAMU : <strong>{xaf(devis.ulamuFeeXaf)}</strong>
              <br />
              Vous recevrez : <strong>{xaf(devis.netToReceiveXaf)}</strong> sur {devis.operator}
            </p>
          </div>

          <Field label="Votre mot de passe" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <Field
            label="Code reçu"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
          />

          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={confirmer} loading={occupe} disabled={occupe || !motDePasse || code.length < 6}>
              Confirmer le retrait
            </Button>
            <Button variant="ghost" onClick={() => setDevis(null)} disabled={occupe}>
              Retour
            </Button>
          </div>
        </>
      )}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </section>
  )
}
