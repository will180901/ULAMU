/**
 * Thème ULAMU (mobile) — fidèle à la charte graphique et aux tokens des maquettes
 * Claude Design (Maquettes_ULAMU/tokens/*.css + docs/Charte Graphique/CG-01..11).
 *
 * Accent : Bleu Cobalt #2756A6. Thème CLAIR (les maquettes mobiles sont en clair).
 * Polices : Plus Jakarta Sans (display), Inter (body), JetBrains Mono (mono).
 *   → Tant que les .ttf ne sont pas embarquées, on retombe sur les polices système
 *     (un seul endroit à changer : `fonts`). La structure/les couleurs sont déjà fidèles.
 */
import {Platform, TextStyle} from 'react-native';

/**
 * Palettes CLAIRE et SOMBRE (tokens Maquettes_ULAMU/tokens/colors.css).
 * Le scale accent (cobalt) est partagé ; seuls fonds/texte/bordures/sémantiques flippent.
 * Le thème SOMBRE est le défaut de la plateforme (CG-01) — choix exposé via le ThemeProvider.
 */
export const lightColors = {
  // ── Accent : Bleu Cobalt (CG-01) — partagé ──
  accent50: '#EBF0FA',
  accent100: '#C6D4F2',
  accent200: '#9DB5E8',
  accent300: '#6F92DA',
  accent400: '#4B75CD',
  accent500: '#2756A6', // base marque
  accent600: '#1F479A', // header / hover
  accent700: '#163588',
  accent800: '#0E2568',
  accent900: '#091849',

  // Alias accent
  accent: '#2756A6',
  accentDark: '#1F479A',
  accentDarker: '#163588',
  accentSoft: '#EBF0FA',
  accentFg: '#FFFFFF',

  // ── Fonds (clair) ──
  bg: '#FAFAFA',
  bgSubtle: '#F4F4F5',
  bgMuted: '#EBEBEC',
  surface: '#FFFFFF',
  bgElevated: '#FFFFFF',

  // ── Texte ──
  textPrimary: '#111112',
  textSecondary: '#3F3F46',
  textTertiary: '#71717A',
  textDisabled: '#A1A1AA',
  textInverse: '#FFFFFF',
  textAccent: '#1F479A',

  // ── Bordures (renforcées — thème clair jugé trop pâle par l'utilisateur) ──
  border: '#E4E4E7',
  borderSubtle: 'rgba(0,0,0,0.10)',
  borderDefault: 'rgba(0,0,0,0.16)',
  borderStrong: 'rgba(0,0,0,0.28)',

  // ── Sémantiques ──
  success: '#2B6B40',
  successBg: '#F0FAF3',
  successBorder: '#A8D5B5',
  successDot: '#3D9A5C',
  warning: '#7A5515',
  warningBg: '#FEF9EC',
  warningBorder: '#EDD68A',
  error: '#7A2323',
  errorBg: '#FDF2F2',
  errorBorder: '#E8AAAA',
  errorDot: '#C44040',
  info: '#1D3F7A',
  infoBg: '#F0F5FD',
  infoBorder: '#A8C0E8',

  // Voile sur cobalt (partagé — les surfaces cobalt restent cobalt dans les 2 thèmes)
  onAccent: '#FFFFFF',
  onAccentSoft: 'rgba(255,255,255,0.82)',
  onAccentFaint: 'rgba(255,255,255,0.16)',
  onAccentBorder: 'rgba(255,255,255,0.22)',

  // ── Tons décoratifs (icônes/avatars) — SÉPARÉS des tons sémantiques ci-dessus (succès/erreur/…)
  // pour ne jamais confondre « vert parce que réussi » et « vert parce que décoratif ». Cobalt reste
  // l'unique accent de marque (CG-01) ; ces 6 tons ne le remplacent jamais.
  tones: {
    teal: {fg: '#0F6E6A', bg: '#E3F5F3', border: '#A8DAD4'}, // soins/clinique
    violet: {fg: '#5B3A8E', bg: '#F1ECFA', border: '#C9B8E8'}, // identité/sécurité
    indigo: {fg: '#3D4E9E', bg: '#ECEEFA', border: '#B9C2EE'}, // communication
    rose: {fg: '#9E3A63', bg: '#FCEDF2', border: '#F0BBD0'}, // attention/favoris
    magenta: {fg: '#8A3A78', bg: '#FAEDF7', border: '#E3B8DC'}, // lieu/paiement
    slate: {fg: '#4B5563', bg: '#F1F2F4', border: '#D3D7DD'}, // neutre — aussi le repli par défaut
  },

  /** 'light' | 'dark' — utile pour StatusBar / barStyle. */
  scheme: 'light' as 'light' | 'dark',
};

