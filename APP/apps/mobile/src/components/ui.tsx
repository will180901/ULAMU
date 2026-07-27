/**
 * Kit de composants ULAMU (mobile PATIENT) — reproduction PIXEL-PERFECT de la maquette
 * Maquettes_ULAMU/ui_kits/auth_mobile/authm.jsx. App PATIENT uniquement.
 * THÈME : les couleurs viennent de useTheme()/useThemedStyles() (clair/sombre). Le scale accent
 * cobalt et les surfaces cobalt (en-tête, bouton primaire) restent identiques dans les 2 thèmes.
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {Circle, G, Path, Rect, SvgUri} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fonts, Palette, radius, shadow, ToneName, toneForName} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';
import {Grain} from './Grain';
import {Icon, IconName, toneForIcon} from './Icon';

const isAndroid = Platform.OS === 'android';

/* ───────────────────────── Logo « ulamu » ───────────────────────── */
/**
 * Logo officiel ULAMU — glyphe exact de Maquettes_ULAMU/assets/logo-mark.svg (figure stylisée +
 * socle) dans un carré cobalt arrondi, suivi du mot-symbole « ulamu ». Le cobalt de marque (#2756A6)
 * est constant dans les deux thèmes (cf. en-tête du kit). `light` = posé sur fond cobalt (carré blanc).
 */
export function LogoMark({size = 28, light}: {size?: number; light?: boolean}) {
  const markBg = light ? '#FFFFFF' : '#2756A6';
  const glyph = light ? '#2756A6' : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width="32" height="32" rx="7" fill={markBg} />
      <G transform="translate(4 4) scale(1.5)">
        <Path d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z" fill={glyph} fillOpacity={0.92} />
        <Rect x="5.5" y="12.5" width="5" height="1.5" rx="0.75" fill={glyph} fillOpacity={0.72} />
      </G>
    </Svg>
  );
}

export function Logo({light, size = 28}: {light?: boolean; size?: number}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.logoRow}>
      <LogoMark size={size} light={light} />
      <Text style={[styles.logoText, {color: light ? '#fff' : colors.textPrimary}]}>ulamu</Text>
    </View>
  );
}

/* ──────────── En-tête cobalt (bleed haut, coins bas arrondis 30) ──────────── */
export function CobaltHeader({
  children,
  onBack,
  paddingBottom = 30,
}: {
  children?: React.ReactNode;
  onBack?: () => void;
  paddingBottom?: number;
}) {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.header, {paddingTop: insets.top + 16, paddingBottom}]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.accent600} translucent={false} />
      <Grain />
      <View pointerEvents="none" style={styles.headerHalo} />
      <View style={styles.headerTopRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Icon name="arrow-left" size={17} color="#fff" />
          </Pressable>
        ) : (
          <Logo light />
        )}
      </View>
      {children}
    </View>
  );
}

/* ──────────── Carte flottante (chevauche l'en-tête de -22) ──────────── */
export function FloatCard({children}: {children: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.floatCard, {paddingBottom: Math.max(insets.bottom, 14) + 16}, shadow.cardUp]}>
      <Grain />
      {children}
    </View>
  );
}

/* ──────────── Conteneur d'écran (scroll + clavier) ──────────── */
export function AuthScreen({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={isAndroid ? undefined : 'padding'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ──────────── Titres / sous-titres d'en-tête ──────────── */
export function HeaderTitle({children, size = 23}: {children: React.ReactNode; size?: number}) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.headerTitle, {fontSize: size}]}>{children}</Text>;
}
export function HeaderSubtitle({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.headerSubtitle}>{children}</Text>;
}

/* ──────────── Badge icône d'en-tête (OTP, etc.) ──────────── */
export function HeaderIconBadge({name}: {name: IconName}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.headerIconBadge}>
      <Icon name={name} size={22} color="#fff" strokeWidth={2} />
    </View>
  );
}

