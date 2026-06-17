/**
 * Thème clair/sombre — palette active fournie par contexte, persistée (AsyncStorage `ulamu-theme`).
 * Les écrans lisent les couleurs via useTheme() (inline) et useThemedStyles() (StyleSheet recalculé
 * à chaque bascule). Le scale accent cobalt est partagé ; fonds/texte/bordures/sémantiques flippent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {darkColors, lightColors, Palette} from '../theme';

type Scheme = 'light' | 'dark';
const KEY = 'ulamu-theme';

interface ThemeValue {
  scheme: Scheme;
  colors: Palette;
  toggle: () => void;
  setScheme: (s: Scheme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  // App validée en clair → défaut clair ; la maquette propose le sombre, accessible via la bascule.
  const [scheme, setSchemeState] = useState<Scheme>('light');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => {
        if (v === 'light' || v === 'dark') {
          setSchemeState(v);
        }
      })
      .catch(() => undefined);
  }, []);

  const setScheme = useCallback((s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(KEY, s).catch(() => undefined);
  }, []);

  const toggle = useCallback(() => setScheme(scheme === 'dark' ? 'light' : 'dark'), [scheme, setScheme]);

  const value = useMemo<ThemeValue>(
    () => ({scheme, colors: scheme === 'dark' ? darkColors : lightColors, toggle, setScheme}),
    [scheme, toggle, setScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé dans <ThemeProvider>');
  }
  return ctx;
}

/** StyleSheet dépendant du thème — re-mémoïsé à chaque changement de palette. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (colors: Palette) => T): T {
  const {colors} = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
