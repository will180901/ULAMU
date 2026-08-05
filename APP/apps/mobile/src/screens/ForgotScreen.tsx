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
import React, {useState} from 'react';
import {View} from 'react-native';
import {AuthPage} from '../components/AuthPage';
import {useDialog} from '../components/Dialog';
import {Banner, ErrorBanner, Field, FieldLabel, FieldStatus, FootLink, OtpInput, PasswordField, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isValidEmail, normalizeEmail} from '../lib/validation';
import {api} from '../services/api';
import {AuthStackParamList} from '../navigation/types';
import {useAbandonGuard} from '../state/useAbandonGuard';

type Props = NativeStackScreenProps<AuthStackParamList, 'Forgot'>;
type Step = 'email' | 'otp' | 'reset';

export function ForgotScreen({navigation}: Props) {
  // `alert` seulement : `confirm` entrerait en collision avec l'état du champ de confirmation.
  const {alert} = useDialog();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null); // mode test : code renvoyé par le serveur (pas d'email réel)
  const [validForMin, setValidForMin] = useState<number | null>(null); // durée réelle renvoyée par l'API (PM-17), pas une valeur codée en dur
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
      setValidForMin(Math.max(1, Math.round(res.expiresInSeconds / 60)));
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
      // Confirmation explicite avant de rendre la main. Sans elle, la réinitialisation ramenait
      // l'utilisateur sur la connexion sans un mot : rien ne distinguait un mot de passe changé d'un
      // écran quitté par erreur — et la réinitialisation révoque toutes les sessions, ce n'est pas un
      // détail qu'on annonce en silence.
      await alert({title: 'Mot de passe modifié', message: 'Connectez-vous avec votre nouveau mot de passe.'});
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible. Vérifiez le code.');
    } finally {
      setBusy(false);
    }
  }

  /** Quitter la réinitialisation. Le message change une fois le code envoyé : à partir de là, ce n'est
   * plus seulement de la saisie qu'on perd, c'est un code qu'il faudra redemander (quota PM-19). */
  const leaveReset = useAbandonGuard({
    dirty: [email, code, password, confirm].some(v => v.trim().length > 0),
    title: 'Abandonner la réinitialisation ?',
    message:
      step === 'email'
        ? 'Les informations déjà saisies seront perdues.'
        : 'Le code reçu par email ne sera plus utilisable : il faudra en redemander un.',
    onLeave: () => navigation.goBack(),
  });

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

  return (
    <AuthPage
      title={step === 'email' ? 'Mot de passe oublié' : step === 'otp' ? 'Code de vérification' : 'Nouveau mot de passe'}
      subtitle={
        step === 'email'
          ? 'Entrez votre email : un code de réinitialisation vous sera envoyé.'
          : step === 'otp'
            ? `Entrez le code à 6 chiffres envoyé à ${email}.`
            : 'Choisissez un nouveau mot de passe et confirmez-le.'
      }
      onBack={step === 'email' ? leaveReset : onBack}
      steps={{current: step === 'email' ? 1 : step === 'otp' ? 2 : 3, total: 3}}>
      <ErrorBanner message={error} />

      {step === 'email' && (
        <>
          <View>
            <FieldLabel>Email</FieldLabel>
            <Field icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <FieldStatus tone="hint">L'adresse rattachée à votre compte ULAMU</FieldStatus>
          </View>
          <PrimaryButton title="Recevoir le code" iconRight="arrow-right" loading={busy} disabled={!isValidEmail(email)} onPress={requestCode} />
        </>
      )}

      {step === 'otp' && (
        <>
          {testCode && (
            <Banner tone="warning" title="Mode test (pas d'email réel)">
              Votre code : {testCode} — déjà pré-rempli ci-dessous.
            </Banner>
          )}
          <View>
            <FieldLabel>Code reçu par email</FieldLabel>
            <OtpInput value={code} onChange={setCode} />
            {validForMin !== null && (
              <FieldStatus tone="hint">
                Code valable {validForMin} minute{validForMin > 1 ? 's' : ''}. Passé ce délai, demandez-en un nouveau.
              </FieldStatus>
            )}
          </View>
          <PrimaryButton title="Continuer" iconRight="arrow-right" disabled={code.length < 6} onPress={() => setStep('reset')} />
        </>
      )}

      {step === 'reset' && (
        <>
          <View>
            <FieldLabel>Nouveau mot de passe</FieldLabel>
            <PasswordField value={password} onChangeText={setPassword} />
            <FieldStatus tone="hint">8 caractères minimum, avec au moins une lettre et un chiffre</FieldStatus>
          </View>
          <View>
            <FieldLabel>Confirmer le mot de passe</FieldLabel>
            <PasswordField value={confirm} onChangeText={setConfirm} onSubmitEditing={reset} returnKeyType="go" />
          </View>
          <PrimaryButton
            title="Réinitialiser"
            iconRight="check"
            loading={busy}
            disabled={password.length < 8 || password !== confirm}
            onPress={reset}
          />
        </>
      )}

      {/* Même sortie que le bouton retour de la première étape : passe par le garde-fou, sinon un code
          déjà envoyé était perdu en silence (quota PM-19). */}
      <FootLink prefix="Vous vous souvenez ?" action="Se connecter" onPress={leaveReset} />
    </AuthPage>
  );
}