export type Palette = typeof lightColors;
export const toneNames = ['teal', 'violet', 'indigo', 'rose', 'magenta', 'slate'] as const;
export type ToneName = (typeof toneNames)[number];

/**
 * Couleur décorative stable pour un nom donné (avatars) — le même nom donne toujours le même ton ;
 * deux noms différents ont de bonnes chances de tons différents (façon WhatsApp/Slack). Hash simple,
 * sans dépendance, dérivé de la MÊME chaîne normalisée que les initiales (jamais de dérive entre les deux).
 */
export function toneForName(name: string): ToneName {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return toneNames[Math.abs(hash) % toneNames.length];
}

export const darkColors: Palette = {
  // Accent partagé
  accent50: 'rgba(79,117,205,0.13)',
  accent100: 'rgba(79,117,205,0.26)',
  accent200: '#9DB5E8',
  accent300: '#6F92DA',
  accent400: '#6F92DA',
  accent500: '#2756A6',
  accent600: '#1F479A',
  accent700: '#163588',
  accent800: '#0E2568',
  accent900: '#091849',

  accent: '#2756A6',
  accentDark: '#1F479A',
  accentDarker: '#163588',
  accentSoft: 'rgba(79,117,205,0.13)',
  accentFg: '#FFFFFF',

  // Fonds (sombre — défaut plateforme)
  bg: '#111113',
  bgSubtle: '#18181B',
  bgMuted: '#222226',
  surface: '#1C1C20',
  bgElevated: '#2A2A2F',

  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textTertiary: '#8A8A93',
  textDisabled: '#52525B',
  textInverse: '#111112',
  textAccent: '#6F92DA',

  // Thème sombre : INCHANGÉ (l'utilisateur l'a validé tel quel).
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  borderDefault: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.20)',

  success: '#6DBF8A',
  successBg: '#0F2318',
  successBorder: '#1F4A30',
  successDot: '#4CAF6E',
  warning: '#D4A430',
  warningBg: '#241B09',
  warningBorder: '#4A3512',
  error: '#E07070',
  errorBg: '#200F0F',
  errorBorder: '#3D1A1A',
  errorDot: '#C44040',
  info: '#7AAAE0',
  infoBg: '#0C1528',
  infoBorder: '#1A2E55',

  onAccent: '#FFFFFF',
  onAccentSoft: 'rgba(255,255,255,0.82)',
  onAccentFaint: 'rgba(255,255,255,0.16)',
  onAccentBorder: 'rgba(255,255,255,0.22)',

  // Mêmes 6 tons, valeurs adaptées au fond sombre (fg éclairci, bg quasi-noir teinté, border intermédiaire) —
  // nouveaux tokens, donc pas concernés par la consigne « ne pas toucher le thème sombre existant ».
  tones: {
    teal: {fg: '#5FC9C2', bg: '#122827', border: '#1F4E4A'},
    violet: {fg: '#B79AE0', bg: '#251C36', border: '#3E2F57'},
    indigo: {fg: '#8D9EE8', bg: '#1C2038', border: '#333F66'},
    rose: {fg: '#E28FAE', bg: '#301A22', border: '#552A3B'},
    magenta: {fg: '#D48FC7', bg: '#2C1C2A', border: '#4C2E48'},
    slate: {fg: '#A7AEB8', bg: '#212327', border: '#383C42'},
  },

  scheme: 'dark',
};

/**
 * Alias de compatibilité = palette CLAIRE. Les écrans NON ENCORE convertis au ThemeProvider
 * continuent d'utiliser cette palette (clair) et compilent ; les écrans convertis lisent la
 * palette active via useTheme()/useThemedStyles(). Migration progressive, app jamais cassée.
 */
