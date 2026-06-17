/**
 * Icônes ULAMU — tracés style Lucide (stroke 2, 24×24), rendus via react-native-svg.
 * Même langage iconographique que les maquettes (CG-10).
 *
 * Personnalisation (refonte thème clair) : chaque icône a un TON décoratif par défaut
 * (`ICON_TONE_MAP`, catégorie → un des 6 tons de theme.ts) — `slate` est le repli explicite pour
 * toute icône non listée ici (navigation pure : flèches, coche, chevrons…), volontairement neutre
 * pour que les icônes de CONTENU (soins, sécurité, communication…) ressortent davantage.
 * `color`/`tone` explicites à l'appel restent toujours prioritaires sur cette table.
 */
import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Line, Path, Polyline, Rect} from 'react-native-svg';
import {useTheme} from '../state/ThemeContext';
import {ToneName} from '../theme';

export type IconName =
  | 'user'
  | 'stethoscope'
  | 'phone'
  | 'send'
  | 'arrow-left'
  | 'arrow-right'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'check'
  | 'check-circle'
  | 'message'
  | 'shield-check'
  | 'search'
  | 'calendar'
  | 'map-pin'
  | 'log-out'
  | 'bell'
  | 'pill'
  | 'activity'
  | 'file-medical'
  | 'clock'
  | 'star'
  | 'users'
  | 'share'
  | 'refresh'
  | 'chevron-right'
  | 'plus'
  | 'key'
  | 'smartphone'
  | 'home'
  | 'credit-card'
  | 'settings'
  | 'filter'
  | 'sun'
  | 'moon'
  | 'x'
  | 'trash'
  | 'mic'
  | 'play'
  | 'pause'
  | 'image';

/** Catégorie → ton décoratif (26 icônes de contenu mappées ; les 17 autres = 'slate' par défaut). */
const ICON_TONE_MAP: Partial<Record<IconName, ToneName>> = {
  // teal — soins/clinique
  stethoscope: 'teal', calendar: 'teal', pill: 'teal', activity: 'teal', 'file-medical': 'teal', clock: 'teal',
  // violet — identité/sécurité
  user: 'violet', users: 'violet', lock: 'violet', eye: 'violet', 'eye-off': 'violet',
  'shield-check': 'violet', key: 'violet', smartphone: 'violet', 'log-out': 'violet',
  // indigo — communication
  phone: 'indigo', send: 'indigo', mail: 'indigo', message: 'indigo', share: 'indigo', mic: 'indigo', image: 'indigo',
  // rose — attention/favoris
  bell: 'rose', star: 'rose',
  // magenta — lieu/paiement
  'map-pin': 'magenta', 'credit-card': 'magenta',
};

/** Ton effectif pour une icône — explicite en priorité, sinon catégorie, sinon 'slate'. Source unique
 * partagée avec `IconButton` (ui.tsx) pour que le même icône ait toujours le même ton par défaut. */
export function toneForIcon(name: IconName, explicit?: ToneName): ToneName {
  return explicit ?? ICON_TONE_MAP[name] ?? 'slate';
}

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
  tone,
  variant = 'plain',
  style,
}: {
  name: IconName;
  size?: number;
  /** Couleur explicite — prioritaire sur `tone` et sur la table de tons. */
  color?: string;
  strokeWidth?: number;
  /** Ton décoratif explicite — sinon déduit de `name` via ICON_TONE_MAP, repli 'slate'. */
  tone?: ToneName;
  /** 'tile' = glyphe posé sur une pastille arrondie teintée (fond doux + bordure douce). */
  variant?: 'plain' | 'tile';
  /** Appliqué à la pastille (variant='tile' uniquement) — pour l'espacement/positionnement d'appel. */
  style?: StyleProp<ViewStyle>;
}) {
  const {colors} = useTheme();
  const resolvedTone = colors.tones[toneForIcon(name, tone)];
  const fg = color ?? resolvedTone.fg;
  const p = {stroke: fg, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const};
  const glyph = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, p)}
    </Svg>
  );
  if (variant !== 'tile') {
    return glyph;
  }
  const tileSize = Math.round(size * 1.8);
  return (
    <View
      style={[
        styles.tile,
        {width: tileSize, height: tileSize, borderRadius: tileSize / 2, backgroundColor: resolvedTone.bg, borderColor: resolvedTone.border},
        style,
      ]}>
      {glyph}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {alignItems: 'center', justifyContent: 'center', borderWidth: 1},
});

