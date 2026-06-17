/**
 * Barre d'onglets patient — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/tabs.jsx (TabBar),
 * adaptée (2026-07-24, demande utilisateur + image de référence) : l'onglet ACTIF montre l'icône dans
 * un cadre arrondi cobalt + un point sous l'icône (le libellé disparaît) ; les onglets INACTIFS restent
 * icône + libellé, neutres, sans cadre — pour que l'onglet courant se distingue d'un coup d'œil.
 */
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon, IconName} from './Icon';
import {fonts, Palette} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const META: Record<string, {icon: IconName; label: string}> = {
  Accueil: {icon: 'home', label: 'Accueil'},
  Consultations: {icon: 'message', label: 'Consultations'},
  Espace: {icon: 'user', label: 'Mon espace'},
};

export function PatientTabBar({state, navigation}: BottomTabBarProps) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = META[route.name] ?? {icon: 'home' as IconName, label: route.name};
        const onPress = () => {
          const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityLabel={meta.label} accessibilityState={focused ? {selected: true} : {}}>
            <View style={[styles.iconBox, focused && styles.iconBoxOn]}>
              <Icon name={meta.icon} size={20} color={focused ? colors.accent500 : colors.textTertiary} strokeWidth={focused ? 2 : 1.6} />
            </View>
            {focused ? <View style={styles.dot} /> : <Text style={styles.label}>{meta.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  tab: {flex: 1, alignItems: 'center', gap: 5, minHeight: 34, justifyContent: 'flex-start'},
  iconBox: {
    width: 42,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconBoxOn: {borderColor: colors.accent500},
  dot: {width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent500},
  label: {fontFamily: fonts.body, fontSize: 10, fontWeight: '500', color: colors.textTertiary},
});
