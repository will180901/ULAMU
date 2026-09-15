/**
 * Ce qu'un document imprimé doit dire, et ce qu'il ne doit JAMAIS dire — chantier 131, 15/09/2026.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **ULAMU n'imprimait rien** : pas un `window.print`, pas un `@media print` dans tout le projet.
 * L'ordonnance se présente pourtant EN PHARMACIE — *un écran demande une batterie, du réseau, et un
 * comptoir qui accepte qu'on le regarde.*
 *
 * ⚠️ **Et le premier jet de ce document a réintroduit un mensonge déjà corrigé.** Il appelait le QR
 * « code de délivrance » et promettait que « la pharmacie le scanne pour enregistrer la
 * délivrance ». C'est exactement la phrase que le chantier 27 avait retirée de l'écran le 02/09 :
 * **ULAMU n'est relié à aucune officine.** Le QR est un SCEAU d'intégrité, rien de plus.
 *
 * > **Une phrase fausse retirée d'un écran revient par le document qu'on imprime, si personne ne la
 * > garde des deux côtés.**
 *
 * C'est la raison d'être de ce fichier : le filet des promesses gardait les ÉCRANS ; le papier
 * n'avait personne.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Prescription } from '@/lib/api'
import { OrdonnanceImprimable } from '@/components/impression/OrdonnanceImprimable'

// Le QR est fabriqué sur le poste par `qrcode` : on le remplace, les règles testées sont ailleurs.
vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,x') } }))

const ORDONNANCE: Prescription = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  sessionId: 's1',
  status: 'ACTIVE',
  qrToken: 'jeton-de-sceau',
  subProfileId: null,
  expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
  createdAt: '2026-09-10T08:00:00.000Z',
  cancelReason: null,
  lines: [
    { id: 'l1', medicamentId: 'm1', medicationName: 'Paracétamol 500 mg', freeText: null, posology: '1 comprimé matin et soir', durationDays: 5, qtyPrescribed: 10, qtyDispensed: 0 },
    { id: 'l2', medicamentId: null, medicationName: null, freeText: 'Sirop local', posology: 'Une cuillère le soir', durationDays: null, qtyPrescribed: 1, qtyDispensed: 0 },
  ],
}

const monter = (o: Partial<Prescription> = {}) =>
  render(
    <OrdonnanceImprimable
      ordonnance={{ ...ORDONNANCE, ...o }}
      patient="Mireille Nkouka"
      soignant="Armel Konaté"
      onFermer={() => {}}
    />,
  )

describe('L’ordonnance imprimée — ce qu’elle NE dit JAMAIS', () => {
  /*
    ⚠️ LE test de ce chantier. ULAMU n'est relié à aucune officine : promettre un scan au comptoir
    enverrait quelqu'un tendre cette feuille à une pharmacie qui ne saurait qu'en faire.
  */
  it('ne présente pas le code comme un moyen de retirer des médicaments', () => {
    monter()
    const texte = document.body.textContent ?? ''

    expect(texte).not.toContain('Code de délivrance')
    expect(texte).not.toMatch(/scanne ce code pour[\s\S]{0,60}délivrance/)
  })

  it('dit au contraire ce que le code EST, et ce qu’il n’est pas', () => {
    monter()

    expect(screen.getByText(/Sceau de l’ordonnance/)).toBeInTheDocument()
    expect(screen.getByText(/n’a pas été modifiée depuis la signature/)).toBeInTheDocument()
    expect(screen.getByText(/ULAMU n’est relié à aucune officine/)).toBeInTheDocument()
  })

  /*
    Personne ne signe cette feuille à la main — la signature est électronique. Un cadre vide
    « signature et cachet » inviterait à le remplir après coup, sur un document médical.
  */
  it('ne porte aucun cadre de signature manuscrite', () => {
    monter()
    const texte = document.body.textContent ?? ''

    expect(texte).not.toMatch(/cachet/i)
    expect(texte).not.toMatch(/signature et cachet/i)
  })
})

