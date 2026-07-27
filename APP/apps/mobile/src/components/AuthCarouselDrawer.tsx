/**
 * Coquille des écrans d'authentification — 3 couches :
 *
 * 1. `MeshGradientBackground` — fond plein écran : mesh gradient animé (plusieurs formes de couleurs
 *    différentes qui se fondent, dérive lente en boucle) + voile « verre dépoli » par-dessus (rend les
 *    illustrations claires et le texte lisibles sur un fond autrement trop chargé) + grain.
 * 2. Carrousel (illustration à 80% de la hauteur d'écran + texte + points) posé sur ce fond, défilement
 *    lent et doux (transitions longues, easing in/out) ; bouton « Se connecter » qui déclenche l'ouverture.
 * 3. Bandeau de marque fixe (logo ULAMU empilé au-dessus du mot « ulamu ») + TIROIR (le formulaire, en
 *    `children`) : au tap sur le bouton, le tiroir glisse (par animation, plus au doigt) du bas jusqu'au
 *    plafond fixe ; le bandeau de marque, juste au-dessus, se révèle en fondu pendant la même montée —
 *    on a l'impression que le tiroir vient se glisser SOUS ce bandeau, par-dessus le carrousel.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {shadow} from '../theme';
import {LogoMark, PrimaryButton} from './ui';

const isAndroid = Platform.OS === 'android';

// TOUT le décor de cet écran (illustrations, formes du fond, grain) est en PNG et non en SVG. Raison
// mesurée, pas théorique : react-native-svg crée une vue native par élément graphique, or les 5
// illustrations Storyset totalisent ~830 éléments, toutes montées en permanence (elles se superposent
// en fondu) — l'app gardait donc ~830 vues natives vivantes en continu et saturait le thread principal,
// au point que les taps semblaient « caler ». En PNG, chaque visuel est une texture unique composée par
// le GPU. Les sources SVG restent dans assets/images/ ; les PNG en sont dérivés (rendu identique).

/** Couleur de fond sous les formes — accent900 de `theme.ts`, la teinte la plus sombre du mesh.
 * (Le voile « verre dépoli » blanc 38 % qui désature l'ensemble est désormais pré-composé avec le grain
 * dans `frost-grain.png`, cf. plus bas.) */
const MESH_BASE = '#091849';

/** Diapositives du carrousel — illustrations Storyset embarquées localement (plus de dépendance CDN).
 * Ordre/texte proposés pour suivre le parcours patient ULAMU — à ajuster si besoin. */
const SLIDES = [
  {image: require('../../assets/images/slide-online-doctor.png'), t: 'Trouvez un soignant vérifié'},
  {image: require('../../assets/images/slide-prescription.png'), t: 'Recevez votre ordonnance signée'},
  {image: require('../../assets/images/slide-medicine.png'), t: 'Réservez vos médicaments tout près'},
  {image: require('../../assets/images/slide-pharmacist.png'), t: 'Retirez-les en pharmacie en toute confiance'},
  {image: require('../../assets/images/slide-insurance.png'), t: 'Payez en toute transparence'},
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
  /** Texture pré-rendue : tracé organique + dégradé radial de la nuance (accent900→accent100). */
  image: number;
  stops: DriftStop[];
  duration: number;
};
const MESH_BLOBS: MeshBlob[] = [
  {size: 460, top: '-16%', left: '-22%', image: require('../../assets/images/mesh-blob-0.png'), stops: DRIFT_1, duration: 15000},
  {size: 420, top: '52%', left: '50%', image: require('../../assets/images/mesh-blob-1.png'), stops: DRIFT_2, duration: 17000},
  {size: 400, top: '66%', left: '-18%', image: require('../../assets/images/mesh-blob-2.png'), stops: DRIFT_3, duration: 13000},
  {size: 380, top: '2%', left: '44%', image: require('../../assets/images/mesh-blob-3.png'), stops: DRIFT_2, duration: 16000},
  {size: 360, top: '28%', left: '4%', image: require('../../assets/images/mesh-blob-4.png'), stops: DRIFT_1, duration: 14000},
  {size: 340, top: '-10%', left: '16%', image: require('../../assets/images/mesh-blob-5.png'), stops: DRIFT_3, duration: 18000},
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

  return (
    <Animated.View
      // Calque matériel dédié : la forme est rasterisée UNE fois puis seulement re-positionnée par le
      // GPU à chaque frame, au lieu d'être redessinée dans le calque commun (motif recommandé par RN
      // pour toute vue dont on n'anime que la transformation).
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={{
        position: 'absolute',
        top: blob.top,
        left: blob.left,
        width: blob.size,
        height: blob.size,
        transform: [{translateX}, {translateY}, {scale}],
      }}>
      <Image source={blob.image} style={{width: blob.size, height: blob.size}} resizeMode="stretch" fadeDuration={0} />
    </Animated.View>
  );
}

