/**
 * Grain subtil — texture de bruit tuilée en surimpression sur les GRANDES surfaces (pages, cartes,
 * en-têtes, feuilles). Volontairement absent des petits éléments (boutons, puces, avatars, cases OTP) :
 * en dessous d'environ 64px un grain tuilé ne se lit plus comme une texture mais comme de la « saleté »
 * (point validé avec l'utilisateur avant la refonte).
 *
 * `experimental_mixBlendMode: 'overlay'` (RN 0.76, New Arch, Android) donne un vrai mélange de texture
 * plutôt qu'un voile plat ; si la prop est ignorée sur un appareil/OEM donné, RN l'ignore silencieusement
 * et le rendu retombe simplement sur l'alpha plat ci-dessous — jamais de crash, dégradation propre.
 */
import React from 'react';
import {Image, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../state/ThemeContext';

const grainSource = require('../../assets/images/grain.png');

export function Grain({opacity, blend = true, style}: {opacity?: number; blend?: boolean; style?: StyleProp<ViewStyle>}) {
  const {scheme} = useTheme();
  const op = opacity ?? (scheme === 'dark' ? 0.08 : 0.05);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, blend && ({experimental_mixBlendMode: 'overlay'} as ViewStyle), style]}>
      <Image source={grainSource} resizeMode="repeat" style={[StyleSheet.absoluteFillObject, {opacity: op}]} />
    </View>
  );
}
