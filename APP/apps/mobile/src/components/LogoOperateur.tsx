/**
 * Le logo d'un opérateur Mobile Money — chantier 116, 14/09/2026.
 *
 * Demande du porteur : *« va télécharger les icônes Airtel Money et MoMo MTN, ensuite les logos des
 * deux entreprises au bon endroit ».*
 *
 * ── ⚠️ Pourquoi un logo plutôt qu'une icône générique ─────────────────────────────────────────
 *
 * Les deux lignes portaient le même petit téléphone gris. Or au moment de payer, ce qu'on cherche
 * des yeux n'est pas le mot « MTN » : c'est **le jaune**. *Une marque se reconnaît à sa couleur
 * avant de se lire* — et sur un écran tenu à bout de bras, dans la rue, c'est la seule chose qui se
 * voit.
 *
 * ── ⚠️ Le cadre jaune n'est pas une décoration ────────────────────────────────────────────────
 *
 * Le logo MTN est une forme NOIRE : c'est ainsi qu'il est publié, et c'est ainsi qu'il se pose sur
 * le jaune de la marque. Le poser sur fond blanc donnerait un ovale noir que personne ne
 * reconnaîtrait. Airtel, lui, porte déjà son rouge : il n'a besoin d'aucun fond.
 *
 * *Deux marques, deux façons d'exister — les forcer dans le même gabarit les abîmerait toutes les
 * deux.*
 *
 * La provenance et les conditions d'usage sont écrites dans `assets/images/OPERATEURS.md`.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import AirtelLogo from '../../assets/images/operateur-airtel.svg';
import MtnLogo from '../../assets/images/operateur-mtn.svg';
import {MomoOperator} from '../lib/contracts';
import {radius} from '../theme';

/** Le jaune de MTN, tel que la marque le publie. */
const JAUNE_MTN = '#FFCB05';

export function LogoOperateur({operator, taille = 34}: {operator: MomoOperator; taille?: number}) {
  if (operator === 'MTN_MOMO') {
    return (
      <View style={[styles.tuile, {width: taille, height: taille, backgroundColor: JAUNE_MTN}]}>
        <MtnLogo width={taille * 0.72} height={taille * 0.36} />
      </View>
    );
  }
  return (
    <View style={[styles.tuile, {width: taille, height: taille, backgroundColor: '#FFFFFF'}]}>
      <AirtelLogo width={taille * 0.6} height={taille * 0.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  tuile: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
