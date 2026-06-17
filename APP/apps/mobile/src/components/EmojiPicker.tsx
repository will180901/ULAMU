/**
 * Sélecteur d'emoji maison — grille catégorisée, emoji Unicode simples (Android/Noto Color Emoji les
 * rend déjà nativement en couleur ; pas de sprite façon SARIS, l'app est Android uniquement aujourd'hui,
 * donc aucune incohérence cross-plateforme à corriger — décision prise avec l'utilisateur). Sans
 * stickers (décision explicite). Réutilisé par le composeur (insertion dans le texte) et par la
 * barre de réactions rapides (bouton « + » → réaction avec un emoji hors de la sélection rapide).
 */
import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {fonts, Palette, radius} from '../theme';
import {useThemedStyles} from '../state/ThemeContext';

const CATEGORIES: [string, string][] = [
  ['😀', 'Smileys'],
  ['👋', 'Gestes'],
  ['❤️', 'Cœurs'],
  ['🧑', 'Personnes'],
  ['💊', 'Santé'],
  ['🌸', 'Nature'],
  ['💡', 'Objets'],
];

const EMOJI_BY_CATEGORY: string[][] = [
  ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤗', '🤔', '🤭', '🤫', '🤥', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤐', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🥳', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀'],
  ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  ['👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '💇', '💆'],
  ['💊', '🩹', '🩺', '🌡️', '🦷', '👁️', '🫀', '🫁', '🧠', '🦴', '💉', '🩸', '🧬', '🦠'],
  ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌍', '🌞', '🌙', '⭐️', '🌟', '✨', '⚡️', '🔥', '💧', '🌈', '☀️', '⛅️', '☁️', '🌧️', '❄️'],
  ['⌚️', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '🎥', '📺', '🔋', '💡', '🔦', '🕯️', '📖', '📚', '✏️', '📝', '📌', '📎', '🔒', '🔑', '🎁', '🎉', '🎊', '🎈', '🎂', '🍰', '🕐', '✅', '❌', '❓', '❗️', '💯', '🔔', '🔕'],
];

export function EmojiPicker({visible, onClose, onSelect}: {visible: boolean; onClose: () => void; onSelect: (emoji: string) => void}) {
  const styles = useThemedStyles(makeStyles);
  const [cat, setCat] = useState(0);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {CATEGORIES.map(([icon, label], i) => (
              <Pressable key={label} onPress={() => setCat(i)} style={[styles.tab, cat === i && styles.tabOn]} accessibilityLabel={label}>
                <Text style={styles.tabIcon}>{icon}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent} keyboardShouldPersistTaps="handled">
            <View style={styles.gridRow}>
              {EMOJI_BY_CATEGORY[cat].map(e => (
                <Pressable
                  key={e}
                  onPress={() => {
                    onSelect(e);
                    onClose();
                  }}
                  style={styles.cell}
                  hitSlop={2}>
                  <Text style={styles.cellText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {backgroundColor: colors.bgElevated, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, height: 360},
    handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 6},
    tabsRow: {gap: 6, paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    tab: {width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
    tabOn: {backgroundColor: colors.accent50},
    tabIcon: {fontSize: 20},
    grid: {flex: 1},
    gridContent: {padding: 10},
    gridRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
    cell: {width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm},
    cellText: {fontSize: 24, fontFamily: fonts.body},
  });
