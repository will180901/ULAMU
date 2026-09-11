/**
 * La grammaire de mise en forme d'un message — SOURCE DE VÉRITÉ.
 *
 * ⚠️ Ce fichier est VENDORÉ. La source est `packages/shared/src/texte-riche.ts` ; les copies sont
 * `apps/web/src/modules/consultation/texte-riche.ts` et `apps/mobile/src/lib/texte-riche.ts`.
 * Toute correction se fait dans la SOURCE, puis se recopie — jamais l'inverse.
 *
 * Les trois copies doivent rester **identiques au caractère près**, et un test le vérifie
 * (`src/test/texte-riche-vendorage.test.ts`). La raison n'est pas l'élégance : si le web et le
 * mobile ne lisaient pas la même grammaire, **le patient verrait autre chose que ce que le
 * soignant a écrit** — des astérisques d'un côté, du gras de l'autre. C'est la leçon du
 * chantier 84, où deux endroits calculaient la même échéance et finissaient par la dire
 * différemment.
 *
 * ── Ce que cette grammaire N'EST PAS ──────────────────────────────────────────────────────────
 *
 * Ce n'est **pas** du Markdown, et surtout pas du HTML. Le corps d'un message de consultation
 * porte des données de santé : il est affiché, jamais interprété. Un patient qui écrit `<b>` doit
 * lire `<b>`, et aucun lien n'est fabriqué automatiquement. Cette grammaire ne connaît que cinq
 * marqueurs, tous symétriques, tous inoffensifs.
 *
 * ── Les marqueurs ─────────────────────────────────────────────────────────────────────────────
 *
 *   *gras*        _italique_       ~barré~        __souligné__        ##grand##
 *
 * Les trois premiers sont ceux de WhatsApp : les gens les connaissent déjà, et un message copié
 * depuis WhatsApp garde sa forme. Les deux derniers n'ont pas de convention établie — ils sont à
 * nous, et c'est pourquoi les deux applications doivent les lire pareil.
 *
 * ── Les trois règles qui évitent les faux positifs ────────────────────────────────────────────
 *
 * 1. **Un marqueur ne traverse pas une ligne.** Sinon un astérisque égaré transformerait tout un
 *    paragraphe. Sur un écran de soin, on préfère un astérisque visible à un texte déformé.
 * 2. **Pas d'espace collé à l'intérieur des marqueurs.** « 2 * 3 * 4 » reste une multiplication,
 *    « 5 _ 6 » reste ce qu'il est. Une posologie ne doit pas devenir de l'italique.
 * 3. **Un marqueur n'ouvre qu'en début de mot, et ne ferme qu'en fin de mot.** C'est celle-ci qui
 *    protège le vocabulaire du soin : sans elle, `nom_de_famille` deviendrait « nomdefamille »
 *    avec « de » en italique, et le nom d'un fichier ou d'une molécule se ferait manger ses
 *    tirets bas. WhatsApp ne pose pas cette règle ; nous si, parce qu'ici le texte est un dossier.
 *
 * Un marqueur non refermé s'affiche **tel quel** : on ne devine pas l'intention.
 *
 * ⚠️ **Ce que ces règles ne promettent PAS.** Une suite de marqueurs sans texte autour — `_*__~`,
 * `### ###` — peut encore se combiner d'une façon surprenante. C'est le lot de toute grammaire
 * légère, et nous préférons ce reste à la solution radicale (n'autoriser la mise en forme que sur
 * des mots entiers connus), qui interdirait d'insister sur une partie de mot. Aucun texte de soin
 * réaliste ne ressemble à cela ; des tests le fixent pour que ce soit un CHOIX, pas une surprise.
 */

/** Les styles qu'un fragment peut porter. Ils se cumulent : `*_gras italique_*` existe. */
export interface StyleTexte {
  gras?: boolean;
  italique?: boolean;
  barre?: boolean;
  souligne?: boolean;
  grand?: boolean;
}

/** Un fragment de texte et sa mise en forme. `texte` peut contenir des retours à la ligne. */
export interface FragmentTexte {
  texte: string;
  style: StyleTexte;
}

/** Marqueur → style porté. L'ordre compte : les plus longs sont essayés d'abord (`__` avant `_`). */
const MARQUEURS: ReadonlyArray<readonly [string, keyof StyleTexte]> = [
  ["__", "souligne"],
  ["##", "grand"],
  ["*", "gras"],
  ["_", "italique"],
  ["~", "barre"],
];

/** Le nom de chaque marqueur, pour les libellés d'interface — une seule source, pas cinq. */
export const NOMS_MARQUEURS: Readonly<Record<keyof StyleTexte, string>> = {
  gras: "Gras",
  italique: "Italique",
  barre: "Barré",
  souligne: "Souligné",
  grand: "Grand",
};

export const MARQUEUR_DE: Readonly<Record<keyof StyleTexte, string>> = {
  gras: "*",
  italique: "_",
  barre: "~",
  souligne: "__",
  grand: "##",
};

