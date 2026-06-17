/**
 * Bascule de thème clair/sombre (maquette : ThemeToggle). Affiche la cible : lune en clair
 * (→ passer en sombre), soleil en sombre (→ passer en clair).
 */
import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {Icon} from './Icon';
import {Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function ThemeToggle() {
  const {scheme, colors, toggle} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={toggle} style={styles.btn} hitSlop={6} accessibilityLabel="Changer de thème">
      <Icon name={scheme === 'dark' ? 'sun' : 'moon'} size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    btn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
  });
