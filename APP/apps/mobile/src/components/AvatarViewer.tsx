/**
 * Visionneuse d'avatar plein écran — ouverte au tap sur une photo de profil. L'image est affichée
 * à la largeur de l'écran (résolution qui s'adapte à l'appareil via Dimensions), fond sombre,
 * tap pour fermer. Sans photo, affiche les grandes initiales. Bouton « Changer la photo » optionnel.
 */
import React from 'react';
import {ActivityIndicator, Dimensions, Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon} from './Icon';
import {fonts} from '../theme';

export function AvatarViewer({
  visible,
  uri,
  name,
  onClose,
  onChangePhoto,
  changing,
}: {
  visible: boolean;
  uri: string | null;
  name: string;
  onClose: () => void;
  onChangePhoto?: () => void;
  changing?: boolean;
}) {
  const {width} = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const side = Math.min(width - 48, 420);
  const initials = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Bouton de fermeture explicite (façon Facebook/WhatsApp) — en plus du tap sur le fond. */}
        <Pressable style={[styles.closeBtn, {top: insets.top + 10}]} onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
          <Icon name="x" size={20} color="#fff" />
        </Pressable>
        {uri ? (
          <Image source={{uri}} style={{width: side, height: side, borderRadius: 18}} resizeMode="contain" />
        ) : (
          <View style={[styles.initialsCircle, {width: side * 0.7, height: side * 0.7, borderRadius: (side * 0.7) / 2}]}>
            <Text style={[styles.initialsText, {fontSize: side * 0.26}]}>{initials || '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        {onChangePhoto ? (
          <Pressable style={styles.changeBtn} onPress={onChangePhoto} disabled={changing}>
            {changing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="image" size={16} color="#fff" />
                <Text style={styles.changeText}>Changer la photo</Text>
              </>
            )}
          </Pressable>
        ) : null}
        <Text style={styles.hint}>Touchez le fond pour fermer</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', gap: 16},
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsCircle: {backgroundColor: '#2756A6', alignItems: 'center', justifyContent: 'center'},
  initialsText: {fontFamily: fonts.display, color: '#fff'},
  name: {fontFamily: fonts.display, fontSize: 18, color: '#fff', letterSpacing: -0.3},
  changeBtn: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', minWidth: 170, justifyContent: 'center'},
  changeText: {fontFamily: fonts.displayBold, fontSize: 14, color: '#fff'},
  hint: {fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.6)'},
});
