/**
 * L'écran de découpe d'une vidéo — chantier 107, 12/09/2026.
 *
 * ── ⚠️ Pourquoi cet écran existe alors qu'une bibliothèque en fournit un ──────────────────────
 *
 * Parce que le sien fait quitter l'application. Essayé en séance réelle le 12/09 : l'application
 * sortait à l'instant exact où son écran s'affichait, dans l'émission de son évènement `onShow`
 * (voir l'en-tête de `services/rogneur.ts` pour la trace). On garde d'elle ce qui répond au lieu de
 * crier — extraire une image, découper un passage — et l'écran est le nôtre.
 *
 * ── Ce qu'il montre, et pourquoi dans cet ordre ───────────────────────────────────────────────
 *
 *   • la vidéo en haut, qui joue **le passage choisi et lui seul** — *on ne choisit pas un extrait
 *     qu'on n'a pas vu* ;
 *   • la pellicule, qui se remplit image par image ;
 *   • la fenêtre de sélection, qu'on déplace d'un doigt, et dont les deux poignées se tirent ;
 *   • en bas, en toutes lettres : le passage, sa durée, et son poids ESTIMÉ.
 *
 * ⚠️ **La fenêtre est bornée par DEUX choses**, et la seconde est celle qu'on oublie : les 30
 * secondes du plafond, et ce que la limite de 8 Mo autorise au débit du fichier. *Une vidéo 4K de
 * dix secondes peut peser 40 Mo : sa portion tient en deux secondes, pas en trente.* Plutôt que de
 * laisser choisir un passage qui sera refusé, la fenêtre refuse de s'étirer au-delà — *un refus qui
 * arrive après l'effort est une punition ; une borne qu'on sent en tirant est une information.*
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, {VideoRef} from 'react-native-video';

import {Icon} from './Icon';
import {formatOctets, poidsEstime, portionMaximale} from '../lib/media-regles';
import {dureeVideoMs, pellicule} from '../services/rogneur';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/** Douze images : assez pour reconnaître un plan, assez peu pour que la pellicule se remplisse vite. */
const IMAGES = 12;
/** La poignée doit rester saisissable au pouce sans masquer la pellicule. */
const POIGNEE = 18;

