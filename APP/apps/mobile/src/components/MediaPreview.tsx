/**
 * Aperçu de 1..N photos AVANT envoi (adaptation RN de SARIS §9.9 « MediaPreview ») : image en grand,
 * pellicule des photos choisies, champ légende, bouton envoyer. Plein écran (mobile).
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Icon} from './Icon';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function MediaPreview({
  visible,
  uris,
  busy,
  onCancel,
  onSend,
}: {
  visible: boolean;
  uris: string[];
  busy: boolean;
  onCancel: () => void;
  onSend: (caption: string) => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [caption, setCaption] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (visible) {
      setCaption('');
      setActive(0);
    }
  }, [visible]);

  const main = uris[Math.min(active, uris.length - 1)] ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.iconBtn} hitSlop={6}>
            <Icon name="x" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.title}>{uris.length > 1 ? `Aperçu · ${uris.length} photos` : 'Aperçu'}</Text>
        </View>
        <View style={styles.stage}>{main ? <Image source={{uri: main}} style={styles.img} resizeMode="contain" /> : null}</View>
        {uris.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {uris.map((u, i) => (
              <Pressable key={u} onPress={() => setActive(i)} style={[styles.thumbWrap, i === active && styles.thumbActive]}>
                <Image source={{uri: u}} style={styles.thumb} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.footer}>
          <TextInput
            style={styles.caption}
            value={caption}
            onChangeText={setCaption}
            placeholder="Ajouter une légende…"
            placeholderTextColor={colors.textDisabled}
            editable={!busy}
          />
          <Pressable onPress={() => onSend(caption.trim())} disabled={busy} style={[styles.send, busy && {opacity: 0.6}]}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    iconBtn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
    title: {fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    stage: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16},
    img: {width: '100%', height: '100%', borderRadius: radius.card},
    strip: {gap: 8, paddingHorizontal: 12, paddingBottom: 8, alignItems: 'center'},
    thumbWrap: {width: 56, height: 56, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden'},
    thumbActive: {borderColor: colors.accent},
    thumb: {width: '100%', height: '100%'},
    footer: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    caption: {flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgMuted, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary},
    send: {width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
  });
