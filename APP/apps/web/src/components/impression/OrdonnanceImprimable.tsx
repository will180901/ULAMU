/**
 * L'ordonnance, sur papier — chantier 131, 15/09/2026 (EF-09, CU-09).
 *
 * ── Pourquoi ce document passe en premier ─────────────────────────────────────────────────────
 *
 * C'est le seul des quatre qui sorte d'ULAMU pour entrer dans un autre lieu : **une pharmacie**.
 * L'ordonnance existait pourtant seulement à l'écran — *et un écran demande une batterie, du
 * réseau, et un comptoir qui accepte qu'on lui tende un téléphone.*
 *
 * > **Un document qui doit être présenté ailleurs doit pouvoir quitter l'appareil.**
 *
 * ⚠️ **Piège évité en écrivant ce fichier, le 15/09.** Le premier jet appelait le QR « code de
 * délivrance » et promettait que « la pharmacie le scanne pour enregistrer la délivrance ». C'est
 * FAUX, et c'est le mensonge exact que le chantier 27 avait retiré de l'écran le 02/09 : **ULAMU
 * n'est relié à aucune officine.** Le QR est un SCEAU — il prouve que l'ordonnance n'a pas été
 * modifiée depuis sa signature, rien de plus.
 *
 * *Une phrase fausse retirée d'un écran revient par le document qu'on imprime, si personne ne la
 * garde des deux côtés.*
 *
 * ── Les trois choses que ce corps ne doit jamais perdre ───────────────────────────────────────
 *
 * 📌 **Le sceau est imprimé.** Il ne sert pas à retirer des médicaments : il permet de vérifier que
 * la feuille présentée est bien celle que le soignant a signée, et qu'elle n'a pas été retouchée
 * entre-temps. *Sur du papier qui se photocopie, c'est la seule chose qui distingue l'original.*
 *
 * 📌 **La date de validité** (PM-10, servie par le serveur) : une ordonnance périmée présentée en
 * pharmacie fait perdre le déplacement. Elle est écrite en clair, pas en petits caractères.
 *
 * 📌 **La posologie, mot pour mot.** C'est la seule ligne du document que quelqu'un va SUIVRE. Le
 * chantier 88 l'avait déjà dit : *une posologie est lue par quelqu'un qui délivre un médicament* —
 * elle est donc rendue avec sa mise en forme, jamais résumée.
 *
 * ⚠️ **Et ce que ce document ne porte PAS** : aucun cadre « signature et cachet ». Personne ne
 * signe cette feuille à la main — la signature est électronique, et sa preuve est le QR. *Un cadre
 * vide sur un document médical invite à le remplir après coup.*
 */
import { type CSSProperties, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Prescription } from '@/lib/api'
import { TexteMisEnForme } from '@/components/ulamu/TexteMisEnForme'
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

const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * L'en-tête des colonnes, dans le titrage du gabarit — écrit UNE fois.
 *
 * ⚠️ Les trois cellules le recopiaient chacune de leur côté, et deux replis nommaient « Inter »
 * en toutes lettres — une police qui n'est même pas celle du titrage des documents. *Une
 * typographie recopiée dans un coin ne suit pas le gabarit : le jour où il change, ce coin-là reste
 * en arrière, et deux documents d'ULAMU cessent de se ressembler.*
 */
const ENTETE_COLONNE: CSSProperties = {
  padding: '7px 10px',
  fontFamily: IMPRESSION_TITRAGE,
  fontSize: 8,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: IMPRESSION_ACCENT,
}

/** Le sceau, fabriqué SUR LE POSTE : le jeton ne part vers aucun service extérieur. */
function SceauQr({ jeton }: { jeton: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivant = true
    void QRCode.toDataURL(jeton, { margin: 0, width: 260 }).then((u) => vivant && setUrl(u))
    return () => {
      vivant = false
    }
  }, [jeton])
  // 128 px à l'écran ≈ 34 mm sur le papier : au-dessous, un lecteur de code décroche.
  return url ? <img src={url} alt="Sceau de l’ordonnance" style={{ width: 128, height: 128, display: 'block' }} /> : null
}

export interface OrdonnanceImprimableProps {
  ordonnance: Prescription
  patient: string
  soignant: string
  onFermer: () => void
}