const estBlanc = (c: string | undefined): boolean => c === undefined || /\s/.test(c);

/**
 * Règle 3, côté ouverture : avant un marqueur, il faut un blanc, un début de ligne, une ponctuation
 * ouvrante — ou **un autre marqueur**, sans quoi `*_gras italique_*` ne pourrait pas s'imbriquer.
 */
const peutOuvrir = (avant: string | undefined): boolean =>
  avant === undefined || /[\s([{«"'*_~#]/.test(avant);

/** Règle 3, côté fermeture : après un marqueur, une fin de mot — blanc, ponctuation, ou marqueur. */
const peutFermer = (apres: string | undefined): boolean =>
  apres === undefined || /[\s).,;:!?…)\]}»"'*_~#]/.test(apres);

/**
 * Cherche, à partir de `i`, un marqueur ouvrant dont le fermant existe SUR LA MÊME LIGNE.
 *
 * Rend la longueur du marqueur, le style et l'index du fermant — ou `null` si rien ne s'ouvre ici.
 */
function ouvertureIci(texte: string, i: number): { taille: number; cle: keyof StyleTexte; fin: number } | null {
  // Règle 3 : on n'ouvre qu'en début de mot.
  if (!peutOuvrir(texte[i - 1])) return null;

  for (const [marqueur, cle] of MARQUEURS) {
    if (!texte.startsWith(marqueur, i)) continue;
    const debutContenu = i + marqueur.length;
    // Règle 2 : pas d'espace collé après l'ouvrant, et le contenu n'est pas vide.
    if (estBlanc(texte[debutContenu])) continue;

    let j = debutContenu;
    while (j < texte.length) {
      // Règle 1 : un marqueur ne traverse pas une ligne.
      if (texte[j] === "\n") break;
      if (
        texte.startsWith(marqueur, j) &&
        j > debutContenu &&
        !estBlanc(texte[j - 1]) &&
        // Règle 3 : on ne ferme qu'en fin de mot.
        peutFermer(texte[j + marqueur.length])
      ) {
        return { taille: marqueur.length, cle, fin: j };
      }
      j += 1;
    }
  }
  return null;
}

/**
 * Découpe un texte en fragments stylés. C'est la seule fonction que les deux rendus appellent.
 *
 * Le texte non marqué ressort **inchangé**, y compris ses marqueurs orphelins : on affiche, on ne
 * corrige pas.
 */
export function analyserTexteRiche(texte: string, style: StyleTexte = {}): FragmentTexte[] {
  const fragments: FragmentTexte[] = [];
  let tampon = "";
  let i = 0;

  const vider = (): void => {
    if (tampon) {
      fragments.push({ texte: tampon, style });
      tampon = "";
    }
  };

  while (i < texte.length) {
    const ouverture = ouvertureIci(texte, i);
    if (!ouverture) {
      tampon += texte[i];
      i += 1;
      continue;
    }
    vider();
    const contenu = texte.slice(i + ouverture.taille, ouverture.fin);
    // Récursif : les styles se cumulent, `*_gras italique_*` porte les deux.
    fragments.push(...analyserTexteRiche(contenu, { ...style, [ouverture.cle]: true }));
    i = ouverture.fin + ouverture.taille;
  }

  vider();
  return fragments;
}

// ── Les listes ───────────────────────────────────────────────────────────────────────────────
//
// Une liste n'a besoin d'AUCUN rendu : « • » et « 1. » sont du texte, lisibles partout, y compris
// sur un écran qui ne connaîtrait pas cette grammaire. Tout le travail est à la SAISIE.

/** Une ligne de liste : sa puce (ou son numéro) et ce qu'il y a après. */
export interface LigneListe {
  prefixe: string;
  numero: number | null;
  contenu: string;
  indentation: string;
}

const PUCE = /^(\s*)([•\-])\s+(.*)$/;
const NUMERO = /^(\s*)(\d+)[.)]\s+(.*)$/;

/** Lit une ligne et dit si c'est un élément de liste. */
export function lireLigneListe(ligne: string): LigneListe | null {
  const puce = PUCE.exec(ligne);
  if (puce) {
    return { indentation: puce[1] as string, prefixe: `${puce[2] as string} `, numero: null, contenu: puce[3] as string };
  }
  const numero = NUMERO.exec(ligne);
  if (numero) {
    const n = Number(numero[2]);
    return { indentation: numero[1] as string, prefixe: `${n}. `, numero: n, contenu: numero[3] as string };
  }
  return null;
}

/** Les bornes de la ligne qui contient `position`. */
export function bornesDeLaLigne(texte: string, position: number): { debut: number; fin: number } {
  const debut = texte.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
  const finTrouvee = texte.indexOf("\n", position);
  return { debut, fin: finTrouvee === -1 ? texte.length : finTrouvee };
}

