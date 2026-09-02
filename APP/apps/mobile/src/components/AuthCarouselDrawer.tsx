/**
 * Coquille des écrans d'authentification — 3 couches :
 *
 * 1. `MeshGradientBackground` — fond plein écran : mesh gradient animé (plusieurs formes de couleurs
 *    différentes qui se fondent, dérive lente en boucle) + voile « verre dépoli » par-dessus (rend les
 *    illustrations claires et le texte lisibles sur un fond autrement trop chargé) + grain.
 * 2. Carrousel (illustration à 80% de la hauteur d'écran + texte + points) posé sur ce fond, défilement
 *    lent et doux (transitions longues, easing in/out), navigable au doigt (balayage horizontal, ou appui
 *    sur un point pour y sauter) ; bouton « Rejoindre » qui déclenche l'ouverture.
 * 3. Bandeau de marque fixe (logo ULAMU empilé au-dessus du mot « ulamu ») + TIROIR (le formulaire, en
 *    `children`) : au tap sur le bouton, le tiroir glisse (par animation, plus au doigt) du bas jusqu'au
 *    plafond fixe ; le bandeau de marque, juste au-dessus, se révèle en fondu pendant la même montée —
 *    on a l'impression que le tiroir vient se glisser SOUS ce bandeau, par-dessus le carrousel.
 */
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, BackHandler, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {shadow} from '../theme';
import {IconButton, LogoMark, PrimaryButton} from './ui';

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
/*
  ── Deux promesses retirées le 02/09/2026 (chantier 27) ────────────────────────────────────────

  Le carrousel annonçait « Réservez vos médicaments tout près » et « Retirez-les en pharmacie en
  toute confiance ». La chaîne du médicament est sortie du produit le même jour (D-052) : aucune
  pharmacie n'est reliée à ULAMU, rien ne se réserve, rien ne se retire.

  Ces deux phrases étaient les plus dangereuses de l'application. Non par leur contenu, mais par
  leur PLACE : c'est le premier écran, celui qui décide si quelqu'un crée un compte. Promettre là ce
  qu'on ne fait pas, ce n'est pas une coquille — c'est ce sur quoi la personne s'est engagée.

  Elles ne sont pas REMPLACÉES, seulement retirées. Écrire de nouvelles promesses est un arbitrage
  du porteur, pas une correction : les trois qui restent sont vraies, et trois vraies valent mieux
  que cinq dont deux mentent. Le carrousel est entièrement dérivé de `SLIDES.length` — animation,
  points, minuteur : rien d'autre à changer.

  ⚠️ Les deux illustrations (`slide-medicine`, `slide-pharmacist`) restent dans les ressources : le
  jour où la chaîne du médicament revient, elles reviennent avec.
*/
const SLIDES = [
  {image: require('../../assets/images/slide-online-doctor.png'), t: 'Trouvez un soignant vérifié'},
  {image: require('../../assets/images/slide-prescription.png'), t: 'Recevez votre ordonnance signée'},
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

// Navigation au doigt. Deux seuils distincts : ACTIVATE = déplacement à partir duquel on considère que
// le doigt balaie (en dessous, c'est un appui — le bouton et le tiroir gardent leurs propres touches) ;
// COMMIT = déplacement atteint au relâcher pour changer réellement de diapositive (sinon on revient).
const SWIPE_ACTIVATE_DX = 14;
const SWIPE_COMMIT_DX = 45;

/** Distance de glissement vers le bas au-delà de laquelle le tiroir se ferme au relâcher. */
const DRAG_CLOSE_DY = 90;

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
export function CarouselContent({onLogin, label}: {onLogin: () => void; label: string}) {
  const {height: screenH} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  // Une opacité PAR diapositive — toutes les illustrations restent montées en permanence (voir plus haut) ;
  // seule celle-ci change réellement, les autres restent à 0 sans jamais être démontées/remontées.
  const opacities = useRef(SLIDES.map((_, k) => new Animated.Value(k === 0 ? 1 : 0))).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  /** Va à une diapositive donnée (index cyclique : après la dernière on revient à la première). */
  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  // Le PanResponder n'est construit QU'UNE fois (le recréer à chaque rendu ferait perdre le geste en
  // cours) : il lit donc l'index et `goTo` par référence, sinon la fermeture resterait figée sur la
  // première diapositive et tous les balayages ramèneraient toujours à la deuxième.
  const indexRef = useRef(0);
  indexRef.current = index;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const pan = useRef(
    PanResponder.create({
      // Ne prend la main que sur un geste franchement HORIZONTAL. Conséquence voulue : un simple appui
      // (aucun déplacement) n'active jamais le responder — le bouton dessous reste cliquable — et un
      // glissement vertical n'est pas capté non plus.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > SWIPE_ACTIVATE_DX && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -SWIPE_COMMIT_DX) {
          goToRef.current(indexRef.current + 1); // balayage vers la gauche → suivante
        } else if (g.dx >= SWIPE_COMMIT_DX) {
          goToRef.current(indexRef.current - 1); // balayage vers la droite → précédente
        }
      },
    }),
  ).current;

  // `index` étant une dépendance, changer de diapositive au doigt relance CETTE séquence : le nettoyage
  // annule les minuteries en cours, et la diapositive choisie repart donc sur un temps d'affichage
  // complet au lieu d'hériter du reliquat de la précédente.
  useEffect(() => {
    let cancelled = false;
    let textInTimeout: ReturnType<typeof setTimeout>;
    let holdTimeout: ReturnType<typeof setTimeout>;

    // Éteint toute AUTRE diapositive encore visible : lors d'un changement au doigt, la précédente n'est
    // pas passée par le fondu de sortie de la séquence automatique et resterait superposée à la nouvelle.
    SLIDES.forEach((_, k) => {
      if (k !== index) {
        Animated.timing(opacities[k], {toValue: 0, duration: FADE_OUT_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true}).start();
      }
    });

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
    <View style={styles.carouselContent} {...pan.panHandlers}>
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
      {/* Les points ne sont pas qu'un indicateur : on peut sauter directement à une diapositive.
          `hitSlop` élargit la cible tactile (6 px de haut à l'écran, intouchable autrement). */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, k) => (
          <Pressable
            key={k}
            onPress={() => goTo(k)}
            hitSlop={{top: 12, bottom: 12, left: 6, right: 6}}
            accessibilityRole="button"
            accessibilityLabel={`Aller à l'écran ${k + 1} sur ${SLIDES.length}`}>
            <View style={[styles.dot, k === index ? styles.dotOn : styles.dotOff]} />
          </Pressable>
        ))}
      </View>
      <PrimaryButton title={label} onPress={onLogin} style={[styles.loginBtn, {marginBottom: Math.max(insets.bottom, 12) + 8}]} />
    </View>
  );
}