/* ──────────── Illustration héro (SVG popsy, plein largeur) ──────────── */
export function HeaderArt({slug, height = 170}: {slug: string; height?: number}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.headerArt, {height}]}>
      <SvgUri uri={`https://illustrations.popsy.co/white/${slug}.svg`} width="100%" height="100%" />
    </View>
  );
}

/* ──────────── Carrousel de parcours (en-tête Connexion) ──────────── */
const JOURNEY = [
  {slug: 'communication', t: 'Trouvez un soignant vérifié'},
  {slug: 'video-call', t: 'Consultez à distance, au tarif annoncé'},
  {slug: 'taking-notes', t: 'Recevez votre ordonnance signée'},
  {slug: 'customer-support', t: 'Réservez vos médicaments tout près'},
  {slug: 'success', t: 'Votre dossier de santé, à vie'},
];
export function StepCarousel() {
  const styles = useThemedStyles(makeStyles);
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, {toValue: 0, duration: 240, useNativeDriver: true}).start(() => {
        setI(v => (v + 1) % JOURNEY.length);
        Animated.timing(fade, {toValue: 1, duration: 320, useNativeDriver: true}).start();
      });
    }, 5000);
    return () => clearInterval(t);
  }, [fade]);
  const step = JOURNEY[i];
  return (
    <View>
      <Animated.View style={[styles.carouselArt, {opacity: fade}]}>
        <SvgUri uri={`https://illustrations.popsy.co/white/${step.slug}.svg`} width="100%" height="100%" />
      </Animated.View>
      <Animated.Text style={[styles.carouselTitle, {opacity: fade}]}>{step.t}</Animated.Text>
      <View style={styles.dotsRow}>
        {JOURNEY.map((_, k) => (
          <View key={k} style={[styles.dot, k === i ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
    </View>
  );
}

/* ──────────── Titre de carte (identité de la page) ──────────── */
export function CardHeading({title, subtitle}: {title: string; subtitle?: string}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.cardHeading}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* ──────────── Étiquette de champ ──────────── */
export function FieldLabel({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
}

/* ──────────── Champ texte (48px) ──────────── */
type FieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: IconName;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  maxLength?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go';
  inputRef?: React.RefObject<TextInput>;
};
export function Field(props: FieldProps) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[styles.fieldWrap, focus && styles.fieldWrapFocus]}>
      {props.icon ? <Icon name={props.icon} size={16} color={colors.textTertiary} /> : null}
      <TextInput
        ref={props.inputRef}
        style={styles.fieldInput}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize={props.autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        maxLength={props.maxLength}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={props.onSubmitEditing}
        returnKeyType={props.returnKeyType}
      />
    </View>
  );
}

/* ──────────── Champ téléphone (+242 figé + numéro) ──────────── */
export function PhoneField({value, onChangeText, onSubmitEditing}: {value: string; onChangeText: (t: string) => void; onSubmitEditing?: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.phoneRow}>
      <View style={styles.phonePill}>
        <Icon name="phone" size={14} color={colors.textSecondary} />
        <Text style={styles.phonePillText}>+242</Text>
      </View>
      <View style={[styles.fieldWrap, styles.flex, focus && styles.fieldWrapFocus]}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="06 612 45 90"
          placeholderTextColor={colors.textDisabled}
          keyboardType="phone-pad"
          maxLength={14}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

/* ──────────── Champ mot de passe (œil afficher/masquer) ──────────── */
export function PasswordField({
  value,
  onChangeText,
  placeholder = 'Votre mot de passe',
  onSubmitEditing,
  returnKeyType = 'done',
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go';
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.fieldWrap, focus && styles.fieldWrapFocus]}>
      <Icon name="lock" size={16} color={colors.textTertiary} />
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      <Pressable onPress={() => setShow(s => !s)} hitSlop={8}>
        <Icon name={show ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

/* ──────────── OTP — 6 cases ──────────── */
export function OtpInput({value, onChange}: {value: string; onChange: (v: string) => void}) {
  const styles = useThemedStyles(makeStyles);
  const refs = useRef<Array<TextInput | null>>([]);
  const setAt = (i: number, d: string) => {
    const a = value.split('');
    a[i] = d;
    onChange(a.join('').slice(0, 6));
  };
  return (
    <View style={styles.otpRow}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = !!value[i];
        return (
          <TextInput
            key={i}
            ref={el => {
              refs.current[i] = el;
            }}
            style={[styles.otpCell, filled && styles.otpCellOn]}
            value={value[i] || ''}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            onChangeText={t => {
              const d = t.replace(/\D/g, '').slice(-1);
              if (d) {
                setAt(i, d);
                if (i < 5) {
                  refs.current[i + 1]?.focus();
                }
              } else {
                setAt(i, '');
              }
            }}
            onKeyPress={e => {
              if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
                setAt(i - 1, '');
                refs.current[i - 1]?.focus();
              }
            }}
          />
        );
      })}
    </View>
  );
}

