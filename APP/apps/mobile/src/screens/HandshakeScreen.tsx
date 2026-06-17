/**
 * Poignée de main — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/flow.jsx (HandshakeView).
 * Attente de confirmation du soignant : on INTERROGE GET /v1/handshakes/:id (polling — pas de SSE pour
 * l'instant) et on affiche le compte à rebours PM-07 calculé SERVEUR (RM-06-02). « Régler » n'apparaît
 * qu'une fois CONFIRMED (RM-06-01 / D-007 : aucun paiement sans confirmation valide). Rien n'est débité ici.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Avatar, Banner, PrimaryButton} from '../components/ui';
import {AvatarViewer} from '../components/AvatarViewer';
import {Grain} from '../components/Grain';
import {ErrorState} from '../components/ScreenState';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {HandshakeView} from '../lib/contracts';
import {formatXaf} from '../services/directory';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const STEPS = ['Poignée', 'Paiement', 'Session'];
const TERMINAL = ['EXPIRED', 'REFUSED', 'ABANDONED'];
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

export function HandshakeScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Handshake'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {handshakeId, professionalName, amountXaf} = route.params;
  const [hs, setHs] = useState<HandshakeView | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const poll = useCallback(async () => {
    try {
      const next = await api.getHandshake(handshakeId);
      setHs(next);
      setRemaining(next.windowRemainingSeconds);
      setError(false);
      if (next.status === 'PAID' || TERMINAL.includes(next.status)) {
        stopPolling();
      }
      if (next.status === 'PAID' && next.sessionId) {
        navigation.replace('Session', {sessionId: next.sessionId});
      }
    } catch {
      setError(true);
    }
  }, [handshakeId, navigation]);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 2500);
    return stopPolling;
  }, [poll]);

  // Décompte local entre deux interrogations (resynchronisé à chaque poll).
  useEffect(() => {
    if (!hs || (hs.status !== 'INITIATED' && hs.status !== 'CONFIRMED')) {
      return;
    }
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [hs?.status]);

  const stepIndex = hs?.status === 'CONFIRMED' ? 1 : 0;

  // #6 — annuler la demande tant que le soignant n'a pas confirmé (INITIATED), puis retour à l'annuaire.
  const onAbandon = async () => {
    stopPolling();
    try {
      await api.abandonHandshake(handshakeId);
    } catch {
      /* déjà confirmée/expirée entre-temps : on quitte quand même */
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poignée de main</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StepBar index={stepIndex} />

        {error && !hs ? (
          <ErrorState onRetry={poll} />
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <Pressable onPress={() => setAvatarOpen(true)} hitSlop={6} accessibilityLabel={`Voir la photo de ${professionalName}`}>
                <Avatar name={professionalName} size={84} online={hs?.status === 'CONFIRMED'} />
              </Pressable>
              {(hs?.status === 'INITIATED' || !hs) && <ActivityIndicator style={styles.spin} color={colors.accent} />}
            </View>

            {(!hs || hs.status === 'INITIATED') && (
              <Waiting name={professionalName} remaining={remaining} onCancel={onAbandon} />
            )}

            {hs?.status === 'CONFIRMED' && (
              <Confirmed name={professionalName} amountXaf={amountXaf} remaining={remaining} onPay={() =>
                navigation.navigate('Pay', {handshakeId, professionalName, amountXaf})
              } />
            )}

            {hs && TERMINAL.includes(hs.status) && (
              <Terminal status={hs.status} name={professionalName} reason={hs.refusalReason} onBack={() => navigation.goBack()} />
            )}
          </>
        )}
      </ScrollView>
      <AvatarViewer visible={avatarOpen} uri={null} name={professionalName} onClose={() => setAvatarOpen(false)} />
    </SafeAreaView>
  );
}

function Waiting({name, remaining, onCancel}: {name: string; remaining: number; onCancel: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block}>
      <Text style={styles.title}>En attente de {name}</Text>
      <Text style={styles.sub}>Le soignant doit confirmer qu'il est prêt à vous recevoir. Vous serez notifié dès sa réponse.</Text>
      <View style={styles.countdown}>
        <Icon name="clock" size={14} color={colors.textTertiary} />
        <Text style={styles.countdownText}>Expire dans {mmss(remaining)}</Text>
      </View>
      <Banner tone="info" title="Aucun franc n'est débité">
        Le paiement ne sera possible qu'une fois la confirmation reçue (D-007).
      </Banner>
      <Pressable onPress={onCancel} style={styles.cancelHs} hitSlop={6}>
        <Icon name="x" size={15} color={colors.textTertiary} />
        <Text style={styles.cancelHsText}>Annuler la demande</Text>
      </Pressable>
    </View>
  );
}

