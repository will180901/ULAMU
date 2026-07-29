/**
 * 2e facteur à la connexion — code reçu par EMAIL (M01). C'est la double authentification du mobile :
 * le TOTP (application d'authentification) est réservé à la version web.
 *
 * On arrive ici quand `login` a répondu `otpRequired` : le mot de passe était bon, mais aucune session
 * n'est ouverte tant que le code n'est pas fourni. Le code a DÉJÀ été envoyé par le serveur à ce
 * moment-là — inutile d'en redemander un en arrivant.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {AuthCarouselDrawer} from '../components/AuthCarouselDrawer';
import {Banner, CardHeading, ErrorBanner, FieldLabel, FootLink, Hint, OtpInput, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {AuthStackParamList} from '../navigation/types';
import {useAuth} from '../state/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginOtp'>;

export function LoginOtpScreen({navigation, route}: Props) {
  const {username, password, debugCode} = route.params;
  const {loginPassword, activatePending} = useAuth();
  const [code, setCode] = useState(debugCode ?? '');
  const [testCode, setTestCode] = useState<string | null>(debugCode ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit() {
    if (code.length < 6) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await loginPassword(username, password, undefined, code);
      if (res.otpRequired) {
        // Le serveur redemande un code : celui saisi n'a pas été accepté (expiré, déjà consommé…).
        setError('Code non valide. Vérifiez votre boîte mail ou demandez-en un nouveau.');
        setCode('');
        return;
      }
      await activatePending();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vérification impossible. Réessayez.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  /** Renvoyer un code = refaire une tentative de connexion : le serveur en émet un nouveau. */
  async function resend() {
    setError(null);
    setBusy(true);
    try {
      const res = await loginPassword(username, password);
      // Le serveur ne valide que le PLUS RÉCENT des codes non consommés : celui affiché/saisi jusqu'ici
      // vient d'être périmé par ce renvoi. Sans ces deux lignes, l'écran continuait d'afficher l'ancien
      // code en mode test — donc systématiquement refusé après un « Renvoyer ».
      setCode(res.debugCode ?? '');
      setTestCode(res.debugCode ?? null);
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCarouselDrawer
      startOpen
      hasCarousel={false}
      onBack={() => navigation.goBack()}
      onRequestClose={() => navigation.navigate('Login', {startOpen: false})}>
      <CardHeading title="Vérification en deux étapes" subtitle="Un code à 6 chiffres vient d'être envoyé à l'adresse email de votre compte." />
      <ErrorBanner message={error} />
      {testCode && (
        <Banner tone="warning" title="Mode test (pas d'email réel)">
          Votre code : {testCode} — déjà pré-rempli ci-dessous.
        </Banner>
      )}
      <View style={{gap: 14}}>
        <View>
          <FieldLabel>Code reçu par email</FieldLabel>
          <OtpInput value={code} onChange={setCode} />
        </View>
        <Hint center>{resent ? 'Nouveau code envoyé.' : 'Le code est valable quelques minutes seulement.'}</Hint>
        <PrimaryButton title="Se connecter" iconRight="arrow-right" loading={busy} disabled={code.length < 6} onPress={submit} />
        <FootLink prefix="Code non reçu ?" action="Renvoyer" onPress={resend} />
      </View>
    </AuthCarouselDrawer>
  );
}