/* ──────────── Bouton primaire (accent, iconLeft/iconRight) ──────────── */
export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const disabled = props.disabled || props.loading;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={disabled}
      style={({pressed}) => [styles.btn, disabled && styles.btnDisabled, pressed && !disabled && styles.btnPressed, props.style]}>
      {props.loading ? (
        <ActivityIndicator color={colors.accentFg} />
      ) : (
        <View style={styles.btnContent}>
          {props.iconLeft ? <Icon name={props.iconLeft} size={17} color={colors.accentFg} /> : null}
          <Text style={styles.btnText}>{props.title}</Text>
          {props.iconRight ? <Icon name={props.iconRight} size={17} color={colors.accentFg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Bouton-icône — repos / pressé / focus COHÉRENTS partout (même recette, seule la couleur du ton
 * change selon l'icône). « Pressé » = ondulation native Android (transitoire) + voile de teinte
 * soutenu tant que le doigt reste posé — l'équivalent honnête du survol sur un écran tactile (pas de
 * souris). « Focus » = anneau bleu cobalt, identique quel que soit le ton propre du bouton (utile
 * clavier externe / accessibilité).
 */
export function IconButton({
  icon,
  onPress,
  size = 20,
  tone,
  variant = 'plain',
  disabled,
  hitSlop = 8,
  accessibilityLabel,
  children,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  size?: number;
  /** Ton explicite — sinon déduit de l'icône (toneForIcon), repli 'slate'. */
  tone?: ToneName;
  /** 'tile' = pastille douce (fond+bordure) ; 'solid' = pastille pleine (emphase, type FAB). */
  variant?: 'plain' | 'tile' | 'solid';
  disabled?: boolean;
  hitSlop?: number;
  /** Requis : bouton icône seule, sans libellé visible. */
  accessibilityLabel: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const {colors} = useTheme();
  const [focused, setFocused] = useState(false);
  const t = colors.tones[toneForIcon(icon, tone)];
  const box = Math.round(size * 1.9);
  const overlayColor = colors.scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      android_ripple={{color: t.border, borderless: variant === 'plain', radius: variant === 'plain' ? box / 2 : undefined}}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {width: box, height: box, borderRadius: box / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
        variant === 'tile' && {backgroundColor: t.bg, borderWidth: 1, borderColor: t.border},
        variant === 'solid' && {backgroundColor: t.fg},
        focused && {borderWidth: 2, borderColor: colors.accent500},
        disabled && {opacity: 0.45},
        style,
      ]}>
      {({pressed}) => (
        <>
          <Icon name={icon} size={size} color={variant === 'solid' ? '#fff' : t.fg} />
          {pressed && !disabled ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, {backgroundColor: overlayColor}]} /> : null}
          {children}
        </>
      )}
    </Pressable>
  );
}

/* Lien de pied de carte (« Nouveau sur ULAMU ? Créer un compte »). */
export function FootLink({prefix, action, onPress}: {prefix: string; action: string; onPress: () => void}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.footLine}>
      {prefix}{' '}
      <Text style={styles.footAction} onPress={onPress}>
        {action}
      </Text>
    </Text>
  );
}