function render(name: IconName, p: object): React.ReactNode {
  switch (name) {
    case 'user':
      return (
        <>
          <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="12" cy="7" r="4" {...p} />
        </>
      );
    case 'stethoscope':
      return (
        <>
          <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" {...p} />
          <Path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" {...p} />
          <Circle cx="20" cy="10" r="2" {...p} />
        </>
      );
    case 'phone':
      return (
        <Path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
          {...p}
        />
      );
    case 'send':
      return (
        <>
          <Line x1="22" y1="2" x2="11" y2="13" {...p} />
          <Path d="M22 2 15 22l-4-9-9-4 20-7z" {...p} />
        </>
      );
    case 'arrow-left':
      return (
        <>
          <Line x1="19" y1="12" x2="5" y2="12" {...p} />
          <Polyline points="12 19 5 12 12 5" {...p} />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
          <Polyline points="12 5 19 12 12 19" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...p} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...p} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" {...p} />
          <Circle cx="12" cy="12" r="3" {...p} />
        </>
      );
    case 'eye-off':
      return (
        <>
          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" {...p} />
          <Path d="M6.61 6.61A18.45 18.45 0 0 0 2 12s3 7 10 7a9.12 9.12 0 0 0 5.39-1.61" {...p} />
          <Line x1="2" y1="2" x2="22" y2="22" {...p} />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect x="2" y="4" width="20" height="16" rx="2" {...p} />
          <Path d="m22 7-10 5L2 7" {...p} />
        </>
      );
    case 'check':
      return <Polyline points="20 6 9 17 4 12" {...p} />;
    case 'check-circle':
      return (
        <>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...p} />
          <Polyline points="22 4 12 14.01 9 11.01" {...p} />
        </>
      );
    case 'message':
      return <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...p} />;
    case 'shield-check':
      return (
        <>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p} />
          <Polyline points="9 12 11 14 15 10" {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="8" {...p} />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" {...p} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="2" {...p} />
          <Line x1="16" y1="2" x2="16" y2="6" {...p} />
          <Line x1="8" y1="2" x2="8" y2="6" {...p} />
          <Line x1="3" y1="10" x2="21" y2="10" {...p} />
        </>
      );
    case 'map-pin':
      return (
        <>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...p} />
          <Circle cx="12" cy="10" r="3" {...p} />
        </>
      );
    case 'log-out':
      return (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...p} />
          <Polyline points="16 17 21 12 16 7" {...p} />
          <Line x1="21" y1="12" x2="9" y2="12" {...p} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...p} />
        </>
      );
    case 'pill':
      return (
        <>
          <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" {...p} />
          <Path d="m8.5 8.5 7 7" {...p} />
        </>
      );
    case 'activity':
      return <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...p} />;
    case 'file-medical':
      return (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...p} />
          <Polyline points="14 2 14 8 20 8" {...p} />
          <Line x1="12" y1="12" x2="12" y2="18" {...p} />
          <Line x1="9" y1="15" x2="15" y2="15" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...p} />
          <Polyline points="12 6 12 12 16 14" {...p} />
        </>
      );
    case 'star':
      return <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" {...p} />;
    case 'users':
      return (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="9" cy="7" r="4" {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} />
        </>
      );
    case 'share':
      return (
        <>
          <Circle cx="18" cy="5" r="3" {...p} />
          <Circle cx="6" cy="12" r="3" {...p} />
          <Circle cx="18" cy="19" r="3" {...p} />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...p} />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...p} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Polyline points="23 4 23 10 17 10" {...p} />
          <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" {...p} />
        </>
      );
    case 'chevron-right':
      return <Polyline points="9 18 15 12 9 6" {...p} />;
    case 'plus':
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...p} />
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
        </>
      );
    case 'key':
      return (
        <>
          <Circle cx="7.5" cy="15.5" r="5.5" {...p} />
          <Path d="m21 2-9.6 9.6" {...p} />
          <Path d="m15.5 7.5 3 3L22 7l-3-3" {...p} />
        </>
      );
    case 'smartphone':
      return (
        <>
          <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" {...p} />
          <Line x1="12" y1="18" x2="12.01" y2="18" {...p} />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...p} />
        </>
      );
    case 'credit-card':
      return (
        <>
          <Rect x="2" y="5" width="20" height="14" rx="2" {...p} />
          <Line x1="2" y1="10" x2="22" y2="10" {...p} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...p} />
        </>
      );
    case 'filter':
      return <Path d="M22 3H2l8 9.46V19l4 2v-8.54z" {...p} />;
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...p} />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" {...p} />
        </>
      );
    case 'moon':
      return <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" {...p} />;
    case 'x':
      return <Path d="M18 6 6 18M6 6l12 12" {...p} />;
    case 'trash':
      return (
        <>
          <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" {...p} />
          <Path d="M10 11v6M14 11v6" {...p} />
        </>
      );
    case 'mic':
      return (
        <>
          <Path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" {...p} />
          <Path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" {...p} />
        </>
      );
    case 'play':
      return <Path d="M6 4l14 8-14 8z" {...p} />;
    case 'pause':
      return (
        <>
          <Line x1="7" y1="4" x2="7" y2="20" {...p} />
          <Line x1="17" y1="4" x2="17" y2="20" {...p} />
        </>
      );
    case 'image':
      return (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="2" {...p} />
          <Circle cx="8.5" cy="8.5" r="1.5" {...p} />
          <Path d="M21 15l-5-5L5 21" {...p} />
        </>
      );
    default:
      return null;
  }
}
