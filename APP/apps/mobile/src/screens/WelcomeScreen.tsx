/**
 * Écran Bienvenue — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/onboarding.jsx (étape 0).
 * Affiché UNE fois au premier lancement (proposition de valeur). Les étapes 2-4 de la maquette
 * (téléphone → OTP → profil) sont REMPLACÉES par notre parcours username + mot de passe + TOTP
 * (décision d'auth) : « Commencer » mène à la connexion, « Créer un compte » à l'inscription.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Card, FootLink, LogoMark, PrimaryButton} from '../components/ui';
import {Icon, IconName} from '../components/Icon';
import {AuthStackParamList} from '../navigation/types';
import {markOnboarded} from '../services/onboarding';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const VALUE: [IconName, string, string][] = [
  ['file-medical', 'Dossier médical gratuit, à vie', 'Chaque soin enrichit votre mémoire médicale'],
  ['shield-check', 'Payez après la poignée de main', "Jamais un franc sans l'accord du soignant"],
  ['pill', 'Médicaments trouvés et réservés', 'Fini la tournée des pharmacies'],
];

export function WelcomeScreen({navigation}: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const go = async (route: 'Login' | 'Register') => {
    await markOnboarded();
    navigation.replace(route);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.mark, shadow.md]}>
            <LogoMark size={60} />
          </View>
          <Text style={styles.title}>Bienvenue sur ulamu</Text>
          <Text style={styles.baseline}>Se soigner, sans file d'attente,{'\n'}sans carnet perdu, sans mauvaise surprise.</Text>
        </View>

        <View style={styles.cards}>
          {VALUE.map(([ic, t, s]) => (
            <Card key={t} padding={13}>
              <View style={styles.cardRow}>
                <Icon name={ic} size={18} variant="tile" />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{t}</Text>
                  <Text style={styles.cardSub}>{s}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Commencer" iconRight="arrow-right" onPress={() => go('Login')} />
        <FootLink prefix="Nouveau sur ULAMU ?" action="Créer un compte" onPress={() => go('Register')} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},
    content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 26},

    hero: {alignItems: 'center', gap: 8},
    mark: {width: 60, height: 60, borderRadius: 13, backgroundColor: '#2756A6', alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden'},
    title: {fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.7, color: colors.textPrimary, textAlign: 'center'},
    baseline: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 21, color: colors.textTertiary, textAlign: 'center'},

    cards: {gap: 10},
    cardRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
    cardTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
    cardSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},

    footer: {padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.surface},
  });