/* ──────────── Interrupteur (consentement) — custom animé ──────────── */
export function Switch({value, onValueChange}: {value: boolean; onValueChange: (v: boolean) => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, {toValue: value ? 1 : 0, duration: 180, useNativeDriver: false}).start();
  }, [value, x]);
  const left = x.interpolate({inputRange: [0, 1], outputRange: [2, 20]});
  const bg = x.interpolate({inputRange: [0, 1], outputRange: [colors.bgMuted, colors.accent500]});
  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.switchTrack, {backgroundColor: bg, borderColor: value ? colors.accent500 : colors.borderDefault}]}>
        <Animated.View style={[styles.switchThumb, {left}]} />
      </Animated.View>
    </Pressable>
  );
}

/* ──────────── Badge (statut OTP, « Sécurisé ») ──────────── */
export function Badge({tone = 'neutral', icon, dot, children}: {tone?: 'neutral' | 'success'; icon?: IconName; dot?: boolean; children: React.ReactNode}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const map = {
    neutral: {bg: colors.bgMuted, fg: colors.textSecondary, bd: colors.borderDefault, dot: colors.textTertiary},
    success: {bg: colors.successBg, fg: colors.success, bd: colors.successBorder, dot: colors.successDot},
  }[tone];
  return (
    <View style={[styles.badge, {backgroundColor: map.bg, borderColor: map.bd}]}>
      {dot ? <View style={[styles.badgeDot, {backgroundColor: map.dot}]} /> : null}
      {icon ? <Icon name={icon} size={11} color={map.fg} /> : null}
      <Text style={[styles.badgeText, {color: map.fg}]}>{children}</Text>
    </View>
  );
}

/**
 * Sceau « Vérifié ULAMU » (M03) — badge ORIGINAL du système ULAMU : un sceau cobalt à 8 pointes
 * (deux carrés arrondis croisés) frappé d'un check blanc. Réservé aux soignants ayant passé la
 * procédure de vérification rigoureuse d'ULAMU (Badge Vérifié + contrat signé, D-029). Distinct de
 * tout coche générique : c'est la marque de certification de l'entreprise ULAMU.
 */
export function VerifiedBadge({size = 18}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="4" width="16" height="16" rx="5.5" fill="#2756A6" />
      <Rect x="4" y="4" width="16" height="16" rx="5.5" fill="#2756A6" transform="rotate(45 12 12)" />
      <Path d="M8.3 12.2l2.5 2.5 4.9-5.1" stroke="#FFFFFF" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * Point témoin lumineux clignotant — pastille pleine + halo qui pulse doucement (boucle Animated).
 * Sert d'indicateur « non lu » (cloche de notifications, nouveau message…). useNativeDriver = 60 fps.
 */
export function PulseDot({size = 8, color}: {size?: number; color?: string}) {
  const {colors} = useTheme();
  const c = color ?? colors.errorDot;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1, duration: 750, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0, duration: 750, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const box = size * 2;
  const coreOpacity = pulse.interpolate({inputRange: [0, 1], outputRange: [1, 0.45]});
  const haloOpacity = pulse.interpolate({inputRange: [0, 1], outputRange: [0.3, 0]});
  const haloScale = pulse.interpolate({inputRange: [0, 1], outputRange: [0.7, 1]});
  return (
    <View style={{width: box, height: box, alignItems: 'center', justifyContent: 'center'}} pointerEvents="none">
      <Animated.View style={{position: 'absolute', width: box, height: box, borderRadius: box / 2, backgroundColor: c, opacity: haloOpacity, transform: [{scale: haloScale}]}} />
      <Animated.View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: c, opacity: coreOpacity}} />
    </View>
  );
}

/** Étiquette « Vérifié ULAMU » : le sceau + le libellé, pour réaffirmer la certification (profil soignant). */
export function VerifiedTag({size = 13}: {size?: number}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.verifiedTag}>
      <VerifiedBadge size={size + 3} />
      <Text style={styles.verifiedTagText}>Vérifié ULAMU</Text>
    </View>
  );
}

