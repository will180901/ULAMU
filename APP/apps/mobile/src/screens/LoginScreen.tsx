/**
 * Connexion patient — username + mot de passe (UX rapide). Si TOTP activé → étape de vérification.
 * Visuel : carrousel monochrome plein écran en fond + tiroir glissant contenant le formulaire.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {AuthCarouselDrawer} from '../components/AuthCarouselDrawer';
import {CardHeading, ErrorBanner, Field, FieldLabel, FootLink, PasswordField, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isValidUsername, normalizeUsername} from '../lib/validation';
import {AuthStackParamList} from '../navigation/types';
import {useAuth} from '../state/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props) {
  const {loginPassword} = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = isValidUsername(username) && password.length >= 1;

  async function onSubmit() {
    setError(null);
    const u = normalizeUsername(username);
    setBusy(true);
    try {
      const res = await loginPassword(u, password);
      if (res.totpRequired) {
        navigation.navigate('TotpChallenge', {username: u, password});
      } else {
        navigation.navigate('Success', {context: 'login'});
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCarouselDrawer>
      <CardHeading title="Connectez-vous sur ULAMU" subtitle="Votre nom d'utilisateur et votre mot de passe suffisent." />
      <ErrorBanner message={error} />
      <View style={{gap: 14}}>
        <View>
          <FieldLabel>Nom d'utilisateur</FieldLabel>
          <Field icon="user" value={username} onChangeText={setUsername} placeholder="mireille_n" autoCapitalize="none" />
        </View>
        <View>
          <FieldLabel>Mot de passe</FieldLabel>
          <PasswordField value={password} onChangeText={setPassword} onSubmitEditing={() => ready && onSubmit()} returnKeyType="go" />
        </View>
        <PrimaryButton title="Se connecter" iconRight="arrow-right" onPress={onSubmit} disabled={!ready} loading={busy} />
        <FootLink prefix="Mot de passe oublié ?" action="Réinitialiser" onPress={() => navigation.navigate('Forgot')} />
      </View>

      <View style={{minHeight: 24}} />
      <FootLink prefix="Nouveau sur ULAMU ?" action="Créer un compte" onPress={() => navigation.navigate('Register')} />
    </AuthCarouselDrawer>
  );
}
