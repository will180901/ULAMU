/**
 * Coquille des écrans d'authentification — 3 couches :
 *
 * 1. `MeshGradientBackground` — fond plein écran : mesh gradient animé (plusieurs formes de couleurs
 *    différentes qui se fondent, dérive lente en boucle) + voile « verre dépoli » par-dessus (rend les
 *    illustrations SVG blanches et le texte lisibles sur un fond autrement trop chargé) + grain.
 * 2. Carrousel (illustration SVG à 80% de la hauteur d'écran + texte + points) posé sur ce fond, défilement
 *    lent et doux (transitions longues, easing in/out) ; bouton « Se connecter » qui déclenche l'ouverture.
 * 3. Bandeau de marque fixe (logo ULAMU empilé au-dessus du mot « ulamu ») + TIROIR (le formulaire, en
 *    `children`) : au tap sur le bouton, le tiroir glisse (par animation, plus au doigt) du bas jusqu'au
 *    plafond fixe ; le bandeau de marque, juste au-dessus, se révèle en fondu pendant la même montée —
 *    on a l'impression que le tiroir vient se glisser SOUS ce bandeau, par-dessus le carrousel.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, Image as SvgImage, Path, Pattern, RadialGradient, Rect, Stop} from 'react-native-svg';
import InsuranceIllustration from '../../assets/images/Insurance-cuate.svg';
import MedicalPrescriptionIllustration from '../../assets/images/Medical prescription-bro.svg';
import MedicineIllustration from '../../assets/images/Medicine-bro.svg';
import OnlineDoctorIllustration from '../../assets/images/Online Doctor-amico.svg';
import PharmacistIllustration from '../../assets/images/Pharmacist-cuate.svg';
import {useTheme} from '../state/ThemeContext';
import {shadow} from '../theme';
import {Icon} from './Icon';
import {LogoMark, PrimaryButton} from './ui';

const isAndroid = Platform.OS === 'android';

/** Palette du mesh gradient — la couleur d'accent du projet (cobalt) et ses nuances, valeurs EXACTES de
 * la scale `theme.ts` (accent900→accent100 : #091849/#163588/#2756A6 base marque/#4B75CD/#6F92DA/#C6D4F2),
 * indépendante du thème clair/sombre (comme le cobalt de marque partout ailleurs dans l'app). */
const MESH_COLORS = ['#091849', '#163588', '#2756A6', '#4B75CD', '#6F92DA', '#C6D4F2'];
// Voile plus marqué qu'un simple vernis : c'est LUI qui désature/adoucit les couleurs du mesh (le rendu
// « flou naturel » vient des formes elles-mêmes, en dégradé — pas d'un filtre de flou, qui créait un
// artefact carré visible sur Android avec react-native-svg).
const FROST_OVERLAY = 'rgba(255,255,255,0.38)';

/** 3 tracés organiques (pas des cercles) — viewBox 0 0 100 100, mis à l'échelle via width/height du Svg. */
const BLOB_PATHS = [
  'M48,4 C66,2 86,16 90,38 C94,58 84,80 62,90 C42,98 16,90 6,70 C-2,52 8,26 26,12 C32,8 40,5 48,4 Z',
  'M40,6 C62,0 88,14 94,36 C100,56 90,76 70,88 C52,98 26,96 12,80 C0,66 2,42 14,26 C22,14 30,10 40,6 Z',
  'M52,8 C74,4 92,22 92,44 C92,64 80,84 58,92 C38,98 14,88 6,68 C-2,50 4,26 22,14 C32,6 42,10 52,8 Z',
];

/** Diapositives du carrousel — illustrations Storyset embarquées localement (plus de dépendance CDN).
 * Ordre/texte proposés pour suivre le parcours patient ULAMU — à ajuster si besoin. */
