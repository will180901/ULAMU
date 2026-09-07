/**
 * Connexion patient — identifiant (nom d'utilisateur OU email) + mot de passe.
 *
 * Page plein écran depuis la refonte : le formulaire n'est plus un tiroir glissant. On y arrive par
 * « Rejoindre » depuis le carrousel, on en repart par la flèche ou le bouton retour du téléphone, qui
 * font strictement la même chose.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {AuthPage} from '../components/AuthPage';
import {ErrorBanner, Field, FieldLabel, FieldStatus, FootLink, PasswordField, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {proposerLeRecours} from '../lib/recours';
import {isValidEmail, isValidUsername, normalizeEmail, normalizeUsername} from '../lib/validation';
import {AuthStackParamList} from '../navigation/types';
import {useAuth} from '../state/AuthContext';
import {useSlowRequest} from '../state/useSlowRequest';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props) {
  const {loginPassword, activatePending} = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  /*
    ── Le recours d'un compte exclu (chantier 63, 07/09/2026) ────────────────────────────────────

    ⚠️ Le serveur invite un compte suspendu à « contacter le support pour connaître le motif et les
    voies de recours » — puis la garde refuse chacune de ses requêtes, et la seule voie de support
    exigeait une session. L'invitation était écrite et impraticable.

    C'est ICI qu'il faut ouvrir la porte : c'est le dernier écran que cette personne atteint.
  */
  const [recoursPossible, setRecoursPossible] = useState(false);
  const [busy, setBusy] = useState(false);
  const slow = useSlowRequest(busy);

  // L'identifiant accepte les deux formes : on route sur l'une ou l'autre selon la présence d'un « @ »,
  // exactement comme le fait le serveur.
  const looksLikeEmail = identifier.includes('@');
  const identifierValid = looksLikeEmail ? isValidEmail(identifier) : isValidUsername(identifier);
  const ready = identifierValid && password.length >= 1;

  async function onSubmit() {
    setError(null);
    setRecoursPossible(false);
    const id = looksLikeEmail ? normalizeEmail(identifier) : normalizeUsername(identifier);
    setBusy(true);
    try {
      const res = await loginPassword(id, password);
      if (res.otpRequired) {
        navigation.navigate('LoginOtp', {username: id, password, debugCode: res.debugCode});
      } else if (res.totpRequired) {
        navigation.navigate('TotpChallenge', {username: id, password});
      } else {
        // Pas d'écran intermédiaire à la CONNEXION : on entre directement dans l'app. Un « Connexion
        // réussie » suivi d'un bouton n'apprend rien de plus que l'app elle-même, et coûtait un appui
        // à chaque ouverture. L'écran de succès reste réservé à l'INSCRIPTION, qui est un vrai jalon.
        await activatePending();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez votre réseau et réessayez.');
      setRecoursPossible(proposerLeRecours(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage
      title="Bon retour"
      subtitle="Connectez-vous pour retrouver votre dossier médical et vos consultations."
      onBack={() => navigation.goBack()}>
      <ErrorBanner message={error} />

      <View>
        <FieldLabel>Identifiant</FieldLabel>
        <Field
          icon="user"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType={looksLikeEmail ? 'email-address' : 'default'}
          returnKeyType="next"
        />
        <FieldStatus tone="hint">Votre nom d'utilisateur ou votre adresse email</FieldStatus>
      </View>

      <View>
        <FieldLabel>Mot de passe</FieldLabel>
        <PasswordField value={password} onChangeText={setPassword} onSubmitEditing={() => ready && onSubmit()} returnKeyType="go" />
      </View>

      <View style={{gap: 10}}>
        <PrimaryButton title="Se connecter" iconRight="arrow-right" onPress={onSubmit} disabled={!ready} loading={busy} />
        {/* Le serveur d'ULAMU s'endort après un quart d'heure sans trafic et met près d'une minute à
            repartir. Sans ce message, l'utilisateur ne voit qu'un rond qui tourne et referme l'app. */}
        {slow ? <FieldStatus tone="hint">Le serveur se réveille — cela peut prendre jusqu'à une minute.</FieldStatus> : null}
      </View>

      {/*
        Proposé seulement quand le refus vient du COMPTE (403) — pas d'un mot de passe faux (401) ni
        d'un réseau coupé. Voir `lib/recours.ts` : la règle y vit pour être éprouvée, et parce que le
        web devra dire exactement la même chose.
      */}
      {recoursPossible ? (
        <FootLink
          prefix="Votre compte est bloqué ?"
          action="Écrire à l'administration"
          onPress={() => navigation.navigate('Recours', {email: looksLikeEmail ? normalizeEmail(identifier) : undefined})}
        />
      ) : null}

      <FootLink prefix="Mot de passe oublié ?" action="Réinitialiser" onPress={() => navigation.navigate('Forgot')} />
      <FootLink prefix="Nouveau sur ULAMU ?" action="Créer un compte" onPress={() => navigation.navigate('Register')} />
    </AuthPage>
  );
}
