/**
 * Lecteur média plein écran au clic (adaptation RN de SARIS §9.9 « MediaViewer »). Média en
 * `contain` à la taille de l'écran, fond sombre, tap pour fermer. Supporte les médias de session
 * authentifiés via `headers` (Authorization Bearer).
 *
 * ── ⚠️ Depuis le chantier 106 : les vidéos ────────────────────────────────────────────────────
 *
 * Le serveur accepte la vidéo depuis le chantier 99 et le patient peut en envoyer depuis celui-ci.
 * Reçue, elle tombait dans un `<Image>` — *c'est-à-dire nulle part.* Elle a maintenant son lecteur.
 *
 * ⚠️ Et le tap-pour-fermer ne couvre plus la vidéo : *on ne peut pas demander à quelqu'un de toucher
 * l'écran pour fermer et de toucher le même écran pour mettre en pause.* La zone de fermeture est
 * autour ; la vidéo garde ses propres commandes.
 */
import React from 'react';
import {Dimensions, Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Video from 'react-native-video';
import {fonts} from '../theme';

export function MediaViewer({
  visible,
  uri,
  headers,
  video = false,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  headers?: Record<string, string>;
  /** La pièce est une vidéo : elle a son lecteur, et garde ses propres commandes. */
  video?: boolean;
  onClose: () => void;
}) {
  const {width, height} = Dimensions.get('window');

  if (video) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          {uri ? (
            <Video
              source={{uri, headers}}
              style={{width, height: height * 0.7}}
              resizeMode="contain"
              controls
              paused={false}
            />
          ) : null}
          <Pressable onPress={onClose} style={styles.fermer} hitSlop={8}>
            <Text style={styles.hint}>Fermer</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

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
  fermer: {marginTop: 18, paddingHorizontal: 20, paddingVertical: 10},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center'},
  hint: {position: 'absolute', bottom: 36, fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.6)'},
});
