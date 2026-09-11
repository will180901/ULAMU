/**
 * Un texte mis en forme, rendu — chantiers 86 et 88.
 *
 * Il ne sert plus qu'aux messages : depuis que la bulle s'attache à toute zone de saisie, les
 * mêmes marqueurs peuvent venir d'une posologie ou d'un motif d'annulation. D'où le nom, et
 * d'où le fait qu'il porte désormais le MÊME que son jumeau du web.
 *
 * ⚠️ **Le pendant mobile du rendu web, et il n'est pas optionnel.** Le soignant écrit depuis le
 * web ; si le mobile ne lisait pas la même grammaire, le patient recevrait « *prenez ce
 * médicament* » avec ses astérisques pendant que le soignant croirait avoir insisté. C'est pour
 * cela que les deux applications partagent le MÊME fichier de grammaire (`lib/texte-riche.ts`,
 * vendoré depuis `packages/shared`), et qu'un test vérifie qu'elles ne dérivent pas.
 *
 * Rien n'est interprété : cinq marqueurs symétriques deviennent du style, et c'est tout. Pas de
 * balise lue, pas de lien fabriqué — le corps d'un message porte des données de santé.
 *
 * Les listes (« • », « 1. ») n'ont besoin d'aucun rendu : c'est du texte, lisible tel quel.
 */
import React from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {analyserTexteRiche, type StyleTexte} from '../lib/texte-riche';

/**
 * `fontSize` en valeur ABSOLUE : React Native n'a pas d'unité relative comme `em`. On part donc de
 * la taille de la bulle, qu'on reçoit, plutôt que d'un chiffre écrit en dur ici — sinon le « grand »
 * cesserait de suivre le jour où la bulle change de taille.
 */
function styleDe(s: StyleTexte, base: number): TextStyle | undefined {
  const decorations: string[] = [];
  if (s.souligne) {
    decorations.push('underline');
  }
  if (s.barre) {
    decorations.push('line-through');
  }
  if (!s.gras && !s.italique && !s.grand && decorations.length === 0) {
    return undefined;
  }
  return {
    fontWeight: s.gras ? '700' : undefined,
    fontStyle: s.italique ? 'italic' : undefined,
    fontSize: s.grand ? Math.round(base * 1.18) : undefined,
    textDecorationLine: decorations.length > 0 ? (decorations.join(' ') as TextStyle['textDecorationLine']) : undefined,
  };
}

export function TexteMisEnForme({
  texte,
  style,
  tailleBase = 13.5,
}: {
  texte: string;
  style?: StyleProp<TextStyle>;
  /** La taille de la bulle qui contient ce texte — celle dont « grand » est proportionnel. */
  tailleBase?: number;
}) {
  const fragments = analyserTexteRiche(texte);
  return (
    <Text style={style}>
      {fragments.map((f, i) => {
        const propre = styleDe(f.style, tailleBase);
        // Sans style, pas de `<Text>` imbriqué : un fragment ordinaire n'a rien à porter.
        return propre ? (
          <Text key={i} style={propre}>
            {f.texte}
          </Text>
        ) : (
          <Text key={i}>{f.texte}</Text>
        );
      })}
    </Text>
  );
}
