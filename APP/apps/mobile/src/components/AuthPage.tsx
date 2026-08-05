/**
 * Coquille des écrans de FORMULAIRE d'authentification (connexion, inscription, mot de passe oublié,
 * code, succès) — remplace `AuthCarouselDrawer` pour tout ce qui n'est pas le carrousel.
 *
 * Pourquoi une page et plus un tiroir : le panneau glissant obligeait à arbitrer en permanence entre
 * trois gestes de fermeture, le défilement du formulaire, et la protection d'une saisie en cours. Cette
 * complexité était portée par le composant le plus critique du parcours, sans rien apporter à
 * l'utilisateur. Une page classique rend au bouton retour d'Android son sens évident, supprime tout
 * conflit avec le défilement, et laisse au formulaire toute la hauteur de l'écran — ce dont
 * l'inscription en trois étapes avait justement besoin.
 *
 * Deux couches seulement :
 *  1. Un BANDEAU haut resté transparent : le mesh gradient animé, posé une seule fois derrière toute
 *     la pile d'authentification (`AuthMeshBackground` dans RootNavigator), y transparaît. C'est ce qui
 *     assure la continuité visuelle avec le carrousel.
 *  2. Une SURFACE pleine, à grand arrondi, qui porte le contenu. Opaque volontairement : un texte long
 *     posé sur un fond qui bouge fatigue et fait chuter le contraste (ratios WCAG, CG-11).
 */
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useRef} from 'react';
import {BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';
import {IconButton, LogoMark} from './ui';

const isAndroid = Platform.OS === 'android';

export function AuthPage({
  title,
  subtitle,
  onBack,
  steps,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Flèche de retour en haut à gauche. Doit faire EXACTEMENT ce que fait le bouton retour matériel —
   * les écrans branchent le même gestionnaire sur les deux, sinon l'un des deux surprend. */
  onBack?: () => void;
  /** Progression d'un parcours en plusieurs étapes. `current` commence à 1. */
  steps?: {current: number; total: number};
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();

  /**
   * Le bouton retour MATÉRIEL exécute exactement `onBack` — le même gestionnaire que la flèche.
   *
   * C'est le seul moyen de tenir la promesse : sinon Android applique son comportement par défaut
   * (dépiler l'écran), qui court-circuite tout ce que l'écran voulait faire — reculer d'une étape
   * plutôt que sortir, ou demander confirmation avant d'abandonner une saisie. On se retrouvait avec
   * deux boutons « retour » aux effets différents sur le même écran.
   *
   * Sans `onBack`, on ne s'abonne pas : l'écran laisse alors le comportement système s'appliquer.
   */
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const hasBack = !!onBack;

  useFocusEffect(
    // Volontairement dépendant du seul booléen, et non de `onBack` : les écrans passent une fonction
    // recréée à chaque rendu, on se réabonnerait donc en boucle pour rien.
    useCallback(() => {
      if (!hasBack) {
        return;
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBackRef.current?.();
        return true;
      });
      return () => sub.remove();
    }, [hasBack]),
  );

  return (
    <View style={styles.root}>
      {/* Bandeau — laisse voir le fond animé partagé. La flèche et la marque y flottent. */}
      <View style={[styles.band, {paddingTop: insets.top + 10}]}>
        <View style={styles.brand}>
          <LogoMark size={26} light />
          <Text style={styles.brandText}>ulamu</Text>
        </View>
      </View>

      {/* Surface : tout le reste de l'écran. */}
      <View style={[styles.sheet, shadow.cardUp]}>
        <KeyboardAvoidingView style={styles.flex} behavior={isAndroid ? undefined : 'padding'}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.body, {paddingBottom: Math.max(insets.bottom, 16) + 24}]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Flèche placée DANS la surface claire, et non sur le bandeau : le contraste y est
                garanti quelle que soit la forme du dégradé animé qui passe derrière. */}
            {onBack ? (
              <View style={styles.backRow}>
                <IconButton icon="arrow-left" onPress={onBack} variant="tile" size={18} accessibilityLabel="Retour" />
              </View>
            ) : null}

            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {steps ? (
              <View style={styles.stepsRow} accessibilityLabel={`Étape ${steps.current} sur ${steps.total}`}>
                {Array.from({length: steps.total}, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepSeg,
                      i < steps.current ? {backgroundColor: colors.accent500} : {backgroundColor: colors.bgMuted},
                    ]}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.content}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1},

    band: {paddingBottom: 14},
    brand: {alignItems: 'center', gap: 3},
    backRow: {flexDirection: 'row', marginBottom: 14},
    brandText: {fontFamily: fonts.display, fontSize: 15, color: '#fff', letterSpacing: -0.2},

    sheet: {
      flex: 1,
      backgroundColor: colors.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },
    body: {paddingHorizontal: 22, paddingTop: 26},

    title: {fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6, color: colors.textPrimary},
    subtitle: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginTop: 6},

    stepsRow: {flexDirection: 'row', gap: 6, marginTop: 18},
    stepSeg: {flex: 1, height: 4, borderRadius: radius.sm},

    content: {marginTop: 22, gap: 16},
  });