/**
 * Ctrl+Entrée : la suite logique de la liste.
 *
 * Sur un élément de liste qui a du contenu, on passe à la ligne en reprenant la puce — ou le
 * numéro suivant. Sur un élément **vide**, on retire la puce : c'est ainsi qu'on sort d'une liste,
 * et c'est ce que le porteur demandait — *supprimer la ligne courante annule la suite logique*.
 *
 * Hors d'une liste, Ctrl+Entrée passe simplement à la ligne : le geste ne change pas de sens
 * selon l'endroit, il fait seulement moins.
 */
export function continuerListe(texte: string, position: number): { texte: string; curseur: number } {
  const { debut, fin } = bornesDeLaLigne(texte, position);
  const ligne = texte.slice(debut, fin);
  const item = lireLigneListe(ligne);

  if (!item) {
    return { texte: `${texte.slice(0, position)}\n${texte.slice(position)}`, curseur: position + 1 };
  }

  if (item.contenu.trim() === "") {
    // Élément vide : on sort de la liste en effaçant la puce, sans ajouter de ligne.
    const sansPuce = texte.slice(0, debut) + texte.slice(fin);
    return { texte: sansPuce, curseur: debut };
  }

  const suivant = item.numero === null ? item.prefixe : `${item.numero + 1}. `;
  const insertion = `\n${item.indentation}${suivant}`;
  return {
    texte: texte.slice(0, position) + insertion + texte.slice(position),
    curseur: position + insertion.length,
  };
}

/**
 * Met — ou retire — une liste sur toutes les lignes touchées par la sélection.
 *
 * Si TOUTES les lignes sont déjà du type demandé, on retire : le bouton est une bascule, comme le
 * gras. Sinon on pose, et les numéros sont recalculés de 1 à n.
 */
export function basculerListe(
  texte: string,
  debut: number,
  fin: number,
  type: "puce" | "numero",
): { texte: string; debut: number; fin: number } {
  const bornesDebut = bornesDeLaLigne(texte, debut);
  const bornesFin = bornesDeLaLigne(texte, fin);
  const bloc = texte.slice(bornesDebut.debut, bornesFin.fin);
  const lignes = bloc.split("\n");

  const dejaToutes = lignes.every((l) => {
    const item = lireLigneListe(l);
    if (!item) return l.trim() === "";
    return type === "puce" ? item.numero === null : item.numero !== null;
  });

  let compteur = 0;
  const refaites = lignes.map((l) => {
    const item = lireLigneListe(l);
    const nu = item ? item.indentation + item.contenu : l;
    if (dejaToutes) return nu;
    if (nu.trim() === "") return nu;
    compteur += 1;
    const indentation = item ? item.indentation : (/^\s*/.exec(l)?.[0] ?? "");
    const corps = item ? item.contenu : l.slice(indentation.length);
    return `${indentation}${type === "puce" ? "• " : `${compteur}. `}${corps}`;
  });

  const nouveau = refaites.join("\n");
  return {
    texte: texte.slice(0, bornesDebut.debut) + nouveau + texte.slice(bornesFin.fin),
    debut: bornesDebut.debut,
    fin: bornesDebut.debut + nouveau.length,
  };
}

// ── La bascule d'un marqueur sur la sélection ────────────────────────────────────────────────

/**
 * Pose ou retire un marqueur autour de la sélection, et rend la nouvelle sélection.
 *
 * C'est une BASCULE : re-cliquer sur « gras » alors que la sélection est déjà grasse la dégrasse.
 * Sans cela, le bouton ne saurait qu'ajouter, et on empilerait `**texte**` sans rien voir changer.
 *
 * Sélection vide : on pose les deux marqueurs et on place le curseur entre eux — on commence à
 * écrire en gras, comme dans n'importe quel traitement de texte.
 */
export function basculerMarqueur(
  texte: string,
  debut: number,
  fin: number,
  cle: keyof StyleTexte,
): { texte: string; debut: number; fin: number } {
  const marqueur = MARQUEUR_DE[cle];
  const n = marqueur.length;
  const selection = texte.slice(debut, fin);

  // Déjà marqué à l'intérieur de la sélection : « *texte* » sélectionné en entier.
  if (selection.length > 2 * n && selection.startsWith(marqueur) && selection.endsWith(marqueur)) {
    const nu = selection.slice(n, -n);
    return { texte: texte.slice(0, debut) + nu + texte.slice(fin), debut, fin: debut + nu.length };
  }

  // Déjà marqué JUSTE AUTOUR : « *[texte]* » — la sélection porte le contenu, pas les marqueurs.
  if (texte.slice(Math.max(0, debut - n), debut) === marqueur && texte.slice(fin, fin + n) === marqueur) {
    return {
      texte: texte.slice(0, debut - n) + selection + texte.slice(fin + n),
      debut: debut - n,
      fin: debut - n + selection.length,
    };
  }

  const pose = marqueur + selection + marqueur;
  return {
    texte: texte.slice(0, debut) + pose + texte.slice(fin),
    debut: debut + n,
    fin: debut + n + selection.length,
  };
}
