/**
 * Coque de navigation patient — onglets Accueil / Consultations / Mon espace (maquette tabs.jsx),
 * avec le bouton Urgence flottant posé au-dessus de la barre. Les flux plein écran (profil soignant,
 * TOTP…) sont poussés par la pile parente AU-DESSUS de cette coque → la barre et l'Urgence disparaissent.
 */
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {PatientTabBar} from '../components/PatientTabBar';
import {UrgenceButton} from '../components/UrgenceButton';
import {ConsultationsScreen} from '../screens/ConsultationsScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {SpaceScreen} from '../screens/SpaceScreen';
import {Palette} from '../theme';
import {useThemedStyles} from '../state/ThemeContext';
import {PatientTabParamList} from './types';

const Tab = createBottomTabNavigator<PatientTabParamList>();

export function PatientTabs() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.root}>
      <Tab.Navigator tabBar={props => <PatientTabBar {...props} />} screenOptions={{headerShown: false}}>
        <Tab.Screen name="Accueil" component={HomeScreen} />
        <Tab.Screen name="Consultations" component={ConsultationsScreen} />
        <Tab.Screen name="Espace" component={SpaceScreen} />
      </Tab.Navigator>
      <UrgenceButton />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
});
