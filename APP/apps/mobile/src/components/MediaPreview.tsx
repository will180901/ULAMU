/**
 * Aperçu de 1..N pièces AVANT envoi (adaptation RN de SARIS §9.9) : média en grand, pellicule des
 * pièces choisies, champ légende, bouton envoyer. Plein écran.
 *
 * ── ⚠️ Depuis le chantier 106 : les vidéos ────────────────────────────────────────────────────
 *
 * Une vidéo n'est pas une image : l'afficher dans un `<Image>` donnait un carré vide. Elle a
 * maintenant son lecteur, et **l'écran annonce la découpe** quand elle dépasse — *un traitement qui
 * s'ouvre sans prévenir ressemble à une panne, même quand il fait exactement ce qu'il faut.*
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import Video from 'react-native-video';
import {Icon} from './Icon';
import {fonts, Palette, radius} from '../theme';
import {LIMITE_OCTETS, VIDEO_MAX_S, formatOctets, genreDuMime} from '../lib/media-regles';
import {doitEtreRognee} from '../services/rogneur';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function MediaPreview({
  visible,
  pieces,
  busy,
  onCancel,
  onSend,
}: {
  visible: boolean;
  /** Les pièces choisies — chacune sait si elle est une vidéo et si elle devra être rognée. */
  pieces: {uri: string; mime: string; tailleOctets?: number; dureeSec?: number}[];
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

  const courante = pieces[Math.min(active, pieces.length - 1)] ?? null;
  const estVideo = courante ? genreDuMime(courante.mime) === 'video' : false;
  const aRogner = courante ? estVideo && doitEtreRognee(courante.tailleOctets ?? 0, courante.dureeSec ?? 0) : false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.iconBtn} hitSlop={6}>
            <Icon name="x" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.title}>{pieces.length > 1 ? `Aperçu · ${pieces.length} pièces` : 'Aperçu'}</Text>
        </View>
        <View style={styles.stage}>
          {courante ? (
            estVideo ? (
              <Video source={{uri: courante.uri}} style={styles.img} resizeMode="contain" controls paused />
            ) : (
              <Image source={{uri: courante.uri}} style={styles.img} resizeMode="contain" />
            )
          ) : null}
        </View>

        {/*
          ⚠️ **La découpe s'annonce.** Sans cette ligne, appuyer sur « envoyer » ouvrirait un écran
          de rognage venu de nulle part — *et un écran qu'on n'attendait pas ressemble à une panne,
          même quand il fait exactement ce qu'il faut.*
        */}
        {aRogner ? (
          <View style={styles.avis}>
            {/* Pas de ciseaux dans notre jeu d'icones : l'horloge dit aussi bien « c'est une affaire de duree ». */}
            <Icon name="clock" size={13} color={colors.accent} />
            <Text style={styles.avisText}>
              Cette vidéo dépasse {VIDEO_MAX_S} s ou {formatOctets(LIMITE_OCTETS)} — vous choisirez le
              passage à envoyer.
            </Text>
          </View>
        ) : null}

        {pieces.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {pieces.map((p, i) => (
              <Pressable key={p.uri} onPress={() => setActive(i)} style={[styles.thumbWrap, i === active && styles.thumbActive]}>
                {genreDuMime(p.mime) === 'video' ? (
                  <View style={styles.thumbVideo}>
                    <Icon name="play" size={16} color="#fff" />
                  </View>
                ) : (
                  <Image source={{uri: p.uri}} style={styles.thumb} resizeMode="cover" />
                )}
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
    thumbVideo: {width: '100%', height: '100%', backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center'},
    avis: {flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.accent50},
    avisText: {flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textSecondary},
    footer: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
    caption: {flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgMuted, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary},
    send: {width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
  });
