/**
 * Types pour les imports `.svg` directs (`import Foo from './foo.svg'`), rendus comme composants React
 * par `react-native-svg-transformer` (cf. metro.config.js) — sans ce fichier, `tsc` ne connaît pas
 * l'extension `.svg` comme module importable.
 */
declare module '*.svg' {
  import React from 'react';
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
