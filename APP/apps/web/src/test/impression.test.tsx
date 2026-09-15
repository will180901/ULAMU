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
import { ContratImprimable } from '@/components/impression/ContratImprimable'
import { RecuImprimable } from '@/components/impression/RecuImprimable'

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

/*
  ── Le contrat et le reçu — chantier 132, 15/09/2026 ──────────────────────────────────────────

  ⚠️ **Le contrat signé se téléchargeait en `.txt`.** Un document juridique, en texte brut : sans
  en-tête, sans date de signature, et **sans l'empreinte qui prouve qu'il s'agit bien du texte
  accepté**. Elle existait pourtant en base — personne ne la montrait.

  > **Un contrat qu'on ne peut pas présenter n'engage personne à vos yeux, même s'il vous engage en
  > droit.**

  ⚠️ **Le reçu ne vivait qu'à l'écran d'un téléphone.** Or un reçu n'existe pas pour celui qui
  l'émet : il existe pour celui qui devra le présenter à un employeur, une mutuelle, un comptable.
  *Un justificatif qui ne peut pas quitter l'appareil ne justifie rien.*
*/
describe('Le contrat imprimé', () => {
  const monterContrat = (p: Partial<Parameters<typeof ContratImprimable>[0]> = {}) =>
    render(
      <ContratImprimable
        version={2}
        commissionPct={10}
        bodyHash="a3f9beefcafebabedeadbeef0000c210"
        corps={'Article 1.\nLe partenaire exerce en son nom propre.'}
        signePar="Armel Konaté"
        signeLe="2026-08-24T08:26:00.000Z"
        effectifLe="2026-08-24T08:26:00.000Z"
        onFermer={() => {}}
        {...p}
      />,
    )

  /*
    ⚠️ LE test de ce document : sans l'empreinte, une copie de contrat ne se distingue pas d'une
    version réécrite après coup.
  */
  it('porte l’empreinte du texte signé, en entier', () => {
    monterContrat()

    expect(screen.getByText('a3f9beefcafebabedeadbeef0000c210')).toBeInTheDocument()
    expect(screen.getByText(/change au moindre caractère modifié/)).toBeInTheDocument()
  })

  it('nomme le signataire et la date de signature', () => {
    monterContrat()
    const texte = document.body.textContent ?? ''

    expect(texte).toContain('Armel Konaté')
    expect(texte).toMatch(/24 août 2026/)
  })

  /*
    La commission est la seule clause que le soignant relira : elle décide de ce qu'il gagne.
    Enfouie dans le corps, elle serait introuvable sur une feuille dense.
  */
  it('met la commission en évidence, hors du corps', () => {
    monterContrat({ commissionPct: 12 })

    expect(screen.getByText('12 %')).toBeInTheDocument()
  })

  /*
    C'est un texte juridique : reformater un contrat, c'est en changer la lecture — et l'empreinte
    imprimée à côté ne correspondrait plus à ce qu'on lit.
  */
  it('rend le corps tel quel, sans le reformater', () => {
    monterContrat()

    expect(screen.getByText(/Le partenaire exerce en son nom propre/)).toBeInTheDocument()
  })
})