/* ──────────── Avatar (photo si `uri`, sinon initiales teintées ; + statut en ligne) ──────────── */
export function Avatar({name, size = 36, online, uri}: {name: string; size?: number; online?: boolean; uri?: string | null}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Chaîne normalisée PARTAGÉE entre initiales et couleur (jamais de dérive entre les deux).
  const normalized = name.replace(/^Dr\.?\s+/i, '');
  const initials = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  // Couleur distincte par personne (façon WhatsApp/Slack) — remplace l'ancien fond cobalt unique.
  const t = colors.tones[toneForName(normalized || name)];
  const dot = Math.max(9, Math.round(size * 0.28));
  return (
    <View style={{width: size, height: size}}>
      {uri ? (
        <Image source={{uri}} style={{width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: t.border}} resizeMode="cover" />
      ) : (
        <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2, backgroundColor: t.fg, borderWidth: 1.5, borderColor: t.border}]}>
          <Text style={[styles.avatarText, {fontSize: Math.round(size * 0.36)}]}>{initials}</Text>
        </View>
      )}
      {online ? <View style={[styles.avatarDot, {width: dot, height: dot, borderRadius: dot / 2}]} /> : null}
    </View>
  );
}

/* ──────────── Carte ──────────── */
export function Card({children, style, padding}: {children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, padding != null && {padding}, shadow.sm, style]}>
      <Grain />
      {children}
    </View>
  );
}

export function Hint({children, center}: {children: React.ReactNode; center?: boolean}) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.hint, center && styles.center]}>{children}</Text>;
}