function Confirmed({name, amountXaf, remaining, onPay}: {name: string; amountXaf: number; remaining: number; onPay: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block}>
      <View style={styles.readyBadge}>
        <Icon name="check-circle" size={16} color={colors.successDot} />
        <Text style={styles.readyText}>{name} est prêt à vous recevoir</Text>
      </View>
      <View style={[styles.recap, shadow.sm]}>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Montant bloqué</Text>
          <Text style={styles.recapValue}>{formatXaf(amountXaf)}</Text>
        </View>
        <View style={styles.recapDivider} />
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Fenêtre de paiement</Text>
          <Text style={styles.recapValue}>{mmss(remaining)}</Text>
        </View>
      </View>
      <PrimaryButton title={`Régler ${formatXaf(amountXaf)}`} iconLeft="credit-card" onPress={onPay} />
      <Text style={styles.foot}>Vous confirmerez le paiement sur votre téléphone (Mobile Money).</Text>
    </View>
  );
}

function Terminal({status, name, reason, onBack}: {status: string; name: string; reason: string | null; onBack: () => void}) {
  const map: Record<string, {title: string; sub: string}> = {
    EXPIRED: {title: 'La demande a expiré', sub: "Le soignant n'a pas répondu à temps. Aucun franc n'a été débité — vous pouvez réessayer ou choisir un autre soignant."},
    REFUSED: {title: `${name} ne peut pas vous recevoir`, sub: reason ? `Motif : ${reason}` : "Aucun franc n'a été débité. Vous pouvez choisir un autre soignant."},
    ABANDONED: {title: 'Demande abandonnée', sub: "Cette poignée de main n'est plus active. Aucun franc n'a été débité."},
  };
  const m = map[status] ?? map.ABANDONED;
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{m.title}</Text>
      <Text style={styles.sub}>{m.sub}</Text>
      <PrimaryButton title="Revenir à l'annuaire" iconLeft="arrow-left" onPress={onBack} />
    </View>
  );
}

function StepBar({index}: {index: number}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stepBar}>
      {STEPS.map((label, i) => {
        const done = i < index;
        const on = i === index;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.stepDot, (on || done) && styles.stepDotOn]}>
              {done ? <Icon name="check" size={12} color="#fff" strokeWidth={2.4} /> : <Text style={[styles.stepNum, on && styles.stepNumOn]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, on && styles.stepLabelOn]}>{label}</Text>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineOn]} />}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  headerTitle: {fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary},
  content: {padding: 16, gap: 18},

  stepBar: {flexDirection: 'row', paddingHorizontal: 4, marginTop: 4},
  step: {flex: 1, alignItems: 'center', position: 'relative'},
  stepDot: {width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center', zIndex: 2},
  stepDotOn: {backgroundColor: colors.accent500, borderColor: colors.accent500},
  stepNum: {fontFamily: fonts.monoMedium, fontSize: 12, color: colors.textTertiary},
  stepNumOn: {color: '#fff'},
  stepLabel: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 5},
  stepLabelOn: {color: colors.textPrimary, fontWeight: '600'},
  stepLine: {position: 'absolute', top: 14, left: '50%', right: '-50%', height: 2, backgroundColor: colors.borderDefault, zIndex: 1},
  stepLineOn: {backgroundColor: colors.accent500},

  avatarWrap: {alignItems: 'center', marginTop: 8},
  spin: {marginTop: 12},

  block: {gap: 12},
  title: {fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.textPrimary, textAlign: 'center'},
  sub: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, textAlign: 'center'},
  countdown: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  countdownText: {fontFamily: fonts.monoMedium, fontSize: 13, color: colors.textSecondary},
  cancelHs: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 2},
  cancelHsText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},

  readyBadge: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radius.card, paddingVertical: 11, paddingHorizontal: 14},
  readyText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.success},
  recap: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 14},
  recapRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  recapLabel: {fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary},
  recapValue: {fontFamily: fonts.displayBold, fontSize: 15, color: colors.textPrimary},
  recapDivider: {height: 1, backgroundColor: colors.borderSubtle, marginVertical: 11},
  foot: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, textAlign: 'center'},
});