describe('Le reçu imprimé', () => {
  const RECU = {
    number: 'REC-000123',
    kind: 'PAYMENT',
    orderRef: 'handshake:h1',
    amountXaf: 5000,
    createdAt: '2026-09-12T10:30:00.000Z',
    label: 'Consultation générale 30 min',
  }

  it('porte le libellé FIGÉ de ce qui a été acheté', () => {
    render(<RecuImprimable recu={RECU} payeur="Mireille Nkouka" onFermer={() => {}} />)

    expect(screen.getByText('Consultation générale 30 min')).toBeInTheDocument()
    // En-tête et pied portent tous deux la référence : le gabarit la répète volontairement.
    expect(screen.getAllByText('REC-000123').length).toBeGreaterThan(0)
  })

  /*
    Mieux vaut une catégorie honnête qu'un nom inventé : les reçus d'avant la colonne `label`
    retombent sur la déduction, comme l'écran le fait déjà.
  */
  it('retombe sur une catégorie honnête quand le libellé manque', () => {
    render(<RecuImprimable recu={{ ...RECU, label: null }} payeur="Mireille Nkouka" onFermer={() => {}} />)

    expect(screen.getByText('Consultation')).toBeInTheDocument()
  })

  /*
    ⚠️ Présenter un remboursement comme une dépense fausserait une note de frais : le mot ET le
    signe changent.
  */
  it('distingue un remboursement d’un paiement', () => {
    render(<RecuImprimable recu={{ ...RECU, kind: 'REFUND' }} payeur="Mireille Nkouka" onFermer={() => {}} />)
    const texte = document.body.textContent ?? ''

    expect(texte).toContain('Reçu de remboursement')
    expect(texte).toContain('Total remboursé')
    expect(texte).not.toContain('Total payé')
  })

  /*
    La garantie donnée AVANT le paiement se retrouve sur la preuve du paiement (D-010 : prix final,
    commission incluse ; les frais d'opérateur sortent de la commission d'ULAMU).
  */
  /*
    Le numéro figure en en-tête et en pied — c'est le rôle du gabarit. L'écrire une troisième fois
    dans le bloc « Opération » n'apprenait rien : *deux fois la même information n'est pas deux fois
    plus sûre, c'est une ligne de moins pour ce qui manque.*
  */
  it('ne répète pas le numéro une troisième fois dans le corps', () => {
    render(<RecuImprimable recu={RECU} payeur="Mireille Nkouka" onFermer={() => {}} />)

    expect(screen.queryByText('Numéro de reçu')).not.toBeInTheDocument()
    expect(screen.getByText('Référence')).toBeInTheDocument()
  })

  it('répète la garantie « aucun frais en plus »', () => {
    render(<RecuImprimable recu={RECU} payeur="Mireille Nkouka" onFermer={() => {}} />)

    expect(screen.getByText(/sans aucun frais supplémentaire/)).toBeInTheDocument()
  })
})

/*
  ── ⚠️ Deux règles que rien ne retenait — chantier 132 ────────────────────────────────────────

  L'injection du 15/09 l'a montré : on pouvait **reformater le corps du contrat** et **faire repartir
  le contrat en fichier `.txt`** sans qu'un seul test tombe. Les cas précédents éprouvaient ce que
  les documents AFFICHENT ; ceux-ci gardent comment ils sont produits.

  Ces deux règles vivent dans un attribut de style et dans un branchement d'écran : les éprouver au
  rendu demanderait de monter toute la page de vérification pour vérifier un `white-space`. On les
  ancre dans la SOURCE, comme le filet des promesses d'écran le fait déjà.
*/
describe('Comment ces documents sont produits', () => {
  const sourceContrat = readFileSync(resolve(__dirname, '../components/impression/ContratImprimable.tsx'), 'utf8')
  const sourcePage = readFileSync(resolve(__dirname, '../modules/verification/pages/VerificationPage.tsx'), 'utf8')

  /*
    C'est un texte juridique. Reformater un contrat, c'est en changer la lecture — et l'empreinte
    imprimée à côté ne correspondrait plus à ce qu'on lit.
  */
  it('le corps du contrat s’imprime tel qu’il a été signé', () => {
    expect(sourceContrat).toMatch(/whiteSpace: 'pre-wrap' \}\}>\{corps\}/)
    expect(sourceContrat).not.toMatch(/corps\.replace/)
  })

  /*
    ⚠️ **Le contrat ne repart pas en `.txt`.** Un document juridique signé, livré en texte brut,
    n'a ni en-tête, ni date de signature, ni empreinte : il ne se présente à personne.
  */
  it('l’écran de vérification n’émet plus de fichier texte', () => {
    /*
      ⚠️ `[\s/>]` n'est pas un détail : sans lui, le motif correspondait aussi à
      `<ContratImprimableAutreChose`, et l'injection du 15/09 est passée à travers. *Une ancre qui
      accepte un préfixe ne garde pas un nom, elle garde un début de nom.*
    */
    expect(sourcePage).toMatch(/<ContratImprimable[\s/>]/)
    expect(sourcePage).toMatch(/import \{ ContratImprimable \}/)
    expect(sourcePage).not.toMatch(/text\/plain/)
    expect(sourcePage).not.toMatch(/contrat-ulamu-v.*\.txt/)
  })
})
