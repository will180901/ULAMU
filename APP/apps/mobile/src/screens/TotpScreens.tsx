/**
 * Activation de la double authentification (TOTP) — parcours guidé, post-connexion.
 * Intro → QR à scanner → confirmation par code → codes de secours → fait. Réel (M01 setup/confirm).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  AuthScreen,
  Badge,
  Banner,
  Card,
  CobaltHeader,
  ErrorBanner,
  FloatCard,
  HeaderIconBadge,
  HeaderSubtitle,
  HeaderTitle,
  Hint,
  OtpInput,
  PrimaryButton,
  Switch,
} from '../components/ui';
import {Icon, IconName} from '../components/Icon';
import {ApiError} from '../lib/api-client';
import {isValidOtp} from '../lib/validation';
import {AppStackParamList} from '../navigation/types';
import {useAuth} from '../state/AuthContext';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/* ── Intro ── */
export function TotpIntroScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'TotpIntro'>) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {totpStartSetup} = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: [IconName, string, string][] = [
    ['smartphone', 'Installez une app', 'Google Authenticator, Authy ou FreeOTP sur votre téléphone.'],
    ['shield-check', 'Scannez le QR code', 'Liez votre compte ULAMU à l\'application en un scan.'],
    ['key', 'Gardez vos codes', 'Des codes de secours pour vous connecter si vous perdez le téléphone.'],
  ];

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const res = await totpStartSetup();
      navigation.navigate('TotpSetup', {secret: res.secret, provisioningUri: res.provisioningUri});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de démarrer. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <CobaltHeader onBack={() => navigation.goBack()} paddingBottom={32}>
        <HeaderIconBadge name="shield-check" />
        <HeaderTitle>Double authentification</HeaderTitle>
        <HeaderSubtitle>Renforcez la sécurité de votre compte en 3 étapes.</HeaderSubtitle>
      </CobaltHeader>
      <FloatCard>
        <ErrorBanner message={error} />
        <View style={{gap: 14}}>
          {steps.map(([ic, t, s], i) => (
            <View key={t} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Icon name={ic} size={18} variant="tile" />
              <View style={{flex: 1}}>
                <Text style={styles.stepTitle}>{t}</Text>
                <Text style={styles.stepSub}>{s}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{flex: 1, minHeight: 16}} />
        <PrimaryButton title="Commencer" iconRight="arrow-right" onPress={start} loading={busy} />
      </FloatCard>
    </AuthScreen>
  );
}

/* ── QR à scanner ── */
export function TotpSetupScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'TotpSetup'>) {
  const styles = useThemedStyles(makeStyles);
  const {secret, provisioningUri} = route.params;
  return (
    <AuthScreen>
      <CobaltHeader onBack={() => navigation.goBack()} paddingBottom={30}>
        <HeaderTitle size={23}>Scannez ce code</HeaderTitle>
        <HeaderSubtitle>Dans votre app d'authentification, ajoutez un compte et scannez.</HeaderSubtitle>
      </CobaltHeader>
      <FloatCard>
        <View style={styles.qrWrap}>
          <QRCode value={provisioningUri} size={196} backgroundColor="#FFFFFF" color="#111112" />
        </View>
        <Text style={styles.qrOr}>Ou saisissez la clé manuellement :</Text>
        <View style={styles.secretBox}>
          <Text style={styles.secretText} selectable>
            {secret.replace(/(.{4})/g, '$1 ').trim()}
          </Text>
        </View>
        <View style={{flex: 1, minHeight: 16}} />
        <PrimaryButton title="J'ai scanné" iconRight="arrow-right" onPress={() => navigation.navigate('TotpConfirm')} />
      </FloatCard>
    </AuthScreen>
  );
}

