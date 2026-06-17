/**
 * Changement de numéro (M01, EF-01-07 / parade T-01) : OTP sur l'ANCIEN ET le NOUVEAU numéro.
 * Étape 1 → `POST /accounts/me/phone-change/start` (envoie les deux OTP) ; étape 2 → `…/confirm`
 * avec les deux codes. En dev, les codes s'affichent dans la console de l'API.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Banner, Field, IconButton, PhoneField, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function PhoneChangeScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'PhoneChange'>) {
  const {colors, scheme} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [step, setStep] = useState<'phone' | 'codes'>('phone');
  const [local, setLocal] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [busy, setBusy] = useState(false);

  const newPhone = `+242${local.replace(/\D/g, '')}`;

  const start = async () => {
    if (local.replace(/\D/g, '').length < 9) {
      return;
    }
    setBusy(true);
    try {
      await api.startPhoneChange({newPhone});
      setStep('codes');
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (oldCode.length < 6 || newCode.length < 6) {
      return;
    }
    setBusy(true);
    try {
      await api.confirmPhoneChange({newPhone, oldPhoneCode: oldCode, newPhoneCode: newCode});
      await alert({title: 'Numéro modifié', message: 'Votre numéro de téléphone a bien été remplacé.'});
      navigation.goBack();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Confirmation impossible — vérifiez les codes.'});
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
        <Text style={styles.headerTitle}>Changer de numéro</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>Votre nouveau numéro</Text>
            <Text style={styles.sub}>Pour votre sécurité, un code sera envoyé à votre ancien ET votre nouveau numéro.</Text>
            <PhoneField value={local} onChangeText={setLocal} onSubmitEditing={start} />
            <PrimaryButton title="Recevoir les codes" iconRight="arrow-right" loading={busy} disabled={local.replace(/\D/g, '').length < 9} onPress={start} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Confirmez avec les deux codes</Text>
            <Banner tone="info" title="Deux codes vous ont été envoyés">
              Un sur votre ancien numéro, un sur le nouveau ({newPhone}).
            </Banner>
            <Text style={styles.label}>Code reçu sur l'ANCIEN numéro</Text>
            <Field icon="lock" value={oldCode} onChangeText={t => setOldCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
            <Text style={styles.label}>Code reçu sur le NOUVEAU numéro</Text>
            <Field icon="lock" value={newCode} onChangeText={t => setNewCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" keyboardType="number-pad" autoCapitalize="none" />
            <PrimaryButton title="Valider le changement" iconRight="check" loading={busy} disabled={oldCode.length < 6 || newCode.length < 6} onPress={confirm} />
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
    title: {fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.textPrimary},
    sub: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary},
    label: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginTop: 4},
  });
