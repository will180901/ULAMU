/**
 * Mot de passe oublié (M01, CU-01-04) — flux PUBLIC : téléphone → OTP SMS (PASSWORD_RESET) →
 * nouveau mot de passe. `POST /accounts/otp/request` puis `POST /auth/password-reset` ; la
 * réinitialisation révoque toutes les sessions. En dev, le code s'affiche dans la console de l'API.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {
  AuthScreen,
  Banner,
  CardHeading,
  CobaltHeader,
  ErrorBanner,
  Field,
  FieldLabel,
  FloatCard,
  FootLink,
  PasswordField,
  PrimaryButton,
} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {AuthStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Forgot'>;

export function ForgotScreen({navigation}: Props) {
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [local, setLocal] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null); // mode test : code renvoyé par le serveur (pas de SMS)
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const phone = `+242${local.replace(/\D/g, '')}`;

  async function requestCode() {
    setError(null);
    if (local.replace(/\D/g, '').length < 9) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestOtp({phone, purpose: 'PASSWORD_RESET'});
      setStep('reset');
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
    if (code.length < 6 || password.length < 8) {
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword({phone, otpCode: code, newPassword: password});
      navigation.navigate('Login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réinitialisation impossible. Vérifiez le code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <CobaltHeader paddingBottom={28} onBack={() => navigation.goBack()} />
      <FloatCard>
        {step === 'phone' ? (
          <>
            <CardHeading title="Mot de passe oublié" subtitle="Entrez votre numéro : un code de réinitialisation vous sera envoyé." />
            <ErrorBanner message={error} />
            <View style={{gap: 14}}>
              <View>
                <FieldLabel>Numéro de téléphone</FieldLabel>
                <Field icon="phone" value={local} onChangeText={t => setLocal(t.replace(/\D/g, '').slice(0, 9))} placeholder="06 612 45 90" keyboardType="phone-pad" />
              </View>
              <PrimaryButton title="Recevoir le code" iconRight="arrow-right" loading={busy} disabled={local.replace(/\D/g, '').length < 9} onPress={requestCode} />
            </View>
          </>
        ) : (
          <>
            <CardHeading title="Nouveau mot de passe" subtitle={`Code envoyé au ${phone}. Choisissez un nouveau mot de passe.`} />
            <ErrorBanner message={error} />
            {testCode && (
              <Banner tone="warning" title="Mode test (pas de SMS)">
                Votre code : {testCode} — déjà pré-rempli ci-dessous.
              </Banner>
            )}
            <View style={{gap: 14}}>
              <View>
                <FieldLabel>Code reçu par SMS</FieldLabel>
                <Field icon="lock" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
              </View>
              <View>
                <FieldLabel>Nouveau mot de passe</FieldLabel>
                <PasswordField value={password} onChangeText={setPassword} placeholder="8 caractères minimum" onSubmitEditing={reset} returnKeyType="go" />
              </View>
              <PrimaryButton title="Réinitialiser" iconRight="check" loading={busy} disabled={code.length < 6 || password.length < 8} onPress={reset} />
            </View>
          </>
        )}

        <View style={{flex: 1, minHeight: 24}} />
        <FootLink prefix="Vous vous souvenez ?" action="Se connecter" onPress={() => navigation.navigate('Login')} />
      </FloatCard>
    </AuthScreen>
  );
}