describe('L’ordonnance imprimée — ce qu’elle ne doit jamais PERDRE', () => {
  it('nomme les deux parties', () => {
    monter()

    expect(screen.getByText('Mireille Nkouka')).toBeInTheDocument()
    expect(screen.getByText('Armel Konaté')).toBeInTheDocument()
  })

  /*
    La posologie est la seule ligne que quelqu'un va SUIVRE. Le chantier 88 l'avait déjà dit : elle
    est rendue mot pour mot, jamais résumée.
  */
  it('rend chaque ligne avec sa posologie et sa quantité', () => {
    monter()

    expect(screen.getByText('Paracétamol 500 mg')).toBeInTheDocument()
    expect(screen.getByText(/1 comprimé matin et soir/)).toBeInTheDocument()
    expect(screen.getByText(/Une cuillère le soir/)).toBeInTheDocument()
  })

  /*
    Le garde-fou allergies ne s'applique QU'aux lignes référentielles (EF-09-02). Celui qui délivre
    doit savoir lesquelles ont été vérifiées — c'est la règle du chantier 88, portée au papier.
  */
  it('signale les lignes hors référentiel', () => {
    monter()

    expect(screen.getByText(/Hors référentiel/)).toBeInTheDocument()
  })

  it('écrit la date de validité en clair', () => {
    monter()

    expect(screen.getAllByText(/Valable jusqu’au/).length).toBeGreaterThan(0)
  })
})

/*
  ⚠️ **Ce qui invalide un document doit se lire AVANT son contenu.** Une ordonnance annulée dont
  l'état ne figurerait qu'en pied de page se présenterait au comptoir comme valide.
*/
describe('Une ordonnance qu’il ne faut pas honorer', () => {
  it('le dit en tête, et retire le sceau', () => {
    monter({ status: 'CANCELLED', cancelReason: 'Erreur de dosage' })
    const texte = document.body.textContent ?? ''

    expect(screen.getByText(/ORDONNANCE ANNULÉE — NE PAS DÉLIVRER/)).toBeInTheDocument()
    expect(screen.getByText(/Erreur de dosage/)).toBeInTheDocument()
    // Le sceau d'une ordonnance annulée n'a plus rien à sceller : l'imprimer inviterait à s'y fier.
    expect(texte).not.toContain('Sceau de l’ordonnance')
  })

  it('en dit autant d’une ordonnance périmée', () => {
    monter({ expiresAt: new Date(Date.now() - 86400000).toISOString() })

    expect(screen.getByText(/ORDONNANCE PÉRIMÉE — NE PAS DÉLIVRER/)).toBeInTheDocument()
  })
})

/*
  ── ⚠️ La mécanique du gabarit, que rien ne gardait ───────────────────────────────────────────

  L'injection de fautes du 15/09 l'a montré : on pouvait retirer `@page { size: A4 }` — **la règle
  qui décide du format du papier** — sans qu'un seul test tombe. Les autres cas éprouvaient ce que
  le document DIT ; personne n'éprouvait ce qui le fait sortir droit.

  *Un document dont on garde le texte mais pas la mise en page finit par sortir juste… sur un
  format que personne n'a demandé.*

  Ces règles vivent dans une chaîne de CSS construite à l'exécution, insérée puis retirée : les
  éprouver au rendu demanderait de piloter la boîte d'impression du navigateur, que jsdom n'a pas.
  On les ancre donc dans la SOURCE, comme le filet des promesses d'écran le fait déjà.
*/
describe('Le gabarit A4 — ce qui le fait sortir droit', () => {
  const source = readFileSync(resolve(__dirname, '../components/impression/FeuilleImpression.tsx'), 'utf8')

  it('impose le format A4 sans marge du navigateur', () => {
    expect(source).toMatch(/@page \{ size: A4; margin: 0; \}/)
  })

  /*
    `display:none` ferait perdre au navigateur la hauteur des ancêtres, et la feuille commencerait
    à la deuxième page. C'est `visibility` qui masque sans démonter la mise en page.
  */
  it('masque le reste par `visibility`, jamais par `display`', () => {
    expect(source).toMatch(/body \* \{ visibility: hidden/)
    expect(source).not.toMatch(/body \* \{ display: none/)
  })

  /*
    Le style est retiré après le tirage : laissé en place, il masquerait toute l'application au
    prochain Ctrl+P de l'utilisateur — sur n'importe quelle page.
  */
  it('retire son style d’impression après le tirage', () => {
    expect(source).toMatch(/window\.print\(\)/)
    expect(source).toMatch(/style\.remove\(\)/)
  })

  /*
    La barre « Imprimer / Fermer » ne doit pas figurer sur le papier : elle serait imprimée comme
    deux rectangles gris au milieu d'un document médical.
  */
  it('exclut sa barre d’actions du papier', () => {
    expect(source).toMatch(/data-hors-impression/)
    expect(source).toMatch(/\[data-hors-impression\] \{ display: none/)
  })

  /*
    La palette du document ne suit PAS le thème : un document imprimé en thème sombre serait
    illisible, et viderait la cartouche d'une imprimante de pharmacie.
  */
  it('imprime sur du blanc, quel que soit le thème de l’application', () => {
    expect(source).toMatch(/background: '#FFFFFF'/)
  })
})
