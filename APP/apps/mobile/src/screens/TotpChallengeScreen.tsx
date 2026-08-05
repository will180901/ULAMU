/**
 * Vérification en deux étapes (TOTP) à la connexion. Deux voies :
 *  • code à 6 chiffres de l'application d'authentification (saisie auto-validée) ;
 *  • code de SECOURS (10 caractères hexadécimaux, à usage unique) si l'app n'est plus accessible —
 *    le backend l'accepte via checkTotpOrBackup (m01). Sans cette voie, perdre son téléphone =
 *    verrouillage définitif hors du compte.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AuthScreen, Badge, CobaltHeader, ErrorBanner, Field, FloatCard, HeaderIconBadge, HeaderSubtitle, HeaderTitle, Hint, OtpInput, PrimaryButton} from '../components/ui';
import {ApiError} from '../lib/api-client';
import {isValidOtp} from '../lib/validation';
import {AuthStackParamList} from '../navigation/types';
import {useAuth} from '../state/AuthContext';
import {colors, fonts} from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'TotpChallenge'>;

export function TotpChallengeScreen({route, navigation}: Props) {
  const {username, password} = route.params;
  const {loginPassword, activatePending} = useAuth();
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const ready = isValidOtp(code);

  const attempt = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      try {
        await loginPassword(username, password, value);
        // Comme les deux autres voies de connexion : entrée directe, sans écran intermédiaire.
        await activatePending();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Code invalide. Réessayez.');
        setCode('');
        tried.current = false;
      } finally {
        setBusy(false);
      }
    },
    [username, password, loginPassword, activatePending],
  );

  // Code TOTP à 6 chiffres : validation automatique dès la saisie complète.
  useEffect(() => {
    if (mode !== 'totp' || !ready || tried.current) {
      return;
    }
    tried.current = true;
    const t = setTimeout(() => attempt(code), 350);
    return () => clearTimeout(t);
  }, [ready, code, mode, attempt]);

  // Code de secours : 10 caractères hexadécimaux (on tolère espaces/tirets à la saisie).
  const submitBackup = () => {
    const normalized = backup.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    if (normalized.length < 8) {
      setError('Entrez votre code de secours (10 caractères).');
      return;
    }
    attempt(normalized);
  };

  const switchMode = (next: 'totp' | 'backup') => {
    setMode(next);
    setError(null);
    setCode('');
    setBackup('');
    tried.current = false;
  };

  return (
    <AuthScreen>
      <CobaltHeader onBack={() => navigation.goBack()} paddingBottom={32}>
        <HeaderIconBadge name="shield-check" />
        <HeaderTitle>Vérification en deux étapes</HeaderTitle>
        <HeaderSubtitle>
          {mode === 'totp'
            ? "Entrez le code à 6 chiffres de votre application d'authentification."
            : 'Entrez un de vos codes de secours à usage unique.'}
        </HeaderSubtitle>
      </CobaltHeader>

      <FloatCard>
        <ErrorBanner message={error} />

        {mode === 'totp' ? (
          <>
            <OtpInput value={code} onChange={setCode} />
            <View style={styles.statusRow}>
              {ready ? (
                <Badge tone="success" icon="check-circle">
                  Vérification…
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  En attente du code
                </Badge>
              )}
            </View>
            <Hint center>Ouvrez Google Authenticator, Authy ou FreeOTP pour obtenir votre code.</Hint>
            <Pressable onPress={() => switchMode('backup')} style={styles.link} hitSlop={8}>
              <Text style={styles.linkText}>Je n'ai pas accès à mon application — utiliser un code de secours</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Field icon="key" value={backup} onChangeText={setBackup} placeholder="Code de secours (ex. a3f9c2b1d4)" autoCapitalize="none" />
            <View style={{height: 12}} />
            <PrimaryButton title="Valider le code de secours" iconRight="check" loading={busy} onPress={submitBackup} />
            <Hint center>Chaque code de secours ne fonctionne qu'une seule fois.</Hint>
            <Pressable onPress={() => switchMode('totp')} style={styles.link} hitSlop={8}>
              <Text style={styles.linkText}>Revenir au code de l'application</Text>
            </Pressable>
          </>
        )}
      </FloatCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: {alignItems: 'center', marginTop: 18, marginBottom: 8},
  link: {alignItems: 'center', paddingVertical: 10, marginTop: 4},
  linkText: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.accent, textAlign: 'center'},
});
