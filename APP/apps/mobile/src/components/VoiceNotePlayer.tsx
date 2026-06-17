/**
 * Lecteur de note vocale sur bulle (adaptation RN de SARIS §9.7 « Lecteur sur bulle »).
 * Onde de 36 barres (approximée, déterministe par clé — RN n'a pas la Web Audio API pour décoder
 * les pics réels), bouton lecture/pause, position + seek au tap sur l'onde, tête de lecture, durée,
 * et VITESSE variable 1× / 1,5× / 2× (via react-native-video, qui expose `rate`).
 * Palette adaptée à ULAMU : bulle « mienne » (cobalt) → onde blanche ; bulle reçue → accent cobalt.
 * La lecture passe par <Video> (audio seul, vue masquée) ; l'enregistrement reste sur audio.ts.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import Video, {OnLoadData, OnProgressData, VideoRef} from 'react-native-video';
import {Icon} from './Icon';
import {getAuthToken} from '../services/api';
import {claimPlayback, releasePlayback} from '../services/voicePlayback';
import {fonts} from '../theme';
import {useTheme} from '../state/ThemeContext';

const BARS = 36;
const RATES = [1, 1.5, 2] as const;
const rateLabel = (r: number): string => (r === 1 ? '1×' : r === 1.5 ? '1,5×' : '2×');

/** Hauteurs pseudo-aléatoires DÉTERMINISTES (0..1) dérivées de la clé, pour une onde stable. */
function pseudoWave(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
  }
  const out: number[] = [];
  let x = h >>> 0;
  for (let i = 0; i < BARS; i++) {
    x = (1103515245 * x + 12345) & 0x7fffffff;
    out.push(0.18 + (x / 0x7fffffff) * 0.82); // 0.18..1
  }
  return out;
}

const fmt = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function VoiceNotePlayer({uri, mine, durationSec}: {uri: string; mine: boolean; durationSec?: number}) {
  const {colors} = useTheme();
  const ref = useRef<VideoRef>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [posMs, setPosMs] = useState(0);
  const [durMs, setDurMs] = useState(durationSec ? durationSec * 1000 : 0);
  const [width, setWidth] = useState(0);
  const heights = useMemo(() => pseudoWave(uri), [uri]);

  const token = getAuthToken();
  const source = useMemo(
    () => ({uri, headers: token ? {Authorization: `Bearer ${token}`} : undefined}),
    [uri, token],
  );

  useEffect(() => () => releasePlayback(uri), [uri]);

  const total = durMs > 0 ? durMs : (durationSec || 0) * 1000;
  const progress = total > 0 ? Math.min(1, posMs / total) : 0;

  const played = mine ? '#FFFFFF' : colors.accent500;
  const unplayed = mine ? 'rgba(255,255,255,0.42)' : colors.borderStrong;

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    claimPlayback(uri, () => setPlaying(false));
    setPlaying(true);
  };

  const cycleRate = () => setRate(prev => RATES[(RATES.indexOf(prev as (typeof RATES)[number]) + 1) % RATES.length]);

  const onProgress = (e: OnProgressData) => {
    setPosMs(e.currentTime * 1000);
    if (e.seekableDuration > 0) {
      setDurMs(e.seekableDuration * 1000);
    }
  };
  const onLoad = (e: OnLoadData) => {
    if (e.duration > 0) {
      setDurMs(e.duration * 1000);
    }
  };
  const onEnd = () => {
    setPlaying(false);
    setPosMs(0);
    ref.current?.seek(0);
  };

  const onWaveLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onWavePress = (e: GestureResponderEvent) => {
    if (width <= 0 || total <= 0) {
      return;
    }
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
    const ms = frac * total;
    setPosMs(ms);
    ref.current?.seek(ms / 1000);
  };

  return (
    <View style={styles.row}>
      <Video
        ref={ref}
        source={source}
        paused={!playing}
        rate={rate}
        playInBackground={false}
        ignoreSilentSwitch="ignore"
        onProgress={onProgress}
        onLoad={onLoad}
        onEnd={onEnd}
        onError={() => setPlaying(false)}
        style={styles.hidden}
      />
      <Pressable onPress={toggle} style={[styles.play, {backgroundColor: mine ? 'rgba(255,255,255,0.92)' : colors.accent500}]}>
        <Icon name={playing ? 'pause' : 'play'} size={14} color={mine ? colors.accent : '#fff'} />
      </Pressable>
      <Pressable style={styles.wave} onLayout={onWaveLayout} onPress={onWavePress}>
        {heights.map((hgt, i) => {
          const on = i / BARS <= progress;
          return <View key={i} style={{flex: 1, maxWidth: 3, borderRadius: 2, height: 3 + hgt * 21, backgroundColor: on ? played : unplayed}} />;
        })}
        {width > 0 ? (
          <View style={[styles.playhead, {left: progress * width - 5, backgroundColor: mine ? '#fff' : colors.accent400}]} />
        ) : null}
      </Pressable>
      <Text style={[styles.dur, {color: mine ? 'rgba(255,255,255,0.85)' : colors.textTertiary}]}>{fmt(playing || posMs > 0 ? posMs : total)}</Text>
      <Pressable
        onPress={cycleRate}
        hitSlop={6}
        style={[styles.speed, {backgroundColor: mine ? 'rgba(255,255,255,0.18)' : colors.accent50}]}>
        <Text style={[styles.speedText, {color: mine ? '#fff' : colors.accent}]}>{rateLabel(rate)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 8, width: 244, paddingVertical: 2},
  hidden: {position: 'absolute', width: 1, height: 1, opacity: 0},
  play: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  wave: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 30, position: 'relative'},
  playhead: {position: 'absolute', top: '50%', marginTop: -5, width: 10, height: 10, borderRadius: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 1.5},
  dur: {fontFamily: fonts.mono, fontSize: 10.5, minWidth: 28, textAlign: 'right'},
  speed: {minWidth: 30, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  speedText: {fontFamily: fonts.monoMedium, fontSize: 10, fontWeight: '700'},
});
