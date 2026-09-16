/**
 * Lire un contrat signé — chantier 135, 16/09/2026 (M03, CU-03-03).
 *
 * ── Pourquoi ces fonctions vivent ICI, et pas dans un composant ────────────────────────────────
 *
 * Le contrat se lit à DEUX endroits : sur la feuille imprimée, et sur l'écran où on le signe.
 * Jusqu'ici chacun le rendait à sa façon — la feuille en articles justifiés, l'écran en bloc gris
 * de 11 px où les retours forcés du texte source dessinaient un escalier.
 *
 * > **Deux lectures d'un même texte scellé, c'est une lecture gardée et une lecture livrée à
 * > elle-même.**
 *
 * 📌 Le découpage est donc écrit une fois, et **le filet qui le garde vaut pour les deux rendus** :
 * la suite des mots produite ici doit être identique, mot pour mot, à celle du texte signé — puisque
 * c'est cette suite que l'empreinte scelle.
 *
 * ⚠️ **Ce que ces fonctions ont le droit de faire, et ce qu'elles n'ont pas le droit de faire.**
 * Réunir en paragraphes des lignes qu'un retour forcé avait séparées : oui, c'est de la
 * PRÉSENTATION. Changer un mot, son orthographe, sa CASSE ou son ordre : jamais. *Une empreinte ne
 * fait pas la différence entre une faute de frappe et une jolie mise en forme : elle ne voit que des
 * octets qui ont changé.*
 */

export interface ArticleContrat {
  /**
   * La ligne d'en-tête, **telle quelle** — « ARTICLE 1 — OBJET », capitales comprises.
   *
   * ⚠️ Un premier jet la recomposait en « Article 1 » + « OBJET ». C'est une transformation de CASSE
   * sur un texte scellé : le mot « ARTICLE » devenait « Article ». On met en page ce qui se
   * présente, on ne réécrit pas ce qui se lit.
   */
  entete: string
  alineas: string[]
}

/**
 * Découpe le texte signé en préambule, articles et clôture.
 *
 * ⚠️ **Rien n'est retiré.** Ce qui n'entre dans aucun article reste dans le préambule ou la
 * clôture : *un analyseur qui jette ce qu'il ne reconnaît pas fait disparaître des clauses.*
 *
 * Les deux modèles de rédaction sont couverts — « ARTICLE 1 — OBJET » (2026-09) et
 * « Article 1 — Objet » (origine) —, car un contrat d'archive doit rester présentable.
 */
export function decouperContrat(texte: string): {
  preambule: string[]
  articles: ArticleContrat[]
  cloture: string[]
} {
  const lignes = texte.split('\n')
  const preambule: string[] = []
  const articles: ArticleContrat[] = []
  const cloture: string[] = []

  const enTete = /^(ARTICLE|Article)\s+(\d+)\s*[—-]\s*(.+)$/
  let courant: ArticleContrat | null = null

  for (const ligne of lignes) {
    if (enTete.test(ligne.trim())) {
      courant = { entete: ligne.trim(), alineas: [] }
      articles.push(courant)
      continue
    }
    if (ligne.trim() === '') {
      // Une ligne vide ferme l'alinéa en cours sans fermer l'article : l'article suivant a son titre.
      if (courant) courant.alineas.push('')
      else if (preambule.length > 0) preambule.push('')
      continue
    }
    if (courant) courant.alineas.push(ligne.trim())
    else preambule.push(ligne.trim())
  }

  // La ligne de clôture (« Signataire : … ») appartient au dernier article par construction :
  // on la lui retire pour la rendre à part, en pied de texte.
  const dernier = articles.at(-1)
  if (dernier) {
    while (dernier.alineas.length > 0 && dernier.alineas.at(-1) === '') dernier.alineas.pop()
    const queue = dernier.alineas.at(-1)
    if (queue && /^Signataire\s*:/.test(queue)) {
      cloture.push(dernier.alineas.pop() as string)
      while (dernier.alineas.length > 0 && dernier.alineas.at(-1) === '') dernier.alineas.pop()
    }
  }

  return { preambule, articles, cloture }
}

/** Réunit les lignes d'un même alinéa — les lignes vides séparent les alinéas. */
export function enParagraphes(alineas: string[]): string[] {
  const out: string[] = []
  let courant: string[] = []
  for (const l of alineas) {
    if (l === '') {
      if (courant.length > 0) out.push(courant.join(' '))
      courant = []
    } else courant.push(l)
  }
  if (courant.length > 0) out.push(courant.join(' '))
  return out
}