export function OrdonnanceImprimable({ ordonnance, patient, soignant, onFermer }: OrdonnanceImprimableProps) {
  const annulee = ordonnance.status === 'CANCELLED'
  const perimee = ordonnance.status === 'EXPIRED' || new Date(ordonnance.expiresAt).getTime() < Date.now()

  return (
    <FeuilleImpression
      document="Ordonnance"
      reference={`ORD-${ordonnance.id.slice(0, 8).toUpperCase()}`}
      mention="ULAMU · Ordonnance électronique — le code ci-joint en scelle le contenu"
      blocs={[
        {
          titre: 'Patient',
          lignes: [
            ['Nom', patient],
            ['Établie le', dateFr(ordonnance.createdAt)],
          ],
        },
        {
          titre: 'Prescripteur',
          lignes: [
            ['Soignant', soignant],
            ['Valable jusqu’au', dateFr(ordonnance.expiresAt)],
          ],
        },
      ]}
      onFermer={onFermer}
    >
      {/*
        ⚠️ **L'état d'abord, et en grand.** Une ordonnance annulée ou périmée qui ne le dirait qu'en
        pied de page se présenterait au comptoir comme valide. *Ce qui invalide un document doit se
        lire avant son contenu, pas après.*
      */}
      {annulee || perimee ? (
        <div
          data-insecable
          style={{
            border: `2px solid ${annulee ? '#9B4444' : '#8A6D1F'}`,
            background: annulee ? '#F7EDED' : '#FBF5E4',
            padding: '11px 15px',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: IMPRESSION_TITRAGE,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: annulee ? '#7A2E2E' : '#6B5417',
            }}
          >
            {annulee ? 'ORDONNANCE ANNULÉE — NE PAS DÉLIVRER' : 'ORDONNANCE PÉRIMÉE — NE PAS DÉLIVRER'}
          </p>
          {annulee && ordonnance.cancelReason ? (
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#7A2E2E' }}>Motif : {ordonnance.cancelReason}</p>
          ) : null}
        </div>
      ) : null}

      <TitreSection>Prescription</TitreSection>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: IMPRESSION_DOUX }}>
            <th style={{ ...ENTETE_COLONNE, textAlign: 'left', width: 26 }}>#</th>
            <th style={{ ...ENTETE_COLONNE, textAlign: 'left' }}>Médicament et posologie</th>
            <th style={{ ...ENTETE_COLONNE, textAlign: 'right', width: 118 }}>Quantité</th>
          </tr>
        </thead>
        <tbody>
          {ordonnance.lines.map((l, i) => (
            <tr key={l.id} data-insecable style={{ borderBottom: `1px solid ${IMPRESSION_FILET}` }}>
              <td style={{ padding: '9px 10px', verticalAlign: 'top', color: IMPRESSION_GRIS, fontFamily: IMPRESSION_CHIFFRES }}>{i + 1}</td>
              <td style={{ padding: '9px 10px', verticalAlign: 'top' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                  {l.medicationName ?? l.freeText ?? `Ligne ${i + 1}`}
                </p>
                {/*
                  Hors référentiel : le dire. Le garde-fou allergies ne s'applique QU'aux lignes
                  référentielles (EF-09-02), et celui qui délivre doit savoir lesquelles il a vérifiées.
                */}
                {l.medicationName === null ? (
                  <p style={{ margin: '2px 0 0', fontSize: 8.5, color: IMPRESSION_GRIS, fontStyle: 'italic' }}>
                    Hors référentiel — contrôle d’allergies non automatique
                  </p>
                ) : null}
                <div style={{ margin: '5px 0 0', fontSize: 10.5, lineHeight: 1.5 }}>
                  <TexteMisEnForme texte={l.posology} />
                </div>
              </td>
              <td style={{ padding: '9px 10px', verticalAlign: 'top', textAlign: 'right', fontFamily: IMPRESSION_CHIFFRES, fontSize: 11 }}>
                {l.qtyPrescribed}
                {l.durationDays ? (
                  <span style={{ display: 'block', fontSize: 9, color: IMPRESSION_GRIS, fontFamily: IMPRESSION_TITRAGE }}>
                    {l.durationDays} jour{l.durationDays > 1 ? 's' : ''}
                  </span>
                ) : null}
                {l.qtyDispensed > 0 ? (
                  <span style={{ display: 'block', fontSize: 9, color: IMPRESSION_GRIS, fontFamily: IMPRESSION_TITRAGE }}>
                    {l.qtyDispensed} déjà délivré{l.qtyDispensed > 1 ? 's' : ''}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        LE CODE — bas de page, mais grand. C'est ce que le comptoir cherche des yeux, et c'est ce
        qui distingue cette feuille d'une liste écrite à la main.
      */}
      {ordonnance.qrToken && !annulee && !perimee ? (
        <div
          data-insecable
          style={{
            marginTop: 22,
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            border: `1px solid ${IMPRESSION_FILET}`,
            borderLeft: `3px solid ${IMPRESSION_ACCENT}`,
            padding: 15,
          }}
        >
          <SceauQr jeton={ordonnance.qrToken} />
          <div>
            <TitreSection>Sceau de l’ordonnance</TitreSection>
            {/*
              ⚠️ **Ce code ne sert PAS à la délivrance** — ULAMU n'est relié à aucune officine. Le
              dire autrement enverrait quelqu'un tendre cette feuille à un comptoir qui ne saurait
              qu'en faire. C'est la phrase que le chantier 27 avait déjà corrigée à l'écran.
            */}
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, maxWidth: 330 }}>
              Ce code scelle l’ordonnance : il prouve qu’elle n’a pas été modifiée depuis la
              signature du soignant. Il ne sert pas à la délivrance — ULAMU n’est relié à aucune
              officine.
            </p>
            <p style={{ margin: '7px 0 0', fontSize: 9.5, color: IMPRESSION_GRIS }}>
              Valable jusqu’au <strong>{dateFr(ordonnance.expiresAt)}</strong>.
            </p>
          </div>
        </div>
      ) : null}
    </FeuilleImpression>
  )
}