export function ErrorBanner({message}: {message: string | null}) {
  const styles = useThemedStyles(makeStyles);
  if (!message) {
    return null;
  }
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/* Bannière informative (info / success / warning / error) avec titre. */
export function Banner({tone = 'info', title, children}: {tone?: 'info' | 'success' | 'warning' | 'error'; title?: string; children?: React.ReactNode}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const map = {
    info: {bg: colors.infoBg, bd: colors.infoBorder, fg: colors.info},
    success: {bg: colors.successBg, bd: colors.successBorder, fg: colors.success},
    warning: {bg: colors.warningBg, bd: colors.warningBorder, fg: colors.warning},
    error: {bg: colors.errorBg, bd: colors.errorBorder, fg: colors.error},
  }[tone];
  return (
    <View style={[styles.banner, {backgroundColor: map.bg, borderColor: map.bd}]}>
      {title ? <Text style={[styles.bannerTitle, {color: map.fg}]}>{title}</Text> : null}
      {children ? <Text style={[styles.bannerBody, {color: map.fg}]}>{children}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    center: {textAlign: 'center'},

    // Logo
    logoRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
    logoMark: {borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    logoMarkLight: {backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)'},
    logoMarkDark: {backgroundColor: colors.accent500},
    logoText: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: '#fff'},

    // En-tête cobalt
    header: {
      backgroundColor: colors.accent600,
      borderBottomLeftRadius: radius.headerBottom,
      borderBottomRightRadius: radius.headerBottom,
      paddingHorizontal: 22,
      overflow: 'hidden',
    },
    headerHalo: {position: 'absolute', top: -120, right: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.10)'},
    headerTopRow: {flexDirection: 'row', alignItems: 'center', minHeight: 34, marginBottom: 14},
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {fontFamily: fonts.display, color: '#fff', letterSpacing: -0.5, marginTop: 8},
    headerSubtitle: {fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 19},
    headerIconBadge: {
      width: 46,
      height: 46,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    headerArt: {
      marginTop: 2,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.12)',
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    // Carrousel
    carouselArt: {
      height: 184,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.12)',
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 6,
    },
    carouselTitle: {fontFamily: fonts.display, fontSize: 23, lineHeight: 27, letterSpacing: -0.6, color: '#fff', minHeight: 56, marginTop: 2},
    dotsRow: {flexDirection: 'row', gap: 7, marginTop: 14, alignSelf: 'center'},
    dot: {height: 6, borderRadius: 4},
    dotOn: {width: 18, height: 8, backgroundColor: '#fff'},
    dotOff: {width: 6, backgroundColor: 'rgba(255,255,255,0.36)'},

    // Carte flottante
    floatCard: {
      flex: 1,
      marginTop: -22,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.cardTop,
      borderTopRightRadius: radius.cardTop,
      paddingHorizontal: 22,
      paddingTop: 24,
      overflow: 'hidden',
    },
    authScroll: {flexGrow: 1},

    // Titre de carte
    cardHeading: {marginBottom: 18},
    cardTitle: {fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.5, color: colors.textPrimary},
    cardSubtitle: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 5},

    // Labels & champs
    label: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 7},
    fieldWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 48,
      paddingHorizontal: 13,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      // Fond distinct de la page (colors.surface, pas colors.bg identique au fond d'écran) — c'est ce qui
      // corrige l'impression de champ « grisé/désactivé » remontée par l'utilisateur (le focus existant
      // ne se voyait pas faute de contraste de repos).
      backgroundColor: colors.surface,
    },
    fieldWrapFocus: {borderColor: colors.accent500, borderWidth: 1.5},
    fieldInput: {flex: 1, fontFamily: fonts.body, fontSize: 14.5, color: colors.textPrimary, padding: 0},

    // Téléphone
    phoneRow: {flexDirection: 'row', gap: 8},
    phonePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 48,
      paddingHorizontal: 13,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgMuted,
    },
    phonePillText: {fontFamily: fonts.mono, fontSize: 14.5, color: colors.textSecondary},

    // OTP
    otpRow: {flexDirection: 'row', justifyContent: 'space-between'},
    otpCell: {
      width: 48,
      height: 58,
      textAlign: 'center',
      borderRadius: radius.otp,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
      fontFamily: fonts.mono,
      fontSize: 23,
      color: colors.textPrimary,
      padding: 0,
    },
    otpCellOn: {borderColor: colors.accent500, borderWidth: 2},

    // Bouton
    btn: {
      backgroundColor: colors.accent500,
      borderRadius: radius.button,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    btnPressed: {backgroundColor: colors.accent600},
    btnDisabled: {backgroundColor: colors.accent200},
    btnContent: {flexDirection: 'row', alignItems: 'center', gap: 8},
    btnText: {fontFamily: fonts.body, color: colors.accentFg, fontSize: 15, fontWeight: '600'},

    footLine: {textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, marginTop: 22},
    footAction: {color: colors.textAccent, fontWeight: '700'},

    // Switch
    switchTrack: {width: 40, height: 22, borderRadius: 11, borderWidth: 1, justifyContent: 'center'},
    switchThumb: {position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', ...shadow.sm},

    // Badge
    badge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, alignSelf: 'center'},
    badgeDot: {width: 6, height: 6, borderRadius: 3},
    badgeText: {fontFamily: fonts.body, fontSize: 11.5, fontWeight: '600'},

    verified: {backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
    verifiedTag: {flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.pill, paddingLeft: 5, paddingRight: 10, paddingVertical: 4},
    verifiedTagText: {fontFamily: fonts.body, fontWeight: '700', fontSize: 11, color: colors.accent, letterSpacing: 0.1},

    avatar: {alignItems: 'center', justifyContent: 'center'}, // backgroundColor posé par instance (toneForName)
    avatarText: {fontFamily: fonts.display, color: '#fff'},
    avatarDot: {position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.successDot, borderWidth: 2, borderColor: colors.surface},

    card: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 14, overflow: 'hidden'},

    hint: {fontFamily: fonts.body, color: colors.textTertiary, fontSize: 12.5, lineHeight: 18},

    errorBox: {backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14},
    errorText: {fontFamily: fonts.body, color: colors.error, fontSize: 13, lineHeight: 18},
    banner: {borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 11},
    bannerTitle: {fontFamily: fonts.body, fontSize: 13, fontWeight: '700', marginBottom: 2},
    bannerBody: {fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18},
  });
