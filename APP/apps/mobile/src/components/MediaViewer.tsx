/**
 * Lecteur média plein écran au clic (adaptation RN de SARIS §9.9 « MediaViewer »). Image en
 * `contain` à la taille de l'écran, fond sombre, tap pour fermer. Supporte les médias de session
 * authentifiés via `headers` (Authorization Bearer).
 */
import React from 'react';
import {Dimensions, Image, Modal, Pressable, StyleSheet, Text} from 'react-native';
import {fonts} from '../theme';

export function MediaViewer({
  visible,
  uri,
  headers,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  headers?: Record<string, string>;
  onClose: () => void;
}) {
  const {width, height} = Dimensions.get('window');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri ? <Image source={{uri, headers}} style={{width, height: height * 0.82}} resizeMode="contain" /> : null}
        <Text style={styles.hint}>Touchez pour fermer</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center'},
  hint: {position: 'absolute', bottom: 36, fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.6)'},
});
