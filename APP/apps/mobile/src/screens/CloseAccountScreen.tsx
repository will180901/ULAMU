/**
 * Clôture de compte (M01, CU-01-07) : confirmation par mot de passe + OTP. Le compte passe CLOSED,
 * toutes les sessions sont révoquées, reconnexion refusée (réactivation possible 30 j, PM-21).
 * Étape 1 → `POST /accounts/me/close/request-otp` ; étape 2 → `…/close` (code visible console API en dev).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Banner, Field, IconButton, PasswordField, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {useAuth} from '../state/AuthContext';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function CloseAccountScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'CloseAccount'>) {
  const {colors, scheme} = useTheme();
  const {alert, confirm} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const {logout} = useAuth();
  const [step, setStep] = useState<'intro' | 'confirm'>('intro');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    setBusy(true);
    try {
      await api.requestCloseOtp();
      setStep('confirm');
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (
      !(await confirm({
        title: 'Clôturer définitivement ?',
        message: 'Votre compte sera fermé et toutes vos sessions déconnectées.',
        confirmLabel: 'Clôturer',
        cancelLabel: 'Annuler',
        danger: true,
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.closeAccount({password, otpCode: code});
      await alert({title: 'Compte clôturé', message: 'Votre compte a été fermé. Vous allez être déconnecté.'});
      logout();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Clôture impossible — vérifiez vos informations.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Clôturer mon compte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Banner tone="warning" title="Cette action ferme votre compte">
          Vos données restent conservées selon la loi (carnet à vie). Vous pourrez réactiver votre compte dans les 30 jours.
        </Banner>

        {step === 'intro' ? (
          <PrimaryButton title="Recevoir le code de confirmation" iconRight="arrow-right" loading={busy} onPress={requestCode} />
        ) : (
          <>
            <Text style={styles.label}>Votre mot de passe</Text>
            <PasswordField value={password} onChangeText={setPassword} />
            <Text style={styles.label}>Code reçu par SMS</Text>
            <Field icon="lock" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
            <Pressable onPress={close} disabled={!password || code.length < 6 || busy} style={[styles.dangerBtn, (!password || code.length < 6 || busy) && styles.dangerOff]}>
              <Icon name="log-out" size={16} color="#fff" />
              <Text style={styles.dangerText}>Clôturer mon compte</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
  content: {padding: 16, gap: 12},
  label: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginTop: 4},
  dangerBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.errorDot, borderRadius: radius.button, paddingVertical: 14, marginTop: 6},
  dangerOff: {opacity: 0.5},
  dangerText: {fontFamily: fonts.body, fontWeight: '700', fontSize: 14, color: '#fff'},
});
