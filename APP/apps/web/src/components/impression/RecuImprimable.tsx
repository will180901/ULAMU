/**
 * Le reçu de paiement, sur papier — chantier 132, 15/09/2026 (EF-13-05).
 *
 * ── Pourquoi ce document ─────────────────────────────────────────────────────────────────────
 *
 * Un reçu n'existe pas pour celui qui l'émet : il existe pour celui qui devra **le présenter à
 * quelqu'un d'autre** — un employeur, une mutuelle, un comptable. Jusqu'ici il ne vivait qu'à
 * l'écran d'un téléphone.
 *
 * > **Un justificatif qui ne peut pas quitter l'appareil ne justifie rien.**
 *
 * ── Ce qu'il porte, et pourquoi chaque ligne y est ────────────────────────────────────────────
 *
 * 📌 **Le libellé de ce qui a été acheté** — figé à la commande (chantiers 118 et 126). Ce n'est
 * pas une catégorie devinée : c'est le nom que le soignant avait donné à son offre au moment où le
 * patient a payé. *Un reçu qui suit sa source n'est plus une trace.*
 *
 * 📌 **Le numéro de reçu et la référence d'ordre** : les deux chiffres qu'un comptable demandera,
 * et les seuls qui permettent de retrouver l'opération.
 *
 * 📌 **La mention « aucun frais caché »** — elle est vraie (D-010 : le prix servi est FINAL,
 * commission incluse) et c'est la promesse que l'écran de paiement fait avant de débiter. *Une
 * garantie donnée avant l'acte doit se retrouver sur la preuve de l'acte.*
 *
 * ⚠️ **Un remboursement s'imprime comme un remboursement**, jamais comme un paiement : le signe et
 * le mot changent. Présenter un remboursement comme une dépense fausserait une note de frais.
 */
/**
 * Ce qu'un reçu porte — décrit ICI et non importé de `@/lib/api`.
 *
 * ⚠️ Le web est l'espace du soignant et de l'administration : il n'a **aucune** route de reçus, qui
 * sont le justificatif du PAYEUR. Le contrat vit donc côté mobile. Ce document, lui, sera nourri
 * par la page d'impression servie sur jeton — d'où une forme décrite en propre, minimale.
 *
 * *Un composant qui importe un type qu'aucun écran de son application ne produit prétend appartenir
 * à une chaîne dont il ne fait pas partie.*
 */
export interface RecuAImprimer {
  number: string
  kind: string
  orderRef: string
  amountXaf: number
  createdAt: string
  /** Ce qui a été acheté, figé à la commande (chantiers 118 et 126). `null` pour les reçus d'avant. */
  label: string | null
}

import {
  FeuilleImpression,
  IMPRESSION_ACCENT,
  IMPRESSION_CHIFFRES,
  IMPRESSION_DOUX,
  IMPRESSION_FILET,
  IMPRESSION_GRIS,
  IMPRESSION_TITRAGE,
  TitreSection,
} from './FeuilleImpression'

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) +
  ' à ' +
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** « 5 000 F » — séparateur d'espace, indépendant de l'ICU du poste. */
const montantXaf = (xaf: number) => String(Math.round(xaf)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F'

export interface RecuImprimableProps {
  recu: RecuAImprimer
  /** Le nom du payeur — il figure sur le justificatif qu'il présentera. */
  payeur: string
  onFermer: () => void
}

export function RecuImprimable({ recu, payeur, onFermer }: RecuImprimableProps) {
  const remboursement = (recu.kind || '').toLowerCase().includes('refund')
  /*
    Le libellé figé l'emporte ; à défaut — reçus d'avant la colonne — on retombe sur la catégorie
    déduite de la référence, comme l'écran le fait. *Mieux vaut une catégorie honnête qu'un nom
    inventé.*
  */
  const intitule = (recu.label ?? '').trim() || (remboursement ? 'Remboursement' : 'Consultation')

  return (
    <FeuilleImpression
      document={remboursement ? 'Reçu de remboursement' : 'Reçu de paiement'}
      reference={recu.number}
      mention="ULAMU · Reçu à conserver — aucun frais n’a été prélevé au-delà du montant indiqué"
      blocs={[
        {
          titre: remboursement ? 'Bénéficiaire' : 'Payeur',
          lignes: [
            ['Nom', payeur],
            ['Date', dateHeureFr(recu.createdAt)],
          ],
        },
        {
          titre: 'Opération',
          /*
            ⚠️ Le numéro de reçu n'est PAS repris ici : le gabarit le porte déjà en en-tête et en
            pied. L'écrire une troisième fois sur une feuille dense n'apprend rien — *deux fois la
            même information n'est pas deux fois plus sûre, c'est une ligne de moins pour ce qui
            manque.* Reste la référence d'ordre, qui, elle, ne figure nulle part ailleurs.
          */
          lignes: [
            ['Référence', recu.orderRef],
            ['Moyen', 'Mobile Money'],
          ],
        },
      ]}
      onFermer={onFermer}
    >
      <TitreSection>Détail</TitreSection>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <tbody>
          <tr data-insecable style={{ borderBottom: `1px solid ${IMPRESSION_FILET}` }}>
            <td style={{ padding: '11px 0' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5 }}>{intitule}</p>
              <p style={{ margin: '2px 0 0', fontSize: 9.5, color: IMPRESSION_GRIS }}>
                {remboursement
                  ? 'Somme rendue au payeur — la consultation n’a pas eu lieu comme prévu.'
                  : 'Consultation par messagerie sur ULAMU, payée par Mobile Money.'}
              </p>
            </td>
            <td style={{ padding: '11px 0', textAlign: 'right', fontFamily: IMPRESSION_CHIFFRES, fontSize: 13, whiteSpace: 'nowrap' }}>
              {remboursement ? '+' : ''}
              {montantXaf(recu.amountXaf)}
            </td>
          </tr>
        </tbody>
      </table>

      {/*
        ⚠️ **Le TOTAL, en grand.** C'est le seul chiffre que le lecteur du reçu cherchera — un
        comptable, un employeur. L'enfouir dans un tableau le ferait recompter à la main.
      */}
      <div
        data-insecable
        style={{
          background: IMPRESSION_DOUX,
          border: `1px solid ${IMPRESSION_FILET}`,
          borderLeft: `3px solid ${IMPRESSION_ACCENT}`,
          padding: '14px 17px',
          marginTop: 16,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: IMPRESSION_TITRAGE,
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: IMPRESSION_ACCENT,
          }}
        >
          {remboursement ? 'Total remboursé' : 'Total payé'}
        </span>
        <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: IMPRESSION_CHIFFRES }}>
          {montantXaf(recu.amountXaf)}
        </span>
      </div>

      {/*
        La promesse faite AVANT le paiement se retrouve sur la preuve du paiement. C'est exact :
        D-010 — le prix servi est FINAL, commission incluse, et les frais d'opérateur sortent de la
        commission d'ULAMU (décision du porteur, 14/09).
      */}
      <p style={{ margin: '14px 0 0', fontSize: 10, lineHeight: 1.65, color: IMPRESSION_GRIS, textAlign: 'justify' }}>
        Le montant ci-dessus est celui qui a été débité, sans aucun frais supplémentaire : les frais
        de l’opérateur Mobile Money sont pris en charge par ULAMU.
      </p>
    </FeuilleImpression>
  )
}
