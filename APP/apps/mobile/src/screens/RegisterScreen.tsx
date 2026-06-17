/**
 * Inscription patient — RÉELLE. 3 étapes :
 *  1) Identité : prénom, nom, nom d'utilisateur (dispo en direct), naissance, sexe, arrondissement.
 *  2) Compte   : téléphone, mot de passe (+ confirmation), consentement → OTP SMS.
 *  3) OTP      : code SMS → création du compte (M01).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  AuthScreen,
  Badge,
  Banner,
  CobaltHeader,
  ErrorBanner,
  Field,
  FieldLabel,
  FloatCard,
  FootLink,
  HeaderSubtitle,
  HeaderTitle,
  Hint,
  OtpInput,
  PasswordField,
  PhoneField,
  PrimaryButton,
  Switch,
} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isAcceptablePassword, isAdultIso, isValidOtp, isValidPhone, isValidUsername, normalizePhone, normalizeUsername} from '../lib/validation';
import {AuthStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {RegisterProfile, useAuth} from '../state/AuthContext';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type Step = 'identity' | 'account' | 'otp';
type UStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const MIN_AGE = 18; // PM-16

export function RegisterScreen({navigation}: Props) {
  const styles = useThemedStyles(makeStyles);
  const {requestOtp, verifyRegister, state} = useAuth();
  const [step, setStep] = useState<Step>('identity');

  // Identité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [uStatus, setUStatus] = useState<UStatus>('idle');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | null>(null);
  const [district, setDistrict] = useState('');

  // Compte
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);

  // OTP
  const [otp, setOtp] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null); // mode test : code renvoyé par le serveur (pas de SMS)
  const otpTried = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const busy = state.status === 'authenticating';

  // Disponibilité du username (debounce)
  useEffect(() => {
    const u = normalizeUsername(username);
    if (!isValidUsername(u)) {
      setUStatus(u.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setUStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api.checkUsername(u);
        setUStatus(res.available ? 'available' : 'taken');
      } catch {
        setUStatus('idle');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [username]);

  const isoDob = dobToIso(dob);
  const identityReady =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    uStatus === 'available' &&
    !!isoDob &&
    isAdultIso(isoDob, MIN_AGE, new Date()) &&
    !!sex &&
    district.trim().length > 1;
  const accountReady = isValidPhone(phone) && isAcceptablePassword(password) && password === confirm && agree;

  async function onSendOtp() {
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Numéro invalide. Format attendu : 06 612 45 90.');
      return;
    }
    setSending(true);
    try {
      const res = await requestOtp(normalized, 'REGISTRATION');
      setStep('otp');
      // Mode test (pas de SMS) : le serveur renvoie le code → on le montre et on le pré-remplit.
      if (res.debugCode) {
        setTestCode(res.debugCode);
        setOtp(res.debugCode);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi du code impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (step !== 'otp' || !isValidOtp(otp) || otpTried.current) {
      return;
    }
    otpTried.current = true;
    const normalized = normalizePhone(phone);
    if (!normalized || !isoDob || !sex) {
      return;
    }
    const profile: RegisterProfile = {firstName: firstName.trim(), lastName: lastName.trim(), username: normalizeUsername(username), birthDate: isoDob, sex, password};
    const t = setTimeout(async () => {
      setError(null);
      try {
        await verifyRegister(profile, district.trim(), normalized, otp);
        navigation.navigate('Success', {context: 'register'});
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Création du compte impossible.');
        setOtp('');
        otpTried.current = false;
      }
    }, 350);
    return () => clearTimeout(t);
  }, [step, otp, phone, isoDob, sex, firstName, lastName, username, password, district, verifyRegister, navigation]);

  function onBack() {
    setError(null);
    if (step === 'otp') {
      setStep('account');
      setOtp('');
      otpTried.current = false;
    } else if (step === 'account') {
      setStep('identity');
    } else {
      navigation.goBack();
    }
  }

  return (
    <AuthScreen>
      <CobaltHeader onBack={onBack} paddingBottom={30}>
        <HeaderTitle size={23}>Créer mon compte</HeaderTitle>
        <HeaderSubtitle>
          {step === 'identity' && 'Étape 1 sur 3 — votre identité'}
          {step === 'account' && 'Étape 2 sur 3 — votre accès'}
          {step === 'otp' && `Étape 3 sur 3 — code envoyé au ${normalizePhone(phone) ?? phone}`}
        </HeaderSubtitle>
      </CobaltHeader>

      <FloatCard>
        <ErrorBanner message={error} />

        {step === 'identity' && (
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Prénom</FieldLabel>
              <Field icon="user" value={firstName} onChangeText={setFirstName} placeholder="Mireille" autoCapitalize="words" />
            </View>
            <View>
              <FieldLabel>Nom</FieldLabel>
              <Field icon="user" value={lastName} onChangeText={setLastName} placeholder="Nkounkou" autoCapitalize="words" />
            </View>
            <View>
              <FieldLabel>Nom d'utilisateur</FieldLabel>
              <Field icon="user" value={username} onChangeText={setUsername} placeholder="mireille_n" autoCapitalize="none" />
              <UsernameHint status={uStatus} />
            </View>
            <View>
              <FieldLabel>Date de naissance</FieldLabel>
              <Field value={dob} onChangeText={t => setDob(formatDob(t))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
            </View>
            <View>
              <FieldLabel>Sexe</FieldLabel>
              <View style={styles.sexRow}>
                {(['M', 'F'] as const).map(s => (
                  <Pressable key={s} onPress={() => setSex(s)} style={[styles.sexItem, sex === s && styles.sexItemOn]}>
                    <Text style={[styles.sexText, sex === s && styles.sexTextOn]}>{s === 'M' ? 'Homme' : 'Femme'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <FieldLabel>Arrondissement / quartier</FieldLabel>
              <Field icon="map-pin" value={district} onChangeText={setDistrict} placeholder="Ex. Talangaï" autoCapitalize="words" />
            </View>
            <PrimaryButton title="Continuer" iconRight="arrow-right" onPress={() => setStep('account')} disabled={!identityReady} />
          </View>
        )}

        {step === 'account' && (
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Numéro de téléphone</FieldLabel>
              <PhoneField value={phone} onChangeText={setPhone} />
            </View>
            <View>
              <FieldLabel>Mot de passe</FieldLabel>
              <PasswordField value={password} onChangeText={setPassword} placeholder="8 caractères min., lettres et chiffres" />
            </View>
            <View>
              <FieldLabel>Confirmer le mot de passe</FieldLabel>
              <PasswordField value={confirm} onChangeText={setConfirm} placeholder="Retapez votre mot de passe" />
            </View>
            <Pressable style={styles.consent} onPress={() => setAgree(a => !a)}>
              <Switch value={agree} onValueChange={setAgree} />
              <Text style={styles.consentText}>
                J'accepte que mes données de santé soient chiffrées et accessibles aux seuls soignants que je consulte.
              </Text>
            </Pressable>
            <PrimaryButton title="Recevoir le code" iconLeft="send" onPress={onSendOtp} disabled={!accountReady} loading={sending} />
          </View>
        )}

        {step === 'otp' && (
          <View style={{gap: 16}}>
            {testCode && (
              <Banner tone="warning" title="Mode test (pas de SMS)">
                Votre code de vérification : {testCode} — déjà pré-rempli ci-dessous.
              </Banner>
            )}
            <OtpInput value={otp} onChange={setOtp} />
            <View style={{alignItems: 'center'}}>
              {isValidOtp(otp) ? (
                <Badge tone="success" icon="check-circle">
                  Vérification…
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Réception du code en cours…
                </Badge>
              )}
            </View>
            {busy ? <Hint center>Création de votre compte…</Hint> : <Hint center>Le code à 6 chiffres est envoyé par SMS.</Hint>}
          </View>
        )}

        <View style={{flex: 1, minHeight: 20}} />
        {step === 'identity' && <FootLink prefix="Déjà membre ?" action="Se connecter" onPress={() => navigation.navigate('Login')} />}
      </FloatCard>
    </AuthScreen>
  );
}

function UsernameHint({status}: {status: UStatus}) {
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();
  if (status === 'idle') {
    return null;
  }
  const map = {
    checking: {c: colors.textTertiary, t: 'Vérification…'},
    available: {c: colors.success, t: '✓ Disponible'},
    taken: {c: colors.error, t: 'Déjà pris'},
    invalid: {c: colors.textTertiary, t: '3–30 caractères : lettres, chiffres, . _ -'},
  }[status];
  return <Text style={[styles.uHint, {color: map.c}]}>{map.t}</Text>;
}

function formatDob(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/');
}
function dobToIso(dob: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob);
  if (!m) {
    return null;
  }
  const [, dd, mm, yyyy] = m;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    uHint: {fontFamily: fonts.body, fontSize: 12, marginTop: 6},
    consent: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
    consentText: {flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 1},
    sexRow: {flexDirection: 'row', gap: 10},
    sexItem: {flex: 1, height: 48, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center'},
    sexItemOn: {borderColor: colors.accent500, borderWidth: 1.5, backgroundColor: colors.accent50},
    sexText: {fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.textTertiary},
    sexTextOn: {color: colors.accent600},
  });