export const colors = lightColors;

/** Échelle d'espacement (base 4px — CG-03). */
export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48};

/** Rayons — valeurs EXACTES des tokens de la charte (CG-03). */
export const radius = {
  sm: 4, // --radius-sm
  md: 6, // --radius-md (champs, boutons, pastille +242)
  lg: 10, // --radius-lg (cases OTP, cartes)
  xl: 14, // --radius-xl
  field: 6, // = radius-md
  button: 6, // = radius-md
  card: 10, // = radius-lg
  cardTop: 26, // carte flottante (haut) — valeur maquette
  headerBottom: 30, // en-tête cobalt (bas) — valeur maquette
  otp: 10, // = radius-lg
  pill: 9999,
};

/** Tailles typographiques (CG-02). */
export const fontSize = {
  xs: 12,
  sm: 13,
  label: 12.5,
  body: 15,
  lg: 18,
  display: 23,
  title: 24,
  hero: 28,
};

/**
 * Familles de polices ULAMU (embarquées dans assets/fonts, liées via react-native.config.js).
 * Sur Android, chaque graisse = un fichier ; on cible la famille exacte (le fontWeight est ignoré).
 * `body` reste sur la police système (Roboto) — proche d'Inter ; Inter pourra être embarqué plus tard.
 */
/**
 * Polices embarquées (CG-02). Le duo humaniste de la charte : Plus Jakarta Sans pour les titres,
 * Inter pour TOUT le texte courant — corps, libellés, aides, contenu des champs, soit l'essentiel
 * d'un écran de formulaire. Elle manquait jusqu'ici : `body` valait `undefined` et retombait donc sur
 * la police système d'Android (Roboto), ce qui contredisait la charte sur la majorité du texte affiché.
 *
 * Inter est livrée par Google Fonts en TAILLES OPTIQUES (18pt / 24pt / 28pt) : la 18pt est celle
 * dessinée pour le texte d'interface, les autres pour l'affichage à grande taille. Seules trois
 * graisses sont embarquées (400/500/600, les seules étoilées par CG-02) — embarquer les 54 fichiers
 * livrés aurait alourdi l'APK d'une quinzaine de mégaoctets sans rien apporter.
 */
export const fonts = {
  display: 'PlusJakartaSans-ExtraBold', // 800 — gros titres
  displayBold: 'PlusJakartaSans-Bold', // 700 — boutons, titres moyens
  displaySemibold: 'PlusJakartaSans-SemiBold', // 600
  body: 'Inter_18pt-Regular', // 400 — corps, hints
  bodyMedium: 'Inter_18pt-Medium', // 500 — valeurs de champ, accentuation légère
  bodySemibold: 'Inter_18pt-SemiBold', // 600 — libellés de champ, liens
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
};

/** Poids (le display de la charte est extra-bold). */
export const weight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extra: '800' as TextStyle['fontWeight'],
};

/** Styles de texte nommés (échelle CG-02), à étaler dans un <Text style={...}>. */
export const text = {
  hero: {
    fontFamily: fonts.display,
    fontSize: fontSize.hero,
    fontWeight: weight.extra,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  } as TextStyle,
  display: {
    fontFamily: fonts.display,
    fontSize: fontSize.display,
    fontWeight: weight.extra,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  } as TextStyle,
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSize.title,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  } as TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: fontSize.body,
    fontWeight: weight.regular,
    color: colors.textPrimary,
  } as TextStyle,
  label: {
    fontFamily: fonts.body,
    fontSize: fontSize.label,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
  } as TextStyle,
  caption: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    fontWeight: weight.regular,
    color: colors.textTertiary,
  } as TextStyle,
};

/** Ombres (thème clair, CG-04) — objets prêts pour RN. */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  card: {
    shadowColor: '#0F285A',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: -6},
    elevation: 10,
  },
  // Carte flottante : ombre vers le HAUT (maquette 0 -8 28). iOS la rend ; Android compense par l'elevation.
  cardUp: {
    shadowColor: '#0F285A',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
};

/** Durées d'animation (CG-09). */
export const duration = {fast: 150, base: 200, moderate: 250, slow: 350};
