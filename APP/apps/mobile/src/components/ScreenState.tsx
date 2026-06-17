/**
 * États transverses des écrans connectés : chargement / vide / erreur réseau. Thémé (clair/sombre).
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from './Icon';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function LoadingState({label}: {label?: string}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Text style={styles.sub}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({icon = 'search', title, hint}: {icon?: IconName; title: string; hint?: string}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.box}>
      <Icon name={icon} size={26} color={colors.textTertiary} strokeWidth={1.4} />
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.sub}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorState({message, onRetry}: {message?: string; onRetry?: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.box}>
      <Icon name="refresh" size={24} color={colors.errorDot} strokeWidth={1.6} />
      <Text style={styles.title}>{message ?? 'Connexion impossible.'}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry} hitSlop={8}>
          <Icon name="refresh" size={14} color={colors.accent} />
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: {alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 30, paddingHorizontal: 16},
    title: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textSecondary, textAlign: 'center'},
    sub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textAlign: 'center'},
    retry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.md,
      backgroundColor: colors.accent50,
      borderWidth: 1,
      borderColor: colors.accent100,
    },
    retryText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.accent},
  });