const SLIDES = [
  {Illustration: OnlineDoctorIllustration, t: 'Trouvez un soignant vérifié'},
  {Illustration: MedicalPrescriptionIllustration, t: 'Recevez votre ordonnance signée'},
  {Illustration: MedicineIllustration, t: 'Réservez vos médicaments tout près'},
  {Illustration: PharmacistIllustration, t: 'Retirez-les en pharmacie en toute confiance'},
  {Illustration: InsuranceIllustration, t: 'Payez en toute transparence'},
];
// Séquence par diapositive : l'image apparaît en fondu, PUIS (une fois posée) le texte entier apparaît
// en fondu, tient un temps, puis tout s'efface avant que la suivante apparaisse. Toutes les illustrations
// restent montées en permanence (superposées, seule l'opacité change) — les remonter/démonter à chaque
// tour est ce qui causait les à-coups (ce sont de gros SVG, le montage/démontage coûte un temps réel).
const IMAGE_FADE_MS = 700;
const TEXT_START_DELAY_MS = 400; // laisse l'image prendre un peu d'avance avant que le texte commence à apparaître
const TEXT_FADE_MS = 600;
const HOLD_MS = 3000; // temps plein affiché une fois le texte apparu, avant de basculer
const FADE_OUT_MS = 500;

// Trajectoires multi-arrêts, grande amplitude (~40-55% de la taille de la forme) — chaque motif visite
// 3 des 8 points cardinaux (nord/sud/est/ouest/nord-est/nord-ouest/sud-est/sud-ouest) avant de revenir à
// l'origine ; les 3 motifs pris ensemble couvrent les 8 directions, pas juste un aller-retour limité.
// [progrès 0-1, dx%, dy%, échelle]
type DriftStop = [number, number, number, number];
const DRIFT_1: DriftStop[] = [[0, 0, 0, 1], [0.25, 50, -46, 1.18], [0.5, -40, 48, 0.86], [0.75, -48, -32, 1.12], [1, 0, 0, 1]]; // NE → SW → NO
const DRIFT_2: DriftStop[] = [[0, 0, 0, 1], [0.3, 46, 46, 1.16], [0.6, -48, -38, 0.85], [0.85, 32, -46, 1.14], [1, 0, 0, 1]]; // SE → NO → NE
const DRIFT_3: DriftStop[] = [[0, 0, 0, 1], [0.35, -46, 40, 1.14], [0.65, 44, -42, 0.84], [0.9, 22, 44, 1.1], [1, 0, 0, 1]]; // SO → NE → SE

type MeshBlob = {
  size: number;
  top: `${number}%`;
  left: `${number}%`;
  color: string;
  stops: DriftStop[];
  duration: number;
  shape: number; // index dans BLOB_PATHS
};
const MESH_BLOBS: MeshBlob[] = [
  {size: 460, top: '-16%', left: '-22%', color: MESH_COLORS[0], stops: DRIFT_1, duration: 15000, shape: 0},
  {size: 420, top: '52%', left: '50%', color: MESH_COLORS[1], stops: DRIFT_2, duration: 17000, shape: 1},
  {size: 400, top: '66%', left: '-18%', color: MESH_COLORS[2], stops: DRIFT_3, duration: 13000, shape: 2},
  {size: 380, top: '2%', left: '44%', color: MESH_COLORS[3], stops: DRIFT_2, duration: 16000, shape: 0},
  {size: 360, top: '28%', left: '4%', color: MESH_COLORS[4], stops: DRIFT_1, duration: 14000, shape: 1},
  {size: 340, top: '-10%', left: '16%', color: MESH_COLORS[5], stops: DRIFT_3, duration: 18000, shape: 2},
];

function MeshBlobView({blob, index}: {blob: MeshBlob; index: number}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, {toValue: 1, duration: blob.duration, easing: Easing.linear, useNativeDriver: true}));
    const t = setTimeout(() => loop.start(), index * 400);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [blob, progress, index]);

  const inputRange = blob.stops.map(s => s[0]);
  const translateX = progress.interpolate({inputRange, outputRange: blob.stops.map(s => (s[1] / 100) * blob.size)});
  const translateY = progress.interpolate({inputRange, outputRange: blob.stops.map(s => (s[2] / 100) * blob.size)});
  const scale = progress.interpolate({inputRange, outputRange: blob.stops.map(s => s[3])});
  const gradId = `mesh-grad-${index}`;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: blob.top,
        left: blob.left,
        width: blob.size,
        height: blob.size,
        transform: [{translateX}, {translateY}, {scale}],
      }}>
      <Svg width={blob.size} height={blob.size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" r="62%">
            <Stop offset="0%" stopColor={blob.color} stopOpacity={0.8} />
            <Stop offset="30%" stopColor={blob.color} stopOpacity={0.68} />
            <Stop offset="55%" stopColor={blob.color} stopOpacity={0.4} />
            <Stop offset="80%" stopColor={blob.color} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={BLOB_PATHS[blob.shape]} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

const grainSource = require('../../assets/images/grain.png');
const GRAIN_TILE = 128; // taille native réelle de grain.png — évite tout flou d'agrandissement.

/**
 * Grain tuilé sur toute la surface via un <Pattern> SVG plutôt que `Image resizeMode="repeat"` : ce
 * dernier ne tuile qu'une seule fois (un carré net dans un coin) sur cet appareil au lieu de couvrir
 * toute la zone — bug de rendu Android bien identifié, le motif SVG le contourne entièrement.
 */
function MeshGrain({opacity}: {opacity: number}) {
  const {width, height} = useWindowDimensions();
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="mesh-grain" patternUnits="userSpaceOnUse" width={GRAIN_TILE} height={GRAIN_TILE}>
          <SvgImage href={grainSource} width={GRAIN_TILE} height={GRAIN_TILE} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#mesh-grain)" opacity={opacity} />
    </Svg>
  );
}

function MeshGradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, {backgroundColor: MESH_COLORS[0]}]} />
      {MESH_BLOBS.map((b, i) => (
        <MeshBlobView key={i} blob={b} index={i} />
      ))}
      {/* Verre dépoli léger — le flou « naturel » vient des formes floutées elles-mêmes ci-dessus ; ce
          voile ne fait qu'unifier/adoucir légèrement, sans éteindre l'animation visible en dessous. */}
      <View style={[StyleSheet.absoluteFill, {backgroundColor: FROST_OVERLAY}]} />
      <MeshGrain opacity={0.45} />
    </View>
  );
}

/** Illustration + texte + points + bouton — PAS le fond (voir MeshGradientBackground, toujours affiché
 * séparément derrière, y compris une fois le tiroir ouvert : seul ce contenu de premier plan disparaît). */
function CarouselContent({onLogin, label}: {onLogin: () => void; label: string}) {
  const {height: screenH} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  // Une opacité PAR diapositive — toutes les illustrations restent montées en permanence (voir plus haut) ;
  // seule celle-ci change réellement, les autres restent à 0 sans jamais être démontées/remontées.
  const opacities = useRef(SLIDES.map((_, k) => new Animated.Value(k === 0 ? 1 : 0))).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let textInTimeout: ReturnType<typeof setTimeout>;
    let holdTimeout: ReturnType<typeof setTimeout>;

    Animated.timing(opacities[index], {
      toValue: 1,
      duration: IMAGE_FADE_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    textOpacity.setValue(0);
    textInTimeout = setTimeout(() => {
      if (cancelled) return;
      Animated.timing(textOpacity, {toValue: 1, duration: TEXT_FADE_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true}).start();

      holdTimeout = setTimeout(() => {
        if (cancelled) return;
        Animated.parallel([
          Animated.timing(opacities[index], {toValue: 0, duration: FADE_OUT_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
          Animated.timing(textOpacity, {toValue: 0, duration: FADE_OUT_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        ]).start(({finished}) => {
          if (cancelled || !finished) return;
          setIndex(v => (v + 1) % SLIDES.length);
        });
      }, HOLD_MS);
    }, TEXT_START_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(textInTimeout);
      clearTimeout(holdTimeout);
    };
  }, [index, opacities, textOpacity]);

  const artHeight = screenH * 0.8;

  return (
    <View style={styles.carouselContent}>
      <View style={{width: '100%', height: artHeight}}>
        {SLIDES.map((s, k) => {
          const Illustration = s.Illustration;
          return (
            <Animated.View
              key={k}
              style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', opacity: opacities[k]}]}>
              <Illustration width="100%" height="100%" />
            </Animated.View>
          );
        })}
      </View>
      <Animated.Text style={[styles.carouselText, {opacity: textOpacity}]}>{SLIDES[index].t}</Animated.Text>
      <View style={styles.dotsRow}>
        {SLIDES.map((_, k) => (
          <View key={k} style={[styles.dot, k === index ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
      <PrimaryButton title={label} onPress={onLogin} style={[styles.loginBtn, {marginBottom: Math.max(insets.bottom, 12) + 8}]} />
    </View>
  );
}

export function AuthCarouselDrawer({
  children,
  triggerLabel = 'Se connecter',
  startOpen = false,
  onBack,
}: {
  children: React.ReactNode;
  triggerLabel?: string;
  /** Écran atteint par navigation (Inscription, Mot de passe oublié…) : le tiroir est déjà ouvert au
   * montage, pas de bouton à retaper. Le bandeau du haut n'est alors plus cliquable pour « refermer »
   * (ça n'aurait pas de sens ici) — c'est `onBack` qui gère le retour. */
  startOpen?: boolean;
  /** Affiche une flèche retour en haut du tiroir. */
  onBack?: () => void;
}) {
  const {height: screenH} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const [open, setOpen] = useState(startOpen);

  // Plafond = position fixe actuelle (repère : ancien en-tête cobalt + recouvrement -22 de la carte).
  const CEILING_TOP = insets.top + 210;
  const CLOSED_OFFSET = screenH - CEILING_TOP;

  const progress = useRef(new Animated.Value(startOpen ? 1 : 0)).current; // 0 = fermé (tiroir hors écran) ; 1 = ouvert (plafond)

  function openDrawer() {
    setOpen(true);
    Animated.timing(progress, {toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
  }

  function closeDrawer() {
    Animated.timing(progress, {toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start(() => setOpen(false));
  }

  const translateY = progress.interpolate({inputRange: [0, 1], outputRange: [CLOSED_OFFSET, 0]});
  // Le contenu de premier plan du carrousel (illustration/texte/points/bouton) disparaît à l'ouverture —
  // seul le fond (mesh gradient + grain) doit rester visible dans la bande au-dessus du tiroir.
  const carouselContentOpacity = progress.interpolate({inputRange: [0, 0.3, 1], outputRange: [1, 0, 0]});

  return (
    <View style={{flex: 1}}>
      <MeshGradientBackground />
      {/* Le carrousel (5 grosses illustrations SVG) ne sert jamais sur un écran `startOpen` (Inscription,
          Mot de passe oublié…) — il ne serait de toute façon jamais visible. Ne pas le monter du tout
          là où on sait qu'il ne sert pas évite le coût de montage de 5 gros SVG à la navigation (c'était
          la lenteur ressentie en arrivant sur ces écrans). */}
      {!startOpen && (
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: carouselContentOpacity}]}
          pointerEvents={open ? 'none' : 'auto'}>
          <CarouselContent onLogin={openDrawer} label={triggerLabel} />
        </Animated.View>
      )}

      {/* Bandeau de marque — fixe, TOUJOURS visible (carrousel ET tiroir ouvert). Tap dessus quand le
          tiroir est ouvert (= en dehors du tiroir) le referme et revient au carrousel ; inerte sinon
          (le bouton « Se connecter » du carrousel, en dessous, reste cliquable). */}
      <View pointerEvents="box-none" style={[styles.brandBand, {height: CEILING_TOP}]}>
        {open && !startOpen && <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />}
        <View pointerEvents="none" style={[styles.brandBandContent, {paddingTop: insets.top + 10}]}>
          <LogoMark size={30} light />
          <Text style={styles.brandText}>ulamu</Text>
        </View>
      </View>

      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.drawer, shadow.cardUp, {top: CEILING_TOP, bottom: 0, transform: [{translateY}]}]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={[styles.backBtn, {backgroundColor: colors.bgSubtle}]}>
            <Icon name="arrow-left" size={17} color={colors.textPrimary} />
          </Pressable>
        )}
        <KeyboardAvoidingView style={{flex: 1}} behavior={isAndroid ? undefined : 'padding'}>
          <ScrollView
            style={{flex: 1}}
            contentContainerStyle={styles.drawerBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContent: {flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28, paddingHorizontal: 24},
  // `alignSelf:'stretch'` + `justifyContent:'flex-start'` : la ligne garde une largeur FIXE (celle du
  // conteneur), le texte grandit vers la droite depuis un bord gauche fixe — sinon (rangée centrée qui
  // grandit avec son contenu) le texte semble s'étendre depuis le centre, pas s'écrire de gauche à droite.
  carouselText: {color: '#fff', fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 8, minHeight: 26},
  dotsRow: {flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 28},
  dot: {width: 6, height: 6, borderRadius: 3},
  dotOn: {backgroundColor: '#fff', width: 18},
  dotOff: {backgroundColor: 'rgba(255,255,255,0.35)'},
  loginBtn: {width: '100%'},
  brandBand: {position: 'absolute', top: 0, left: 0, right: 0},
  brandBandContent: {flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4},
  brandText: {color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3},
  backBtn: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 18, marginTop: 16},
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  drawerBody: {flexGrow: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24},
});