export function AuthCarouselDrawer({
  children,
  triggerLabel = 'Rejoindre',
  startOpen = false,
  hasCarousel = true,
  onBack,
  onRequestClose,
  steps,
}: {
  children: React.ReactNode;
  triggerLabel?: string;
  /** Affiche une flèche de retour EN HAUT DU TIROIR. Jusqu'ici le recul n'existait que par le bouton
   * matériel Android : rien à l'écran ne disait qu'on pouvait revenir en arrière, et le geste est
   * invisible sur les téléphones en navigation gestuelle. Passer ici le MÊME gestionnaire que celui
   * du bouton matériel garantit que les deux reculent identiquement. */
  onBack?: () => void;
  /** Appelé quand le bouton retour MATÉRIEL est pressé sur un écran sans carrousel à révéler
   * (Inscription, Mot de passe oublié, code de connexion) : il n'y a rien à rouvrir sur place, on
   * quitte donc vers l'écran qui, lui, porte le carrousel. */
  onRequestClose?: () => void;
  /** Progression d'un parcours en plusieurs étapes (inscription, mot de passe oublié) : `current` est
   * l'index à partir de 1. Le sous-titre annonçait « Étape 2 sur 3 » en texte seul, sans rien de
   * visuel pour situer l'effort restant. */
  steps?: {current: number; total: number};
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

  /**
   * `velocity` est fourni quand la fermeture vient d'un GESTE : le tiroir poursuit alors la course du
   * doigt au lieu de repartir d'un mouvement neuf, ce qui est toute la différence entre « ça suit ma
   * main » et « ça rejoue une animation ». Absent (bouton, appui hors du tiroir), on garde la durée fixe.
   */
  function closeDrawer(velocity?: number) {
    if (velocity !== undefined) {
      Animated.spring(progress, {toValue: 0, velocity, tension: 90, friction: 14, useNativeDriver: true}).start(({finished}) => {
        if (finished) {
          setOpen(false);
        }
      });
      return;
    }
    Animated.timing(progress, {toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start(() => setOpen(false));
  }

  /** Remet le tiroir à sa place ouverte, en reprenant l'élan du doigt s'il y en a un. */
  function settleOpen(velocity = 0) {
    Animated.spring(progress, {toValue: 1, velocity, tension: 90, friction: 12, useNativeDriver: true}).start();
  }

  /**
   * FERMETURE DEMANDÉE — point de passage unique des trois gestes : bouton retour matériel, appui hors
   * du tiroir, glissement vers le bas. Les faire converger ici est ce qui garantit qu'ils se comportent
   * tous pareil ; sinon une confirmation d'abandon posée par l'écran ne protégerait qu'un geste sur trois.
   *
   * Quand il y a un carrousel derrière, on le redécouvre sur place. Sinon il n'y a rien à révéler :
   * c'est à l'écran de décider où aller (et de demander confirmation s'il a une saisie à protéger).
   */
  function requestClose(velocity?: number) {
    if (hasCarousel) {
      closeDrawer(velocity);
      return;
    }
    onRequestClose?.();
  }
  // Les gestionnaires de gestes sont construits une seule fois : ils lisent la fermeture par référence,
  // sinon ils resteraient figés sur la version du premier rendu.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const settleOpenRef = useRef(settleOpen);
  settleOpenRef.current = settleOpen;

  // Glissement vers le bas : le tiroir suit le doigt, puis part ou revient au relâcher. La position
  // est portée par `progress` seul (cf. dragHandlers) — aucune seconde valeur à resynchroniser.
  // Le PanResponder n'est construit qu'une fois : il lit par référence tout ce qui peut changer
  // (hauteur d'écran après rotation, position du défilement, fermeture à appeler).
  const closedOffsetRef = useRef(CLOSED_OFFSET);
  closedOffsetRef.current = CLOSED_OFFSET;
  const hasCarouselRef = useRef(hasCarousel);
  hasCarouselRef.current = hasCarousel;
  /** Le formulaire est-il en haut de sa liste ? Sert à n'autoriser le glissement de fermeture que là :
   * plus bas, le geste doit faire défiler le formulaire, pas emporter le tiroir. */
  const atTopRef = useRef(true);

  /**
   * Suivi du doigt + décision au relâcher — partagés par les deux zones de capture ci-dessous, pour
   * que glisser depuis la poignée ou depuis le corps du formulaire donne EXACTEMENT le même geste.
   *
   * UNE SEULE valeur porte la position (`progress`, 0 = fermé … 1 = ouvert), y compris pendant le
   * glissement. Une tentative précédente utilisait une seconde valeur pour le doigt, qu'il fallait
   * échanger avec `progress` en fin de course : l'échange ne se propageait pas jusqu'au moteur
   * d'animation natif, et le tiroir restait en bas AVEC le carrousel masqué — plus rien de cliquable
   * à l'écran. Avec une valeur unique, il n'y a plus ni échange ni animations concurrentes possibles.
   */
  const dragHandlers = useRef({
      onPanResponderMove: (_e: unknown, g: {dy: number}) => {
        if (g.dy > 0) {
          // On ne tire jamais le tiroir au-dessus de son plafond : `progress` est plafonné à 1.
          const p = 1 - g.dy / closedOffsetRef.current;
          progress.setValue(Math.max(0, Math.min(1, p)));
        }
      },
      onPanResponderRelease: (_e: unknown, g: {dy: number; vy: number}) => {
        // Un geste court mais VIF ferme aussi : exiger la distance seule rendrait le petit coup sec
        // (le geste naturel pour chasser une feuille) sans effet.
        const shouldClose = g.dy > DRAG_CLOSE_DY || g.vy > 0.8;

        // Vitesse du doigt (px/ms) convertie dans l'échelle de `progress` (0→1), et orientée : glisser
        // vers le bas fait DÉCROÎTRE progress, d'où le signe négatif.
        const velocity = -g.vy / closedOffsetRef.current;

        if (!shouldClose) {
          settleOpenRef.current(velocity); // pas assez loin : retour à sa place, élan compris
          return;
        }

        // Sur un écran SANS carrousel (Inscription, Mot de passe oublié), il n'y a rien derrière à
        // révéler : le tiroir EST l'écran. On le remet en place et c'est l'écran qui décide de la suite
        // (il a peut-être une saisie à protéger par une confirmation). Le faire descendre pour de bon
        // avant de connaître sa réponse laisserait un écran vide si l'utilisateur annule.
        if (!hasCarouselRef.current) {
          settleOpenRef.current(velocity);
        }

        // TOUTE fermeture passe par ici, y compris celle-ci : c'est ce qui garantit qu'une protection
        // posée par l'écran (confirmation d'abandon) vaut pour le glissement comme pour les deux autres
        // gestes. La vitesse est transmise pour que la descente prolonge le mouvement du doigt.
        requestCloseRef.current(velocity);
      },
      /**
       * Geste INTERROMPU sans relâcher : appel entrant, notification, passage en arrière-plan, ou un
       * autre composant qui réclame la main (le défilement du formulaire, notamment).
       *
       * Sans ce retour explicite, `onPanResponderRelease` n'est jamais appelé et le tiroir reste figé à
       * mi-course — ni ouvert ni fermé, et plus rien ne le remet en place. C'est la même impasse que
       * celle décrite plus haut, atteinte par un autre chemin. On ne peut pas deviner l'intention d'un
       * geste avorté : on rouvre, l'état de départ étant toujours le choix sûr.
       */
      onPanResponderTerminate: () => settleOpenRef.current(0),
  }).current;

  /** Poignée du haut : seuil bas (6 px), c'est le repère explicite du geste. */
  const dragPan = useRef(
    PanResponder.create({
      // Seulement vers le BAS et franchement vertical : un glissement horizontal ou vers le haut ne
      // doit pas être capté ici.
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && g.dy > Math.abs(g.dx) * 1.5,
      ...dragHandlers,
    }),
  ).current;

  /** Corps du formulaire : même geste, mais UNIQUEMENT quand la liste est déjà en haut — sinon on
   * volerait le défilement. Seuil plus élevé (14 px) pour ne pas confondre avec l'amorce d'un scroll.
   * C'est ce qui manquait pour que le tiroir se manipule comme une feuille d'app pro : jusqu'ici le
   * geste n'existait que sur une poignée de quelques pixels de haut. */
  const bodyPan = useRef(
    PanResponder.create({
      // CAPTURE, et non la phase normale : le `ScrollView` est un enfant, et dès qu'il est défilable il
      // s'empare du toucher — le parent n'est alors jamais interrogé. C'est ce qui faisait que le
      // glissement ne marchait que sur l'écran de connexion, seul formulaire assez court pour tenir
      // sans défilement. En capture, le parent est consulté AVANT l'enfant.
      //
      // Le filtre reste strict pour ne pas voler le défilement : uniquement quand la liste est déjà en
      // haut (rien à faire défiler vers le bas), et pour un mouvement franchement vertical d'au moins
      // 14 px. Un appui simple n'est pas concerné — seuls les mouvements sont examinés ici, la saisie
      // dans les champs n'est donc pas affectée.
      onMoveShouldSetPanResponderCapture: (_e, g) => atTopRef.current && g.dy > 14 && g.dy > Math.abs(g.dx) * 1.5,
      ...dragHandlers,
    }),
  ).current;

  // Le tiroir reprend l'état voulu par la route CHAQUE FOIS que l'écran revient au premier plan, et pas
  // seulement au montage. Sans ça, revenir sur Connexion depuis Inscription retrouvait le formulaire
  // resté ouvert — l'état initial l'emportait pour toujours — au lieu du carrousel attendu.
  useFocusEffect(
    useCallback(() => {
      if (startOpen) {
        openDrawer();
      } else {
        closeDrawer();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startOpen]),
  );

  // Bouton retour MATÉRIEL = sortir du formulaire (refermer le tiroir et retrouver le carrousel).
  // Le recul d'ÉTAPE, lui, appartient à la flèche visible du bandeau : deux gestes distincts pour deux
  // intentions distinctes, au lieu d'un seul bouton matériel qui faisait les deux.
  // Enregistré ici plutôt que dans chaque écran : un seul gestionnaire, donc aucun risque que deux
  // abonnés se disputent la priorité (le dernier inscrit gagne).
  // Lu par référence : sans ça, l'abonnement se défaisait et se refaisait à chaque rendu (les écrans
  // passent une fonction recréée à chaque fois), pour rien.
  const canCloseRef = useRef(false);
  canCloseRef.current = (hasCarousel && open) || (!hasCarousel && !!onRequestClose);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!canCloseRef.current) {
          return false; // rien à fermer ici : comportement système (quitter l'app)
        }
        requestCloseRef.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

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
        {/* Appui hors du tiroir = fermeture, sur TOUTES les pages. Auparavant réservé aux écrans
            portant un carrousel : ailleurs, taper à côté ne faisait rien, sans que rien ne l'explique. */}
        {open && <Pressable style={StyleSheet.absoluteFill} onPress={() => requestCloseRef.current()} accessibilityLabel="Fermer" />}
        <View pointerEvents="none" style={[styles.brandBandContent, {paddingTop: insets.top + 10}]}>
          <LogoMark size={30} light />
          <Text style={styles.brandText}>ulamu</Text>
        </View>
      </View>

      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.drawer, shadow.cardUp, {top: CEILING_TOP, bottom: 0, transform: [{translateY}]}]}>
        {/* Poignée de glissement. Le geste est capté ICI et non sur tout le tiroir : plus bas, il
            entrerait en conflit avec le défilement vertical du formulaire — descendre dans la liste
            aurait fermé le tiroir. C'est aussi le repère visuel qui annonce qu'on peut le faire. */}
        <View style={styles.grabArea} {...dragPan.panHandlers}>
          <View style={styles.grabBar} />
        </View>
        <KeyboardAvoidingView style={{flex: 1}} behavior={isAndroid ? undefined : 'padding'} {...bodyPan.panHandlers}>
          <ScrollView
            style={{flex: 1}}
            contentContainerStyle={styles.drawerBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // Position du défilement : le glissement de fermeture depuis le corps n'est autorisé qu'en
            // haut de liste (cf. bodyPan). `scrollEventThrottle` limite la cadence des remontées iOS ;
            // sur Android elles arrivent à chaque image quoi qu'il arrive.
            scrollEventThrottle={16}
            onScroll={e => {
              atTopRef.current = e.nativeEvent.contentOffset.y <= 0;
            }}>
            {(onBack || steps) && (
              <View style={styles.drawerTopBar}>
                {onBack ? (
                  <IconButton icon="arrow-left" onPress={onBack} variant="tile" size={18} accessibilityLabel="Revenir à l'étape précédente" />
                ) : (
                  <View style={styles.topBarSpacer} />
                )}
                {steps && (
                  // Segments pleins pour les étapes franchies, creux pour celles à venir : on voit d'un
                  // coup d'œil où l'on en est et combien il reste, ce qu'un texte seul ne donne pas.
                  <View
                    style={styles.stepsRow}
                    accessibilityRole="progressbar"
                    accessibilityLabel={`Étape ${steps.current} sur ${steps.total}`}>
                    {Array.from({length: steps.total}, (_, k) => (
                      <View key={k} style={[styles.stepSeg, k < steps.current ? styles.stepSegOn : styles.stepSegOff]} />
                    ))}
                  </View>
                )}
                <View style={styles.topBarSpacer} />
              </View>
            )}
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
  drawerBody: {flexGrow: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24},

  // Zone de préhension généreuse (la barre visible ne fait que 4 px de haut : impossible à attraper
  // sans marge autour), barre discrète pour ne pas concurrencer le contenu.
  grabArea: {alignItems: 'center', paddingTop: 10, paddingBottom: 8},
  grabBar: {width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,18,0.16)'},

  // Bandeau du tiroir : retour à gauche, progression centrée. Les deux cales latérales de largeur
  // égale gardent les segments réellement centrés, que la flèche soit présente ou non.
  drawerTopBar: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  topBarSpacer: {width: 34},
  stepsRow: {flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center'},
  stepSeg: {height: 4, width: 26, borderRadius: 2},
  stepSegOn: {backgroundColor: '#2756A6'},
  stepSegOff: {backgroundColor: 'rgba(39,86,166,0.18)'},
});