/* ── Confirmation par code ── */
export function TotpConfirmScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'TotpConfirm'>) {
  const {totpConfirm} = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    if (!isValidOtp(code) || tried.current) {
      return;
    }
    tried.current = true;
    const t = setTimeout(async () => {
      setError(null);
      try {
        const codes = await totpConfirm(code);
        navigation.navigate('TotpBackupCodes', {codes});
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Code invalide — rescannez le QR.');
        setCode('');
        tried.current = false;
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code, totpConfirm, navigation]);

  return (
    <AuthScreen>
      <CobaltHeader onBack={() => navigation.goBack()} paddingBottom={32}>
        <HeaderIconBadge name="shield-check" />
        <HeaderTitle>Confirmez l'activation</HeaderTitle>
        <HeaderSubtitle>Entrez le code à 6 chiffres affiché dans votre application.</HeaderSubtitle>
      </CobaltHeader>
      <FloatCard>
        <ErrorBanner message={error} />
        <OtpInput value={code} onChange={setCode} />
        <View style={{alignItems: 'center', marginTop: 18}}>
          {isValidOtp(code) ? (
            <Badge tone="success" icon="check-circle">
              Vérification…
            </Badge>
          ) : (
            <Badge tone="neutral" dot>
              En attente du code
            </Badge>
          )}
        </View>
      </FloatCard>
    </AuthScreen>
  );
}

/* ── Codes de secours ── */
export function TotpBackupCodesScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'TotpBackupCodes'>) {
  const styles = useThemedStyles(makeStyles);
  const {codes} = route.params;
  const [saved, setSaved] = useState(false);
  return (
    <AuthScreen>
      <CobaltHeader paddingBottom={30}>
        <HeaderIconBadge name="key" />
        <HeaderTitle>Vos codes de secours</HeaderTitle>
        <HeaderSubtitle>Ils s'affichent une seule fois. Notez-les en lieu sûr.</HeaderSubtitle>
      </CobaltHeader>
      <FloatCard>
        <Card>
          <View style={styles.codesGrid}>
            {codes.map((c, i) => (
              <View key={c} style={styles.codeCell}>
                <Text style={styles.codeIdx}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.codeText} selectable>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        <View style={{marginTop: 14}}>
          <Banner tone="info" title="Chaque code ne sert qu'une fois">
            Utilisez-en un si vous n'avez pas accès à votre application d'authentification.
          </Banner>
        </View>
        <Pressable style={styles.consent} onPress={() => setSaved(s => !s)}>
          <Switch value={saved} onValueChange={setSaved} />
          <Text style={styles.consentText}>J'ai sauvegardé mes codes de secours en lieu sûr.</Text>
        </Pressable>
        <PrimaryButton title="Terminer" iconRight="check" onPress={() => navigation.navigate('TotpDone')} disabled={!saved} />
      </FloatCard>
    </AuthScreen>
  );
}

/* ── Fait ── */
export function TotpDoneScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'TotpDone'>) {
  const styles = useThemedStyles(makeStyles);
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, {toValue: 1, duration: 350, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true}).start();
  }, [pop]);
  const scale = pop.interpolate({inputRange: [0, 1], outputRange: [0.6, 1]});
  return (
    <AuthScreen>
      <CobaltHeader paddingBottom={40}>
        <View style={{alignItems: 'center', paddingTop: 6}}>
          <Animated.View style={[styles.doneCircle, {transform: [{scale}], opacity: pop}]}>
            <Icon name="shield-check" size={34} color="#fff" strokeWidth={2} />
          </Animated.View>
          <Text style={styles.doneTitle}>Activée !</Text>
          <Text style={styles.doneSub}>La double authentification protège désormais votre compte.</Text>
        </View>
      </CobaltHeader>
      <FloatCard>
        <Hint center>À la prochaine connexion, un code de votre application vous sera demandé.</Hint>
        <View style={{flex: 1, minHeight: 16}} />
        <PrimaryButton title="Revenir à mon espace" iconRight="arrow-right" onPress={() => navigation.navigate('Tabs')} />
      </FloatCard>
    </AuthScreen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  stepRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepNum: {width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
  stepNumText: {fontFamily: fonts.display, fontSize: 12, color: '#fff'},
  stepTitle: {fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  stepSub: {fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textTertiary, marginTop: 1},

  qrWrap: {alignSelf: 'center', padding: 14, backgroundColor: '#FFFFFF', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 4},
  qrOr: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, textAlign: 'center', marginTop: 16},
  secretBox: {marginTop: 8, backgroundColor: colors.bgMuted, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center'},
  secretText: {fontFamily: fonts.mono, fontSize: 15, letterSpacing: 1, color: colors.textPrimary},

  codesGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  codeCell: {width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7},
  codeIdx: {fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary},
  codeText: {fontFamily: fonts.mono, fontSize: 14, color: colors.textPrimary, letterSpacing: 0.5},

  consent: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 16},
  consentText: {flex: 1, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 1},

  doneCircle: {width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center'},
  doneTitle: {fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.6, color: '#fff', marginTop: 16},
  doneSub: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.82)', marginTop: 5, textAlign: 'center'},
});
