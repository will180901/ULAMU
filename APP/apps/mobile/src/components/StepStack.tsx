/**
 * Parcours en plusieurs étapes présenté en PILE, avec récapitulatif vivant.
 *
 * Une seule étape est ouverte ; celles qui sont franchies se replient en une ligne portant leur nom et
 * un résumé de ce qui a été saisi, et se rouvrent d'un appui. Les suivantes restent visibles, grisées,
 * pour qu'on sache d'emblée ce qui attend.
 *
 * Trois raisons de faire ça plutôt qu'un simple « Étape 2 sur 3 » :
 *  1. Sur une app de santé, voir en permanence ce qu'on a déjà donné est rassurant — on ne remplit pas
 *     un formulaire à l'aveugle.
 *  2. La ligne de résumé EST le retour en arrière. Elle remplace la flèche, et supprime du même coup
 *     l'ambiguïté entre « reculer d'une étape » et « quitter l'écran » sur laquelle on butait.
 *  3. L'écran ne montre jamais qu'un formulaire à la fois : moins de défilement, donc moins de risque
 *     de perdre l'utilisateur en cours de route.
 *
 * Les étapes sont NOMMÉES et non numérotées : on retient « Vos accès », pas « 2/3 ».
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';
import {Icon} from './Icon';

export interface StepDef<K extends string> {
  key: K;
  /** Nom lisible de l'étape — ce que l'utilisateur a à faire, pas son rang. */
  label: string;
  /** Ce qui a été saisi, affiché une fois l'étape franchie. Absent = pas encore renseigné. */
  summary?: string;
}

export function StepStack<K extends string>({
  steps,
  current,
  onGoTo,
  children,
}: {
  steps: StepDef<K>[];
  current: K;
  /** Rappelé quand on tape une étape DÉJÀ franchie. Les étapes à venir ne sont jamais cliquables :
   * on ne peut pas sauter une vérification qu'on n'a pas encore faite. */
  onGoTo: (key: K) => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();
  const currentIndex = steps.findIndex(s => s.key === current);

  return (
    <View style={styles.stack}>
      {steps.map((s, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;

        if (isCurrent) {
          return (
            <View key={s.key} style={styles.currentBlock}>
              <Text style={styles.currentLabel}>{s.label}</Text>
              <View style={styles.currentBody}>{children}</View>
            </View>
          );
        }

        return (
          <Pressable
            key={s.key}
            onPress={isDone ? () => onGoTo(s.key) : undefined}
            disabled={!isDone}
            accessibilityRole={isDone ? 'button' : undefined}
            accessibilityLabel={isDone ? `Modifier : ${s.label}` : `${s.label}, étape à venir`}
            style={[styles.row, isDone ? styles.rowDone : styles.rowUpcoming]}>
            <View style={[styles.bullet, isDone ? styles.bulletDone : styles.bulletUpcoming]}>
              {isDone ? <Icon name="check" size={12} color="#fff" /> : <Text style={styles.bulletNum}>{i + 1}</Text>}
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, !isDone && styles.rowLabelUpcoming]}>{s.label}</Text>
              {isDone && s.summary ? (
                <Text style={styles.rowSummary} numberOfLines={1}>
                  {s.summary}
                </Text>
              ) : null}
            </View>
            {/* Le chevron n'apparaît que sur ce qui est réellement cliquable — sinon il promet une
                action là où il n'y en a pas. */}
            {isDone ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    stack: {gap: 10},

    row: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.card, borderWidth: 1},
    rowDone: {backgroundColor: colors.surface, borderColor: colors.borderSubtle},
    // Étape à venir : ni fond ni relief, juste une bordure discrète — présente sans attirer l'œil.
    rowUpcoming: {backgroundColor: 'transparent', borderColor: colors.borderSubtle, opacity: 0.65},

    bullet: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
    bulletDone: {backgroundColor: colors.successDot},
    bulletUpcoming: {backgroundColor: colors.bgMuted},
    bulletNum: {fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.textTertiary},

    rowText: {flex: 1},
    rowLabel: {fontFamily: fonts.displaySemibold, fontSize: 14, color: colors.textPrimary},
    rowLabelUpcoming: {color: colors.textTertiary},
    rowSummary: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2},

    currentBlock: {gap: 14},
    currentLabel: {fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary},
    currentBody: {gap: 16},
  });
