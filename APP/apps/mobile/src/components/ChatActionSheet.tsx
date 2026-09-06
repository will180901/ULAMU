/**
 * Feuille d'actions sur un message (appui long) — adaptation RN de SARIS chat.jsx « ActionSheet ».
 * Réagir (bande rapide + sélecteur complet) / Répondre / Modifier (texte propre ≤ 15 min) /
 * Supprimer (sous-étape : pour moi / pour tout le monde).
 * Pas de « Copier » (nécessiterait une lib presse-papier native non installée).
 */
import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {EmojiPicker} from './EmojiPicker';
import {Icon, IconName} from './Icon';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/** Réactions rapides par défaut (façon WhatsApp) — le « + » ouvre le sélecteur complet (EmojiPicker). */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ChatActionSheet({
  visible,
  canEdit,
  canDeleteForEveryone,
  canReport,
  onReact,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onReport,
  onClose,
}: {
  visible: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  /**
   * Signaler — uniquement sur les messages de L'AUTRE (chantier 59, 06/09/2026).
   *
   * Se signaler soi-même n'a aucun sens, et l'offrir ferait douter de ce que le geste veut dire.
   * « Supprimer pour moi » reste au-dessus : il répond au même besoin — ne plus voir ce message —
   * sans engager personne.
   */
  canReport: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onReport: () => void;
  onClose: () => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [step, setStep] = useState<'main' | 'delete'>('main');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('main');
      setPickerOpen(false);
    }
  }, [visible]);

  const Row = ({icon, label, danger, onPress}: {icon: IconName; label: string; danger?: boolean; onPress: () => void}) => (
    <Pressable onPress={onPress} style={styles.row}>
      <Icon name={icon} size={17} color={danger ? colors.errorDot : colors.textSecondary} />
      <Text style={[styles.rowText, danger && {color: colors.error}]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          {step === 'main' ? (
            <>
              <View style={styles.quickRow}>
                {QUICK_REACTIONS.map(e => (
                  <Pressable key={e} onPress={() => onReact(e)} style={styles.quickEmoji} hitSlop={4}>
                    <Text style={styles.quickEmojiText}>{e}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setPickerOpen(true)} style={styles.quickMore} accessibilityLabel="Plus d'emojis">
                  <Icon name="plus" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.sep} />
              <Row icon="message" label="Répondre" onPress={onReply} />
              {canEdit && <Row icon="user" label="Modifier" onPress={onEdit} />}
              <View style={styles.sep} />
              <Row icon="trash" label="Supprimer" danger onPress={() => setStep('delete')} />
              {canReport && <Row icon="flag" label="Signaler ce message" danger onPress={onReport} />}
            </>
          ) : (
            <>
              <Text style={styles.confirm}>Supprimer ce message ?</Text>
              <Row icon="eye-off" label="Supprimer pour moi" onPress={onDeleteForMe} />
              {canDeleteForEveryone && <Row icon="trash" label="Supprimer pour tout le monde" danger onPress={onDeleteForEveryone} />}
              <Row icon="x" label="Annuler" onPress={onClose} />
            </>
          )}
        </Pressable>
      </Pressable>
      <EmojiPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={e => {
          setPickerOpen(false);
          onReact(e);
        }}
      />
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {backgroundColor: colors.bgElevated, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 8, paddingBottom: 24},
    handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginVertical: 8},
    quickRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6},
    quickEmoji: {width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19},
    quickEmojiText: {fontSize: 24},
    quickMore: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 16, borderRadius: radius.md},
    rowText: {fontFamily: fonts.body, fontSize: 14.5, fontWeight: '500', color: colors.textPrimary},
    sep: {height: 1, backgroundColor: colors.borderSubtle, marginVertical: 4, marginHorizontal: 12},
    confirm: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, paddingHorizontal: 16, paddingVertical: 8},
  });
