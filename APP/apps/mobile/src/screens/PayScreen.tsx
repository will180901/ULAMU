/**
 * Paiement Mobile Money — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/flow.jsx (PayView).
 * Reçu (commission incluse, aucun frais caché) + choix EXPLICITE de l'opérateur (jamais déduit du
 * préfixe, M13). POST /v1/handshakes/:id/pay puis attente de la confirmation : l'issue vient du webhook
 * agrégateur (RM-06-01) — on interroge la poignée jusqu'à PAID + sessionId, puis on entre dans la session.
 */
import {CommonActions, useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, BackHandler, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Banner, IconButton, PrimaryButton} from '../components/ui';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {MomoOperator} from '../lib/contracts';
import {formatXaf} from '../services/directory';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Phase = 'choose' | 'waiting' | 'failed';
const OPERATORS: {code: MomoOperator; label: string; hint: string; icon: IconName}[] = [
  {code: 'MTN_MOMO', label: 'MTN MoMo', hint: 'Mobile Money', icon: 'smartphone'},
  {code: 'AIRTEL_MONEY', label: 'Airtel Money', hint: 'Mobile Money', icon: 'smartphone'},
];
const TERMINAL = ['EXPIRED', 'REFUSED', 'ABANDONED'];

export function PayScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Pay'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {handshakeId, professionalName, amountXaf} = route.params;
  const [operator, setOperator] = useState<MomoOperator>('MTN_MOMO');
  const [phase, setPhase] = useState<Phase>('choose');
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  /**
   * Entrée dans la session, en RETIRANT de la pile la poignée de main ET le paiement.
   *
   * Un simple `replace` ne remplaçait que l'écran de paiement : la poignée restait dessous, et revenir
   * en arrière depuis la session y ramenait — où l'interrogation reprenait, voyait `PAID`, et renvoyait
   * aussitôt dans la session. On ne pouvait plus jamais remonter au-delà. Une fois le paiement abouti,
   * ces deux écrans n'ont plus d'objet : le retour doit ramener à la fiche du soignant.
   */
  const enterSession = useCallback(
    (sessionId: string) => {
      navigation.dispatch(state => {
        const routes = [
          ...state.routes.filter(r => r.name !== 'Handshake' && r.name !== 'Pay'),
          {name: 'Session', params: {sessionId}},
        ];
        return CommonActions.reset({...state, routes, index: routes.length - 1});
      });
    },
    [navigation],
  );

  /**
   * Sortie du paiement — jamais en silence tant qu'une demande est partie chez l'opérateur.
   *
   * L'écran n'avait aucune sortie visible et aucun garde-fou : un appui sur le bouton matériel le
   * dépilait et arrêtait l'interrogation alors que le paiement était déjà engagé. Ça ne se voyait pas,
   * parce que la poignée de main continuait d'interroger le serveur en dessous et rattrapait le coup —
   * ce polling parasite est précisément ce qu'on vient de supprimer.
   */
  const leavePayment = useAbandonGuard({
    dirty: phase === 'waiting',
    title: 'Quitter le paiement ?',
    message:
      "Une demande de confirmation a déjà été envoyée sur votre téléphone. Si vous la validez après avoir quitté cet écran, la session ne s'ouvrira pas d'elle-même : il faudra repasser par la poignée de main.",
    onLeave: () => navigation.goBack(),
  });

  // Lu par référence, comme dans AuthPage : le garde-fou est recréé à chaque rendu, on se réabonnerait
  // sinon en boucle pour rien.
  const leaveRef = useRef(leavePayment);
  leaveRef.current = leavePayment;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leaveRef.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const poll = useCallback(async () => {
    try {
      const hs = await api.getHandshake(handshakeId);
      if (hs.status === 'PAID' && hs.sessionId) {
        stopPolling();
        enterSession(hs.sessionId);
      } else if (TERMINAL.includes(hs.status)) {
        stopPolling();
        setFailMsg("La fenêtre de paiement a expiré avant la confirmation. Aucun franc n'a été débité.");
        setPhase('failed');
      }
    } catch {
      /* on retente au prochain tick */
    }
  }, [handshakeId, enterSession]);

  const onPay = async () => {
    setBusy(true);
    try {
      const res = await api.payHandshake(handshakeId, {operator});
      if (res.status === 'FAILED') {
        setFailMsg(res.failReason ?? 'Le paiement a échoué. Aucun franc débité — réessayez.');
        setPhase('failed');
        return;
      }
      // INITIATED / SUCCEEDED : l'issue définitive vient du webhook → on interroge la poignée.
      setPhase('waiting');
      poll();
      timer.current = setInterval(poll, 2500);
    } catch (e) {
      setFailMsg(e instanceof ApiError ? e.message : 'Paiement impossible — réessayez.');
      setPhase('failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        {/* Sortie VISIBLE : le bouton matériel d'Android était jusqu'ici la seule façon de quitter cet
            écran — invisible, et inexistante sur iOS. Même geste que lui, au garde-fou près. */}
        <IconButton icon="arrow-left" onPress={leavePayment} variant="tile" size={18} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Paiement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Reçu */}
        <View style={[styles.receipt, shadow.sm]}>
          <Text style={styles.receiptKicker}>CONSULTATION</Text>
          <Text style={styles.receiptName}>{professionalName}</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Montant (commission incluse)</Text>
            <Text style={styles.receiptValue}>{formatXaf(amountXaf)}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptTotalLabel}>Total à payer</Text>
            <Text style={styles.receiptTotal}>{formatXaf(amountXaf)}</Text>
          </View>
          <Text style={styles.receiptNote}>Aucun frais caché — jamais un franc de plus que ce montant.</Text>
        </View>

        {phase === 'choose' && (
          <>
            <Text style={styles.section}>Choisissez votre opérateur</Text>
            {OPERATORS.map(op => {
              const on = operator === op.code;
              return (
                <Pressable key={op.code} onPress={() => setOperator(op.code)} style={[styles.opCard, on && styles.opCardOn]}>
                  <View style={[styles.opIcon, on && styles.opIconOn]}>
                    <Icon name={op.icon} size={18} color={on ? '#fff' : colors.accent400} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.opLabel}>{op.label}</Text>
                    <Text style={styles.opHint}>{op.hint}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                </Pressable>
              );
            })}
            <PrimaryButton title={`Payer ${formatXaf(amountXaf)}`} iconLeft="credit-card" loading={busy} onPress={onPay} />
            <Text style={styles.foot}>Une demande sera poussée sur votre téléphone — confirmez avec votre code Mobile Money.</Text>
          </>
        )}

        {phase === 'waiting' && (
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.waitingTitle}>Confirmez sur votre téléphone</Text>
            <Text style={styles.waitingSub}>Saisissez votre code {OPERATORS.find(o => o.code === operator)?.label} pour valider le paiement. La session s'ouvrira automatiquement.</Text>
            <Banner tone="info" title="Remboursement automatique">
              Si le soignant n'envoie aucun message, vous êtes intégralement remboursé (D-008).
            </Banner>
          </View>
        )}

        {phase === 'failed' && (
          <View style={styles.waiting}>
            <Icon name="refresh" size={26} color={colors.errorDot} strokeWidth={1.6} />
            <Text style={styles.waitingTitle}>Paiement non abouti</Text>
            <Text style={styles.waitingSub}>{failMsg}</Text>
            <PrimaryButton title="Réessayer" iconLeft="refresh" onPress={() => {
              setPhase('choose');
              setFailMsg('');
            }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
    headerTitle: {fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary},
    content: {padding: 16, gap: 14},

    receipt: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 16},
    receiptKicker: {fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.8, color: colors.textTertiary},
    receiptName: {fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary, marginTop: 3, marginBottom: 12},
    receiptRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3},
    receiptLabel: {fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary},
    receiptValue: {fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary},
    receiptDivider: {height: 1, backgroundColor: colors.borderSubtle, marginVertical: 10},
    receiptTotalLabel: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary},
    receiptTotal: {fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4, color: colors.accent},
    receiptNote: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 10},

    section: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary, marginTop: 2},
    opCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
    opCardOn: {borderColor: colors.accent500},
    opIcon: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: 'rgba(39,86,166,0.14)', alignItems: 'center', justifyContent: 'center'},
    opIconOn: {backgroundColor: colors.accent500},
    opLabel: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textPrimary},
    opHint: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
    radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center'},
    radioOn: {borderColor: colors.accent500},
    radioDot: {width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent500},

    foot: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, textAlign: 'center'},

    waiting: {alignItems: 'center', gap: 12, paddingVertical: 16},
    waitingTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary, textAlign: 'center'},
    waitingSub: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center'},
  });