// Voile « verre dépoli » + grain réunis en UNE planche pré-composée (rendu identique — l'empilement
// alpha est associatif —, mais un mélange plein écran en moins à chaque frame). Le grain y est déjà
// tuilé : `Image resizeMode="repeat"` ne tuile qu'une fois sur cet appareil (bug de rendu Android), et
// le motif SVG qui contournait ce bug redessinait ~160 tuiles par frame. Le grain étant du bruit,
// l'étirement de la planche pour couvrir l'écran est imperceptible.
const frostGrainSheet = require('../../assets/images/frost-grain.png');

/**
 * Fond animé des écrans d'authentification — monté UNE SEULE FOIS derrière tout le parcours (voir
 * RootNavigator), pas par écran. C'était l'origine du « ça cale » au clic : chaque écran ayant le sien,
 * chaque navigation démontait 6 textures et relançait 6 boucles d'animation. Partagé, il survit aux
 * navigations : passer de Connexion à Inscription ne lui coûte plus rien, et le fond reste immobile
 * pendant que le contenu glisse.
 *
 * Animé en permanence (y compris tiroir ouvert, où il reste visible dans la bande du haut) : les formes
 * étant des textures déplacées par le pilote natif, la boucle ne touche pas le thread JS.
 */
export function AuthMeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, {backgroundColor: MESH_BASE}]} />
      {MESH_BLOBS.map((b, i) => (
        <MeshBlobView key={i} blob={b} index={i} />
      ))}
      {/* Verre dépoli léger (+ grain) — le flou « naturel » vient des formes floutées elles-mêmes
          ci-dessus ; ce voile ne fait qu'unifier/adoucir, sans éteindre l'animation visible dessous. */}
      <Image source={frostGrainSheet} style={[StyleSheet.absoluteFill, {width: undefined, height: undefined}]} resizeMode="cover" fadeDuration={0} />
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
        {SLIDES.map((s, k) => (
          <Animated.View
            key={k}
            style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', opacity: opacities[k]}]}>
            <Image source={s.image} style={{width: '100%', height: '100%'}} resizeMode="contain" fadeDuration={0} />
          </Animated.View>
        ))}
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
  hasCarousel = true,
}: {
  children: React.ReactNode;
  triggerLabel?: string;
  /** Le tiroir est déjà ouvert au montage, pas de bouton à retaper — soit parce que l'écran n'a jamais
   * de carrousel (Inscription, Mot de passe oublié), soit parce qu'on y arrive par le raccourci « Se
   * connecter » depuis l'un de ces écrans (Connexion, avec `hasCarousel` resté à `true`). */
  startOpen?: boolean;
  /** `false` pour les écrans qui n'ont jamais de carrousel (Inscription, Mot de passe oublié) : ne le
   * monte pas du tout (évite le coût de montage de 5 gros SVG inutiles), et le bandeau du haut n'est pas
   * cliquable pour « refermer » puisqu'il n'y a rien à révéler derrière. `true` (par défaut, écran
   * Connexion) : même si `startOpen` est vrai (arrivée par raccourci), taper en dehors du tiroir révèle
   * le carrousel normalement. */
  hasCarousel?: boolean;
}) {
  const {height: screenH} = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    // Fond transparent : le mesh gradient animé est posé une seule fois derrière tout le parcours
    // d'authentification (AuthMeshBackground dans RootNavigator), il transparaît donc ici.
    <View style={{flex: 1}}>
      {/* Ne monte le carrousel (5 grandes illustrations) que sur un écran qui en a un — pas la peine sur
          Inscription/Mot de passe oublié, il n'y serait de toute façon jamais visible. */}
      {hasCarousel && (
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: carouselContentOpacity}]}
          pointerEvents={open ? 'none' : 'auto'}>
          <CarouselContent onLogin={openDrawer} label={triggerLabel} />
        </Animated.View>
      )}

      {/* Bandeau de marque — fixe, TOUJOURS visible (carrousel ET tiroir ouvert). Tap dessus quand le
          tiroir est ouvert (= en dehors du tiroir) le referme et révèle le carrousel — y compris si le
          tiroir a démarré ouvert (raccourci « Se connecter » depuis Inscription/Mot de passe oublié) ;
          inerte s'il n'y a pas de carrousel à révéler (Inscription, Mot de passe oublié eux-mêmes). */}
      <View pointerEvents="box-none" style={[styles.brandBand, {height: CEILING_TOP}]}>
        {open && hasCarousel && <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />}
        <View pointerEvents="none" style={[styles.brandBandContent, {paddingTop: insets.top + 10}]}>
          <LogoMark size={30} light />
          <Text style={styles.brandText}>ulamu</Text>
        </View>
      </View>

      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.drawer, shadow.cardUp, {top: CEILING_TOP, bottom: 0, transform: [{translateY}]}]}>
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
