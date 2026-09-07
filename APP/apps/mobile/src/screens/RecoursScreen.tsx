/**
 * Écrire à l'administration sans pouvoir se connecter — chantier 63, 07/09/2026 (CU-16-04).
 *
 * ── Le défaut que cet écran répare ─────────────────────────────────────────────────────────────
 *
 * Un compte suspendu reçoit *« Contactez le support pour connaître le motif et les voies de
 * recours »*, et un compte clôturé lit *« contactez le support »* à la connexion. Mais la garde
 * refuse **chacune** de leurs requêtes, la seule voie de support existante exigeait une session, et
 * l'adresse des mentions légales n'existe pas.
 *
 * ⚠️ **Une personne exclue était invitée par écrit à exercer un recours qu'aucun chemin ne lui
 * permettait d'exercer.** Sur une plateforme de santé, et au regard de la loi n° 29-2019 acceptée à
 * l'inscription, ce n'est pas un défaut d'ergonomie.
 *
 * ── Pourquoi un code, et pas une session ───────────────────────────────────────────────────────
 *
 * On ne délivre pas de jeton à un compte suspendu : ce serait lui retirer le sens qu'il a. On
 * demande une **preuve** — un code envoyé à l'adresse du compte, que seul son titulaire relève.
 * Cela n'ouvre aucun pouvoir nouveau : qui relève cette boîte pouvait déjà réinitialiser le mot de
 * passe.
 *
 * ── Pourquoi la réponse arrive par email ───────────────────────────────────────────────────────
 *
 * La réponse habituelle se lit DANS l'application. Ici, la personne ne peut pas l'ouvrir : la
 * déposer là reviendrait à la mettre dans un endroit qu'elle ne peut pas atteindre — exactement le
 * défaut qu'on répare côté écriture. L'écran l'annonce avant d'envoyer.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {AuthPage} from '../components/AuthPage';
import {Banner, ErrorBanner, Field, FieldLabel, FieldStatus, OtpInput, PrimaryButton} from '../components/ui';
import {Icon} from '../components/Icon';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {SupportSubject, SUPPORT_BODY_MAX} from '../lib/contracts';
import {demandeEnvoyable, SUJETS_OFFERTS} from '../lib/support';
import {isValidEmail, isValidOtp, normalizeEmail} from '../lib/validation';
import {AuthStackParamList} from '../navigation/types';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {useHardwareBack} from '../state/useHardwareBack';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Recours'>;

export function RecoursScreen({navigation, route}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  // L'adresse vient de l'écran de connexion quand on y avait tapé une adresse : ne pas la redemander
  // à quelqu'un qui vient de la saisir.
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [step, setStep] = useState<'email' | 'demande'>('email');
  const [code, setCode] = useState('');
  const [sujet, setSujet] = useState<SupportSubject>('OTHER');
  const [texte, setTexte] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);

  const partir = useAbandonGuard({
    dirty: texte.trim().length > 0 || code.length > 0,
    title: 'Abandonner cette demande ?',
    message: 'Ce que vous avez écrit sera effacé, et le code reçu ne sera plus utilisable.',
    onLeave: () => navigation.goBack(),
  });
  useHardwareBack(partir);

  const demanderCode = async () => {
    if (!isValidEmail(email)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp({email: normalizeEmail(email), purpose: 'SUPPORT_ACCESS'});
      setStep('demande');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Le code n’a pas pu être envoyé. Réessayez dans un moment.');
    } finally {
      setBusy(false);
    }
  };

  const envoyer = async () => {
    if (!isValidOtp(code) || !demandeEnvoyable(texte)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createSupportRequestWithoutSession({
        email: normalizeEmail(email),
        otpCode: code,
        subject: sujet,
        body: texte.trim(),
      });
      setTexte('');
      setCode('');
      setEnvoyee(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Votre demande n’a pas pu être envoyée. Réessayez dans un moment.');
    } finally {
      setBusy(false);
    }
  };

  if (envoyee) {
    return (
      <AuthPage title="Demande envoyée" subtitle="L’administration l’examinera." onBack={() => navigation.goBack()}>
        <Banner tone="success" title="Votre demande est enregistrée">
          La réponse vous sera envoyée <Text style={styles.fort}>par email</Text>, à l’adresse de votre compte — vous
          n’avez pas besoin de pouvoir vous connecter pour la lire.
        </Banner>
        <PrimaryButton title="Revenir à la connexion" iconRight="arrow-right" onPress={() => navigation.goBack()} />
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Écrire à l’administration"
      subtitle="Pour contester une suspension, ou demander de l’aide quand la connexion vous est refusée."
      onBack={partir}>
      <ErrorBanner message={error} />

      {step === 'email' ? (
        <>
          <View>
            <FieldLabel>Adresse email de votre compte</FieldLabel>
            <Field icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <FieldStatus tone="hint">Un code y sera envoyé — c’est ce qui prouve que le compte est le vôtre.</FieldStatus>
          </View>
          <PrimaryButton
            title="Recevoir un code"
            iconRight="send"
            onPress={demanderCode}
            disabled={!isValidEmail(email)}
            loading={busy}
          />
        </>
      ) : (
        <>
          <View>
            <FieldLabel>Code reçu par email</FieldLabel>
            <OtpInput value={code} onChange={setCode} />
          </View>

          <View>
            <FieldLabel>De quoi s’agit-il ?</FieldLabel>
            {SUJETS_OFFERTS.map(s => {
              const choisi = sujet === s.cle;
              return (
                <Pressable
                  key={s.cle}
                  onPress={() => setSujet(s.cle)}
                  style={[styles.sujet, choisi && styles.sujetOn]}
                  accessibilityRole="radio"
                  accessibilityState={{selected: choisi}}>
                  <Icon name={choisi ? 'check-circle' : 'plus'} size={15} color={choisi ? colors.accent : colors.textTertiary} />
                  <Text style={styles.sujetLabel}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View>
            <FieldLabel>Votre demande</FieldLabel>
            <TextInput
              style={styles.textArea}
              value={texte}
              onChangeText={setTexte}
              placeholder="Décrivez votre situation en quelques phrases."
              placeholderTextColor={colors.textDisabled}
              multiline
              textAlignVertical="top"
              maxLength={SUPPORT_BODY_MAX}
            />
            <FieldStatus tone="hint">
              N’écrivez pas votre mot de passe : l’administration ne vous le demandera jamais.
            </FieldStatus>
          </View>

          {/* Dit AVANT d'envoyer : c'est ce qui décide d'écrire ou d'attendre d'avoir accès à sa boîte. */}
          <Banner tone="info" title="La réponse arrivera par email">
            Vous ne pouvez pas vous connecter : elle vous sera donc envoyée à l’adresse de votre compte, et non
            déposée dans l’application.
          </Banner>

          <PrimaryButton
            title="Envoyer ma demande"
            iconRight="send"
            onPress={envoyer}
            disabled={!isValidOtp(code) || !demandeEnvoyable(texte)}
            loading={busy}
          />
        </>
      )}
    </AuthPage>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    fort: {fontWeight: '700', color: colors.textPrimary},
    sujet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginTop: 6,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    sujetOn: {borderColor: colors.accent, backgroundColor: colors.bgMuted},
    sujetLabel: {flex: 1, fontFamily: fonts.body, fontSize: 13.5, fontWeight: '600', color: colors.textPrimary},
    textArea: {
      minHeight: 110,
      marginTop: 6,
      padding: 11,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      fontFamily: fonts.body,
      fontSize: 13.5,
      color: colors.textPrimary,
    },
  });
