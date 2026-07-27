/**
 * Mot de passe oublié (M01, CU-01-04) — flux PUBLIC en 3 étapes :
 *  1) Email → demande d'un code de réinitialisation (2026-07 : par email, plus par SMS).
 *  2) Code OTP → saisie du code reçu (pas d'appel serveur séparé de vérification : l'API n'expose pas
 *     de « vérifier l'OTP seul », la vérification réelle a lieu à l'étape 3 avec le mot de passe ; si le
 *     code est faux, l'erreur apparaît à l'étape 3 au moment de « Réinitialiser »).
 *  3) Nouveau mot de passe + confirmation → `POST /auth/password-reset` (email+otpCode+newPassword) ;
 *     la réinitialisation révoque toutes les sessions. En dev, le code s'affiche dans la console de l'API.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {BackHandler, View} from 'react-native';
import {AuthCarouselDrawer} from '../components/AuthCarouselDrawer';
import {Banner, CardHeading, ErrorBanner, Field, FieldLabel, FootLink, PasswordField, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isValidEmail, normalizeEmail} from '../lib/validation';
import {api} from '../services/api';
import {AuthStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Forgot'>;
type Step = 'email' | 'otp' | 'reset';

export function ForgotScreen({navigation}: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null); // mode test : code renvoyé par le serveur (pas d'email réel)
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Adresse email invalide.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestOtp({email: normalizeEmail(email), purpose: 'PASSWORD_RESET'});
      setStep('otp');
      if (res.debugCode) {
        setTestCode(res.debugCode);
        setCode(res.debugCode);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setError(null);
    if (code.length < 6 || password.length < 8 || password !== confirm) {
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword({email: normalizeEmail(email), otpCode: code, newPassword: password});
      navigation.navigate('Login', {startOpen: true});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible. Vérifiez le code.');
    } finally {
      setBusy(false);
    }
  }

  function onBack() {
    setError(null);
    if (step === 'reset') {
      setStep('otp');
    } else if (step === 'otp') {
      setStep('email');
    } else {
      navigation.goBack();
    }
  }

  // Pas de flèche retour visible dans le tiroir : le geste/bouton retour Android recule d'une étape
  // (email←otp←reset) au lieu de quitter directement l'écran — même logique que la flèche retirée.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  });

  return (
    <AuthCarouselDrawer startOpen hasCarousel={false}>
      {step === 'email' && (
        <>
          <CardHeading title="Mot de passe oublié" subtitle="Entrez votre email : un code de réinitialisation vous sera envoyé." />
          <ErrorBanner message={error} />
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Email</FieldLabel>
              <Field icon="mail" value={email} onChangeText={setEmail} placeholder="mireille@exemple.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <PrimaryButton title="Recevoir le code" iconRight="arrow-right" loading={busy} disabled={!isValidEmail(email)} onPress={requestCode} />
          </View>
        </>
      )}

      {step === 'otp' && (
        <>
          <CardHeading title="Code de vérification" subtitle={`Entrez le code à 6 chiffres envoyé à ${email}.`} />
          <ErrorBanner message={error} />
          {testCode && (
            <Banner tone="warning" title="Mode test (pas d'email réel)">
              Votre code : {testCode} — déjà pré-rempli ci-dessous.
            </Banner>
          )}
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Code reçu par email</FieldLabel>
              <Field icon="lock" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
            </View>
            <PrimaryButton title="Continuer" iconRight="arrow-right" disabled={code.length < 6} onPress={() => setStep('reset')} />
          </View>
        </>
      )}

      {step === 'reset' && (
        <>
          <CardHeading title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe et confirmez-le." />
          <ErrorBanner message={error} />
          <View style={{gap: 14}}>
            <View>
              <FieldLabel>Nouveau mot de passe</FieldLabel>
              <PasswordField value={password} onChangeText={setPassword} placeholder="8 caractères minimum" />
            </View>
            <View>
              <FieldLabel>Confirmer le mot de passe</FieldLabel>
              <PasswordField value={confirm} onChangeText={setConfirm} placeholder="Retapez votre mot de passe" onSubmitEditing={reset} returnKeyType="go" />
            </View>
            <PrimaryButton
              title="Réinitialiser"
              iconRight="check"
              loading={busy}
              disabled={password.length < 8 || password !== confirm}
              onPress={reset}
            />
          </View>
        </>
      )}

      <View style={{minHeight: 24}} />
      <FootLink prefix="Vous vous souvenez ?" action="Se connecter" onPress={() => navigation.navigate('Login', {startOpen: true})} />
    </AuthCarouselDrawer>
  );
}
