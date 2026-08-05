/**
 * Inscription patient — RÉELLE. 3 étapes :
 *  1) Identité : prénom, nom, nom d'utilisateur (dispo en direct), naissance, sexe, arrondissement.
 *  2) Compte   : téléphone, email, mot de passe (+ confirmation), consentement → OTP par email (2026-07).
 *  3) OTP      : code email → création du compte (M01).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AuthPage} from '../components/AuthPage';
import {StepStack} from '../components/StepStack';
import {
  Badge,
  Banner,
  ErrorBanner,
  Field,
  FieldLabel,
  FieldState,
  FieldStatus,
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
import {useAbandonGuard} from '../state/useAbandonGuard';
import {AuthStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {RegisterProfile, useAuth} from '../state/AuthContext';
import {fonts, Palette, radius} from '../theme';
import {useThemedStyles} from '../state/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type Step = 'identity' | 'account' | 'otp';

const MIN_AGE = 18; // PM-16

export function RegisterScreen({navigation}: Props) {
  const styles = useThemedStyles(makeStyles);
  const {requestOtp, verifyRegister, state} = useAuth();
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

  // Résumés affichés dans les lignes repliées. On montre ce que l'utilisateur RECONNAÎT (son nom, son
  // âge, son quartier), jamais un identifiant technique — et surtout jamais le mot de passe.
  const age = isoDob ? Math.floor((Date.now() - new Date(isoDob).getTime()) / 31_557_600_000) : null;
  const identitySummary = [`${firstName.trim()} ${lastName.trim().toUpperCase()}`.trim(), age !== null ? `${age} ans` : null, district.trim()]
    .filter(Boolean)
    .join(' · ');
  const accountSummary = [phone.trim(), email.trim()].filter(Boolean).join(' · ');

  // Quitter l'inscription, quel que soit le geste employé — le tiroir les fait tous converger ici.
  const leaveRegistration = useAbandonGuard({
    dirty: identityTouched || accountTouched || otp.length > 0,
    title: "Abandonner l'inscription ?",
    message:
      step === 'otp'
        ? 'Les informations saisies seront perdues, et le code reçu par email ne sera plus utilisable.'
        : 'Les informations déjà saisies seront perdues.',
    onLeave: () => navigation.goBack(),
  });

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
   * Retour à une étape déjà franchie, depuis sa ligne de récapitulatif.
   *
   * Vide le code saisi si l'on quitte l'étape de vérification : le conserver ferait relancer tout seul
   * une validation (la saisie complète déclenche l'envoi automatiquement) avec un code qui ne
   * correspond plus aux informations qu'on revient justement corriger.
   */
  function goToStep(target: Step) {
    setError(null);
    if (step === 'otp' && target !== 'otp') {
      setOtp('');
      otpTried.current = false;
    }
    setStep(target);
  }

  return (
    <AuthPage
      // Le titre porte l'OBJECTIF, constant ; le nom de chaque étape est porté par la pile en dessous.
      title="Créer mon compte"
      subtitle={
        step === 'identity'
          ? 'Ces informations constitueront votre dossier médical à vie.'
          : step === 'account'
            ? 'De quoi vous connecter et récupérer votre compte.'
            : `Code à 6 chiffres envoyé à ${email}.`
      }
      // Quitter l'inscription — avec confirmation si quelque chose a été saisi. Le recul d'ÉTAPE, lui,
      // se fait en tapant la ligne de résumé de l'étape voulue : deux gestes, deux intentions distinctes.
      onBack={leaveRegistration}>
      <ErrorBanner message={error} />

      <StepStack
        steps={[
          {key: 'identity', label: 'Qui êtes-vous ?', summary: identitySummary},
          {key: 'account', label: 'Vos accès', summary: accountSummary},
          {key: 'otp', label: 'Vérification'},
        ]}
        current={step}
        onGoTo={goToStep}>

        {step === 'identity' && (
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Prénom</FieldLabel>
              <Field icon="user" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            </View>
            <View>
              <FieldLabel>Nom</FieldLabel>
              <Field icon="user" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </View>
            <View>
              <FieldLabel>Nom d'utilisateur</FieldLabel>
              <Field icon="user" value={username} onChangeText={setUsername} autoCapitalize="none" state={fieldStateOf(uStatus)} />
              <AvailabilityHint
                status={uStatus}
                labels={{
                  available: 'Disponible',
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
              <Field icon="map-pin" value={district} onChangeText={setDistrict} autoCapitalize="words" />
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
                  available: 'Numéro disponible',
                  taken: 'Ce numéro a déjà un compte',
                  invalid: 'Format attendu : 06 612 45 90',
                }}
              />
            </View>
            <View>
              <FieldLabel>Email</FieldLabel>
              <Field icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" state={fieldStateOf(emailStatus)} />
              <AvailabilityHint
                status={emailStatus}
                labels={{
                  available: 'Adresse disponible',
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

      </StepStack>

      {step === 'identity' && <FootLink prefix="Déjà membre ?" action="Se connecter" onPress={() => navigation.goBack()} />}
    </AuthPage>
  );
}

/** Traduit un statut de disponibilité en état visuel de champ (bordure). `checking` reste neutre :
 * colorer un champ pendant qu'on interroge le serveur ferait clignoter la bordure à chaque frappe. */
function fieldStateOf(status: AvailabilityStatus): FieldState {
  if (status === 'available') {
    return 'success';
  }
  if (status === 'taken' || status === 'invalid' || status === 'error') {
    return 'error';
  }
  return 'default';
}

/**
 * Retour de disponibilité sous un champ — nom d'utilisateur, email, téléphone. Ne fait plus que
 * TRADUIRE un statut en libellé : le rendu est délégué à `FieldStatus`, si bien que ces trois champs
 * s'affichent exactement comme toutes les autres aides et erreurs de l'app (icône + texte, jamais la
 * couleur seule). Seuls les libellés propres au champ viennent de l'appelant ; « en cours » et « échec
 * réseau » restent formulés ici, identiques partout.
 *
 * `idle` n'affiche rien : un champ vide n'a pas à être commenté.
 */
function AvailabilityHint({
  status,
  labels,
}: {
  status: AvailabilityStatus;
  labels: {available: string; taken: string; invalid: string};
}) {
  if (status === 'idle') {
    return null;
  }
  const map = {
    checking: {tone: 'checking' as const, text: 'Vérification…'},
    available: {tone: 'success' as const, text: labels.available},
    taken: {tone: 'error' as const, text: labels.taken},
    invalid: {tone: 'hint' as const, text: labels.invalid},
    error: {tone: 'error' as const, text: 'Vérification impossible — vérifiez votre connexion'},
  }[status];
  return <FieldStatus tone={map.tone}>{map.text}</FieldStatus>;
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
