import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AuthMeshBackground} from '../components/AuthCarouselDrawer';
import {CarnetScreen} from '../screens/CarnetScreen';
import {CloseAccountScreen} from '../screens/CloseAccountScreen';
import {DoctorScreen} from '../screens/DoctorScreen';
import {EditProfileScreen} from '../screens/EditProfileScreen';
import {FamilyScreen} from '../screens/FamilyScreen';
import {RemindersScreen} from '../screens/RemindersScreen';
import {ForgotScreen} from '../screens/ForgotScreen';
import {HandshakeScreen} from '../screens/HandshakeScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {MedsScreen} from '../screens/MedsScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {OrdonnanceScreen} from '../screens/OrdonnanceScreen';
import {PaymentsScreen} from '../screens/PaymentsScreen';
import {PayScreen} from '../screens/PayScreen';
import {PhoneChangeScreen} from '../screens/PhoneChangeScreen';
import {SessionScreen} from '../screens/SessionScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {SuccessScreen} from '../screens/SuccessScreen';
import {TotpChallengeScreen} from '../screens/TotpChallengeScreen';
import {
  TotpBackupCodesScreen,
  TotpConfirmScreen,
  TotpDoneScreen,
  TotpIntroScreen,
  TotpSetupScreen,
} from '../screens/TotpScreens';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {hasOnboarded} from '../services/onboarding';
import {useAuth} from '../state/AuthContext';
import {useTheme} from '../state/ThemeContext';
import {PatientTabs} from './PatientTabs';
import {AppStackParamList, AuthStackParamList} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/** Aiguillage selon l'état d'auth : chargement → splash ; connecté → app ; sinon → parcours d'auth. */
export function RootNavigator() {
  const {state} = useAuth();
  const {colors} = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hasOnboarded().then(setOnboarded);
  }, []);

  if (state.status === 'loading' || onboarded === null) {
    return (
      <View style={[styles.splash, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {state.status === 'authenticated' ? (
        <AppStack.Navigator screenOptions={{headerShown: false}}>
          <AppStack.Screen name="Tabs" component={PatientTabs} />
          <AppStack.Screen name="Doctor" component={DoctorScreen} />
          <AppStack.Screen name="Handshake" component={HandshakeScreen} />
          <AppStack.Screen name="Pay" component={PayScreen} />
          <AppStack.Screen name="Session" component={SessionScreen} />
          <AppStack.Screen name="Carnet" component={CarnetScreen} />
          <AppStack.Screen name="EditProfile" component={EditProfileScreen} />
          <AppStack.Screen name="Family" component={FamilyScreen} />
          <AppStack.Screen name="Reminders" component={RemindersScreen} />
          <AppStack.Screen name="Ordonnance" component={OrdonnanceScreen} />
          <AppStack.Screen name="Meds" component={MedsScreen} />
          <AppStack.Screen name="Notifications" component={NotificationsScreen} />
          <AppStack.Screen name="Payments" component={PaymentsScreen} />
          <AppStack.Screen name="Settings" component={SettingsScreen} />
          <AppStack.Screen name="PhoneChange" component={PhoneChangeScreen} />
          <AppStack.Screen name="CloseAccount" component={CloseAccountScreen} />
          <AppStack.Screen name="TotpIntro" component={TotpIntroScreen} />
          <AppStack.Screen name="TotpSetup" component={TotpSetupScreen} />
          <AppStack.Screen name="TotpConfirm" component={TotpConfirmScreen} />
          <AppStack.Screen name="TotpBackupCodes" component={TotpBackupCodesScreen} />
          <AppStack.Screen name="TotpDone" component={TotpDoneScreen} />
        </AppStack.Navigator>
      ) : (
        // Le fond animé est posé UNE fois derrière toute la pile d'authentification : Connexion,
        // Inscription et Mot de passe oublié le laissent transparaître (écrans transparents) au lieu
        // d'en recréer un chacun — sinon chaque navigation démonte/remonte 6 textures animées, ce qui
        // se ressentait comme un blocage au clic. Les autres écrans gardent leur fond opaque.
        <View style={styles.authRoot}>
          <AuthMeshBackground />
          <AuthStack.Navigator initialRouteName={onboarded ? 'Login' : 'Welcome'} screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.accent600}}}>
            <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{contentStyle: {backgroundColor: colors.bg}}} />
            <AuthStack.Screen name="Login" component={LoginScreen} options={transparentScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} options={transparentScreen} />
            <AuthStack.Screen name="Forgot" component={ForgotScreen} options={transparentScreen} />
            <AuthStack.Screen name="TotpChallenge" component={TotpChallengeScreen} />
            <AuthStack.Screen name="Success" component={SuccessScreen} />
          </AuthStack.Navigator>
        </View>
      )}
    </NavigationContainer>
  );
}

/** Écrans laissant voir le fond animé partagé posé derrière la pile (cf. AuthMeshBackground). */
const transparentScreen = {contentStyle: {backgroundColor: 'transparent'}} as const;

const styles = StyleSheet.create({
  splash: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  authRoot: {flex: 1},
});