const mmss = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function RogneurVideo({
  visible,
  uri,
  tailleOctets,
  dureeConnueSec,
  onAnnuler,
  onValider,
}: {
  visible: boolean;
  uri: string | null;
  /** Le poids du fichier source — il borne la portion autant que la durée. */
  tailleOctets: number;
  /** Ce que la galerie annonce ; la brique mesurera mieux. */
  dureeConnueSec: number;
  onAnnuler: () => void;
  onValider: (debutMs: number, finMs: number) => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const lecteur = useRef<VideoRef>(null);

  const [dureeMs, setDureeMs] = useState(0);
  const [images, setImages] = useState<(string | null)[]>([]);
  const [debut, setDebut] = useState(0);
  const [fin, setFin] = useState(0);
  const [joue, setJoue] = useState(false);

  /* La bande occupe la largeur de l'écran moins les marges — mesurée, pas devinée. */
  const [largeur, setLargeur] = useState(Math.max(1, Dimensions.get('window').width - 32));

  const maxPortionMs = useMemo(
    () => portionMaximale(tailleOctets, dureeMs > 0 ? dureeMs / 1000 : dureeConnueSec) * 1000,
    [tailleOctets, dureeMs, dureeConnueSec],
  );

  /*
    ⚠️ La durée vient de la BRIQUE, pas de la galerie : elle lit le fichier. La galerie, elle,
    annonce parfois une durée absente ou fausse — et une pellicule calée sur une durée fausse
    montre douze fois la même image.
  */
  useEffect(() => {
    if (!visible || !uri) {
      return;
    }
    let mort = false;
    setImages(new Array(IMAGES).fill(null));
    setJoue(false);
    (async () => {
      const mesuree = await dureeVideoMs(uri);
      const d = mesuree > 0 ? mesuree : Math.max(1000, dureeConnueSec * 1000);
      if (mort) {
        return;
      }
      setDureeMs(d);
      const portion = portionMaximale(tailleOctets, d / 1000) * 1000;
      setDebut(0);
      setFin(Math.min(portion, d));
      await pellicule(
        uri,
        d,
        IMAGES,
        (i, fichier) => setImages(prec => prec.map((v, k) => (k === i ? fichier : v))),
        () => mort,
      );
    })();
    return () => {
      mort = true;
    };
  }, [visible, uri, dureeConnueSec, tailleOctets]);

  const msVersPx = useCallback((ms: number) => (dureeMs > 0 ? (ms / dureeMs) * largeur : 0), [dureeMs, largeur]);

  /*
    ⚠️ **Les poignées se créent UNE FOIS, et lisent l'état par référence.**

    Première version : trois `PanResponder` reconstruits à chaque rendu, pour qu'ils voient les
    valeurs à jour. Résultat mesuré sur le téléphone du porteur — **la fenêtre ne bougeait pas d'un
    pixel** : au premier mouvement, `setDebut` provoquait un rendu, les `panHandlers` changeaient
    d'identité, et React Native perdait le responder au milieu du geste.

    *Un objet reconstruit pendant qu'on s'en sert n'est plus le même objet.* Les valeurs vivent donc
    dans une référence que chaque rendu rafraîchit ; les poignées, elles, ne bougent jamais.
  */
  const etat = useRef({debut: 0, fin: 0, dureeMs: 0, largeur: 1, maxPortionMs: 30_000});
  etat.current = {debut, fin, dureeMs, largeur, maxPortionMs};

  /* Les valeurs au moment où le doigt s'est posé : un glissement se calcule depuis son origine. */
  const depart = useRef({debut: 0, fin: 0});

  const poignees = useMemo(() => {
    const pxVersMs = (px: number) =>
      etat.current.largeur > 0 ? (px / etat.current.largeur) * etat.current.dureeMs : 0;

    const creer = (bouger: (deltaMs: number) => void) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          depart.current = {debut: etat.current.debut, fin: etat.current.fin};
          setJoue(false);
        },
        onPanResponderMove: (_e, g) => bouger(pxVersMs(g.dx)),
      });

    return {
      /* La fenêtre entière glisse : sa durée ne change pas, seule sa place change. */
      fenetre: creer(delta => {
        const duree = depart.current.fin - depart.current.debut;
        const d = Math.min(Math.max(0, depart.current.debut + delta), Math.max(0, etat.current.dureeMs - duree));
        setDebut(d);
        setFin(d + duree);
      }),
      /* Une seconde au minimum, et jamais au-delà de ce que le poids autorise. */
      gauche: creer(delta => {
        const vise = depart.current.debut + delta;
        const min = Math.max(0, depart.current.fin - etat.current.maxPortionMs);
        setDebut(Math.min(Math.max(min, vise), depart.current.fin - 1000));
      }),
      droite: creer(delta => {
        const vise = depart.current.fin + delta;
        const max = Math.min(etat.current.dureeMs, depart.current.debut + etat.current.maxPortionMs);
        setFin(Math.max(Math.min(max, vise), depart.current.debut + 1000));
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portionSec = (fin - debut) / 1000;
  const poids = poidsEstime(tailleOctets, dureeMs > 0 ? dureeMs / 1000 : dureeConnueSec, portionSec);
  const prete = dureeMs > 0 && fin > debut;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onAnnuler}>
      <View style={styles.ecran}>
        <View style={styles.entete}>
          <Pressable onPress={onAnnuler} hitSlop={10} style={styles.iconeBtn}>
            <Icon name="x" size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.titre}>Choisir le passage</Text>
          <Pressable
            onPress={() => prete && onValider(debut, fin)}
            disabled={!prete}
            style={[styles.valider, !prete && styles.validerEteint]}>
            <Text style={styles.validerTexte}>Utiliser</Text>
          </Pressable>
        </View>

        <View style={styles.scene}>
          {uri ? (
            <Video
              ref={lecteur}
              source={{uri}}
              style={styles.video}
              resizeMode="contain"
              paused={!joue}
              onProgress={({currentTime}) => {
                /* Le lecteur ne sort pas de la fenêtre : on montre l'extrait, pas le film. */
                if (currentTime * 1000 >= fin) {
                  setJoue(false);
                  lecteur.current?.seek(debut / 1000);
                }
              }}
            />
          ) : null}
          {!joue ? (
            <Pressable
              style={styles.lecture}
              onPress={() => {
                lecteur.current?.seek(debut / 1000);
                setJoue(true);
              }}>
              <Icon name="play" size={26} color="#fff" />
            </Pressable>
          ) : null}
        </View>

        <View
          style={styles.bande}
          onLayout={e => setLargeur(Math.max(1, e.nativeEvent.layout.width))}>
          {images.map((f, i) => (
            <View key={i} style={styles.caseImage}>
              {f ? (
                <Image source={{uri: `file://${f}`}} style={styles.vignette} resizeMode="cover" />
              ) : (
                <View style={styles.vignetteVide} />
              )}
            </View>
          ))}

          {dureeMs > 0 ? (
            <>
              {/* Ce qui n'est pas gardé s'assombrit : la fenêtre se lit sans légende. */}
              <View style={[styles.voile, {left: 0, width: Math.max(0, msVersPx(debut))}]} pointerEvents="none" />
              <View
                style={[styles.voile, {left: msVersPx(fin), width: Math.max(0, largeur - msVersPx(fin))}]}
                pointerEvents="none"
              />
              <View
                style={[styles.fenetre, {left: msVersPx(debut), width: Math.max(POIGNEE * 2, msVersPx(fin - debut))}]}
                {...poignees.fenetre.panHandlers}
              />
              <View style={[styles.poignee, {left: msVersPx(debut)}]} {...poignees.gauche.panHandlers}>
                <View style={styles.barrePoignee} />
              </View>
              <View style={[styles.poignee, {left: Math.max(0, msVersPx(fin) - POIGNEE)}]} {...poignees.droite.panHandlers}>
                <View style={styles.barrePoignee} />
              </View>
            </>
          ) : (
            <View style={styles.chargement}>
              <ActivityIndicator color={colors.accent500} />
            </View>
          )}
        </View>

        <View style={styles.pied}>
          <Text style={styles.plage}>
            {mmss(debut)} → {mmss(fin)}
          </Text>
          <Text style={styles.detail}>
            {portionSec < 1 ? 'moins d’une seconde' : `${Math.round(portionSec)} s`} · ~{formatOctets(poids)} estimé
          </Text>
          {/*
            ⚠️ Dire la borne AVANT qu'elle se sente : une fenêtre qui refuse de s'étirer sans raison
            visible passe pour un écran bloqué.
          */}
          <Text style={styles.borne}>
            {maxPortionMs < 29_500
              ? `Cette vidéo est lourde : ${Math.floor(maxPortionMs / 1000)} s au maximum pour tenir dans la limite d’envoi.`
              : '30 secondes au maximum.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    ecran: {flex: 1, backgroundColor: c.bg},
    entete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    iconeBtn: {padding: 6},
    titre: {fontFamily: fonts.displaySemibold, fontSize: 15, color: c.textPrimary},
    valider: {backgroundColor: c.accent500, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill},
    validerEteint: {opacity: 0.4},
    validerTexte: {fontFamily: fonts.displaySemibold, fontSize: 13, color: '#fff'},
    scene: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'},
    video: {width: '100%', height: '100%'},
    lecture: {
      position: 'absolute',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bande: {
      height: 56,
      marginHorizontal: 16,
      marginTop: 14,
      flexDirection: 'row',
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: c.bgMuted,
    },
    caseImage: {flex: 1},
    vignette: {width: '100%', height: '100%'},
    vignetteVide: {width: '100%', height: '100%', backgroundColor: c.bgMuted},
    voile: {position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)'},
    fenetre: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderWidth: 2,
      borderColor: c.accent500,
      borderRadius: radius.sm,
    },
    poignee: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: POIGNEE,
      backgroundColor: c.accent500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    barrePoignee: {width: 2, height: 18, borderRadius: 1, backgroundColor: '#fff'},
    chargement: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
    pied: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22},
    plage: {fontFamily: fonts.mono, fontSize: 16, color: c.textPrimary},
    detail: {fontFamily: fonts.body, fontSize: 13, color: c.textSecondary, marginTop: 2},
    borne: {fontFamily: fonts.body, fontSize: 12, color: c.textTertiary, marginTop: 6},
  });
