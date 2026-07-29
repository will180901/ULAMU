/**
 * Inscription patient — RÉELLE. 3 étapes :
 *  1) Identité : prénom, nom, nom d'utilisateur (dispo en direct), naissance, sexe, arrondissement.
 *  2) Compte   : téléphone, email, mot de passe (+ confirmation), consentement → OTP par email (2026-07).
 *  3) OTP      : code email → création du compte (M01).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AuthCarouselDrawer} from '../components/AuthCarouselDrawer';
import {
  Badge,
  Banner,
  CardHeading,
  ErrorBanner,
  Field,
  FieldLabel,
  FootLink,
  Hint,
  OtpInput,
  PasswordField,
  PhoneField,
  PrimaryButton,
  Switch,
} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isAcceptablePassword, isAdultIso, isValidEmail, isValidOtp, isValidUsername, normalizeEmail, normalizePhone, normalizeUsername} from '../lib/validation';
import {AvailabilityStatus, useAvailability} from '../state/useAvailability';
import {useDialog} from '../components/Dialog';
import {AuthStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {RegisterProfile, useAuth} from '../state/AuthContext';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type Step = 'identity' | 'account' | 'otp';

const MIN_AGE = 18; // PM-16

export function RegisterScreen({navigation}: Props) {
  const styles = useThemedStyles(makeStyles);
  const {requestOtp, verifyRegister, state} = useAuth();
  // Renommé : `confirm` est déjà pris par le champ de confirmation du mot de passe, juste en dessous.
  const {confirm: askConfirm} = useDialog();
  const [step, setStep] = useState<Step>('identity');

  // Identité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | null>(null);
  const [district, setDistrict] = useState('');

  // Compte
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);

  // OTP
  const [otp, setOtp] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null); // mode test : code renvoyé par le serveur (pas d'email réel)
  const [validForMin, setValidForMin] = useState<number | null>(null); // durée réelle renvoyée par l'API (PM-17)
  const otpTried = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const busy = state.status === 'authenticating';

  // Les TROIS identifiants uniques du compte sont vérifiés pendant la frappe, par le même hook. Le
  // téléphone et l'email ne l'étaient jusqu'ici qu'à la toute fin : on remplissait trois écrans et on
  // recevait un code pour se heurter seulement là à « déjà enregistré », code gaspillé et décompté.
  const uStatus = useAvailability(username, {
    normalize: raw => (isValidUsername(raw) ? normalizeUsername(raw) : null),
    check: u => api.checkUsername(u),
  });
  const emailStatus = useAvailability(email, {
    normalize: raw => (isValidEmail(raw) ? normalizeEmail(raw) : null),
    check: e => api.checkEmail(e),
  });
  const phoneStatus = useAvailability(phone, {
    normalize: raw => normalizePhone(raw),
    check: p => api.checkPhone(p),
  });

  const isoDob = dobToIso(dob);

  // Ce qui manque encore à l'étape 1, énuméré explicitement. `identityReady` en DÉCOULE au lieu d'être
  // une condition parallèle : les deux ne peuvent donc jamais diverger. Sans cette liste, le bouton
  // restait grisé sans que rien à l'écran n'en dise la raison — or deux des causes sont invisibles
  // (sexe non sélectionné, nom d'utilisateur pas encore confirmé disponible), au point qu'on pouvait
  // croire le formulaire complet et rester bloqué là.
  const identityMissing: string[] = [];
  if (firstName.trim().length <= 1) {
    identityMissing.push('votre prénom (2 caractères minimum)');
  }
  if (lastName.trim().length <= 1) {
    identityMissing.push('votre nom (2 caractères minimum)');
  }
  if (uStatus !== 'available') {
    identityMissing.push(
      {
        idle: "un nom d'utilisateur",
        checking: "la vérification du nom d'utilisateur (en cours…)",
        taken: "un nom d'utilisateur libre — celui-ci est déjà pris",
        invalid: "un nom d'utilisateur valide (3 à 30 caractères)",
        error: "la vérification du nom d'utilisateur — connexion impossible",
        available: '',
      }[uStatus],
    );
  }
  if (!isoDob) {
    identityMissing.push('votre date de naissance complète (JJ/MM/AAAA)');
  } else if (!isAdultIso(isoDob, MIN_AGE, new Date())) {
    identityMissing.push(`avoir ${MIN_AGE} ans révolus`);
  }
  if (!sex) {
    identityMissing.push('votre sexe');
  }
  if (district.trim().length <= 1) {
    identityMissing.push('votre arrondissement ou quartier');
  }
  const identityReady = identityMissing.length === 0;
  // N'affiche le récapitulatif qu'une fois le formulaire entamé : inutile d'énumérer tout ce qui manque
  // à quelqu'un qui vient d'arriver sur un écran vierge.
  const identityTouched = !!sex || [firstName, lastName, username, dob, district].some(v => v.trim().length > 0);
  // Même principe qu'à l'étape 1 : la liste est la source unique, `accountReady` en découle.
  const accountMissing: string[] = [];
  if (phoneStatus !== 'available') {
    accountMissing.push(
      {
        idle: 'votre numéro de téléphone',
        checking: 'la vérification du numéro (en cours…)',
        taken: 'un numéro libre — celui-ci a déjà un compte, connectez-vous plutôt',
        invalid: 'un numéro congolais valide (ex. 06 612 45 90)',
        error: 'la vérification du numéro — connexion impossible',
        available: '',
      }[phoneStatus],
    );
  }
  if (emailStatus !== 'available') {
    accountMissing.push(
      {
        idle: 'votre adresse email',
        checking: "la vérification de l'email (en cours…)",
        taken: 'une adresse libre — celle-ci a déjà un compte, connectez-vous plutôt',
        invalid: 'une adresse email valide',
        error: "la vérification de l'email — connexion impossible",
        available: '',
      }[emailStatus],
    );
  }
  if (!isAcceptablePassword(password)) {
    accountMissing.push('un mot de passe de 8 caractères minimum, avec lettres et chiffres');
  } else if (password !== confirm) {
    accountMissing.push('la confirmation identique du mot de passe');
  }
  if (!agree) {
    accountMissing.push('votre accord sur la confidentialité de vos données');
  }
  const accountReady = accountMissing.length === 0;
  const accountTouched = agree || [phone, email, password, confirm].some(v => v.trim().length > 0);

  async function onSendOtp() {
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Numéro invalide. Format attendu : 06 612 45 90.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Adresse email invalide.');
      return;
    }
    setSending(true);
    try {
      const res = await requestOtp(email, 'REGISTRATION');
      setValidForMin(Math.max(1, Math.round(res.expiresInSeconds / 60)));
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
    const profile: RegisterProfile = {firstName: firstName.trim(), lastName: lastName.trim(), username: normalizeUsername(username), email, birthDate: isoDob, sex, password};
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
  }, [step, otp, phone, email, isoDob, sex, firstName, lastName, username, password, district, verifyRegister, navigation]);

  /**
   * Quitter l'inscription (retour matériel, appui hors du tiroir, glissement vers le bas). Demande
   * confirmation dès que quelque chose a été saisi : ces trois gestes sont faciles à déclencher sans
   * le vouloir, et à l'étape 3 on perdrait un formulaire complet ET un code déjà envoyé. Sur un
   * formulaire vierge, en revanche, aucune raison de retenir qui que ce soit.
   */
  async function leaveRegistration() {
    const entered = identityTouched || accountTouched || otp.length > 0;
    if (entered) {
      const ok = await askConfirm({
        title: "Abandonner l'inscription ?",
        message: 'Les informations déjà saisies seront perdues.',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer',
        danger: true,
      });
      if (!ok) {
        return;
      }
    }
    navigation.navigate('Login', {startOpen: false});
  }

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
    <AuthCarouselDrawer
      startOpen
      hasCarousel={false}
      onBack={onBack}
      onRequestClose={leaveRegistration}
      steps={{current: step === 'identity' ? 1 : step === 'account' ? 2 : 3, total: 3}}>
      <CardHeading
        title="Créer mon compte"
        subtitle={
          (step === 'identity' && 'Étape 1 sur 3 — votre identité') ||
          (step === 'account' && 'Étape 2 sur 3 — votre accès') ||
          `Étape 3 sur 3 — code envoyé à ${email}`
        }
      />
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
              <AvailabilityHint
                status={uStatus}
                labels={{
                  available: '✓ Disponible',
                  taken: 'Déjà pris',
                  invalid: '3–30 caractères : lettres, chiffres, . _ -',
                }}
              />
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
            {!identityReady && identityTouched && (
              <Hint>Pour continuer, il manque {identityMissing.length > 1 ? 'encore' : ''} : {identityMissing.join(' · ')}.</Hint>
            )}
          </View>
        )}

        {step === 'account' && (
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Numéro de téléphone</FieldLabel>
              <PhoneField value={phone} onChangeText={setPhone} />
              <AvailabilityHint
                status={phoneStatus}
                labels={{
                  available: '✓ Numéro disponible',
                  taken: 'Ce numéro a déjà un compte',
                  invalid: 'Format attendu : 06 612 45 90',
                }}
              />
            </View>
            <View>
              <FieldLabel>Email</FieldLabel>
              <Field icon="mail" value={email} onChangeText={setEmail} placeholder="mireille@exemple.com" keyboardType="email-address" autoCapitalize="none" />
              <AvailabilityHint
                status={emailStatus}
                labels={{
                  available: '✓ Adresse disponible',
                  taken: 'Cette adresse a déjà un compte',
                  invalid: 'Adresse email invalide',
                }}
              />
              <Hint>Votre code de vérification arrivera par email.</Hint>
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
            {!accountReady && accountTouched && (
              <Hint>Pour recevoir le code, il manque {accountMissing.length > 1 ? 'encore' : ''} : {accountMissing.join(' · ')}.</Hint>
            )}
          </View>
        )}

        {step === 'otp' && (
          <View style={{gap: 16}}>
            {testCode && (
              <Banner tone="warning" title="Mode test (pas d'email réel)">
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
            {busy ? (
              <Hint center>Création de votre compte…</Hint>
            ) : (
              <Hint center>
                Code à 6 chiffres envoyé par email
                {validForMin !== null ? `, valable ${validForMin} minute${validForMin > 1 ? 's' : ''}` : ''}.
              </Hint>
            )}
          </View>
        )}

      <View style={{minHeight: 20}} />
      {step === 'identity' && <FootLink prefix="Déjà membre ?" action="Se connecter" onPress={() => navigation.navigate('Login', {startOpen: true})} />}
    </AuthCarouselDrawer>
  );
}

/**
 * Retour de disponibilité sous un champ — un seul composant pour le nom d'utilisateur, l'email et le
 * téléphone, afin que les trois parlent le même langage visuel. Seuls les libellés propres au champ
 * sont fournis par l'appelant ; « en cours » et « échec réseau » restent formulés ici, identiques
 * partout. `idle` n'affiche rien : un champ vide n'a pas à être commenté.
 */
function AvailabilityHint({
  status,
  labels,
}: {
  status: AvailabilityStatus;
  labels: {available: string; taken: string; invalid: string};
}) {
  const styles = useThemedStyles(makeStyles);
  const {colors} = useTheme();
  if (status === 'idle') {
    return null;
  }
  const map = {
    checking: {c: colors.textTertiary, t: 'Vérification…'},
    available: {c: colors.success, t: labels.available},
    taken: {c: colors.error, t: labels.taken},
    invalid: {c: colors.textTertiary, t: labels.invalid},
    error: {c: colors.error, t: 'Vérification impossible — vérifiez votre connexion'},
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
