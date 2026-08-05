/**
 * Succès — confirmation de fin d'INSCRIPTION → entrée dans l'app.
 *
 * La connexion ne passe plus par ici : elle entre directement dans l'app, quelle que soit la voie
 * (mot de passe seul, code par email, TOTP). Un interstitiel n'y apprenait rien que l'app elle-même
 * ne montre déjà, et coûtait un appui à chaque ouverture. La création de compte, elle, est un jalon
 * qui mérite d'être annoncé.
 */
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef} from 'react';
import {Animated, BackHandler, Easing, StyleSheet, Text, View} from 'react-native';
import {AuthScreen, Badge, Card, CobaltHeader, FloatCard, PrimaryButton, VerifiedBadge} from '../components/ui';
import {Icon} from '../components/Icon';
import {useAuth} from '../state/AuthContext';
import {fonts, Palette} from '../theme';
import {useThemedStyles} from '../state/ThemeContext';

export function SuccessScreen() {
  const styles = useThemedStyles(makeStyles);
  const {activatePending} = useAuth();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, {toValue: 1, duration: 350, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true}).start();
  }, [pop]);

  /**
   * Écran TERMINAL : le compte est créé, il n'y a plus rien derrière. Le bouton
   * retour est donc neutralisé — sans ça, Android redéposait l'utilisateur dans un formulaire qu'il
   * venait de valider, avec des champs à moitié vidés et un code déjà consommé.
   *
   * La seule sortie est « Accéder à mon espace », volontairement : c'est ce geste qui active réellement
   * la session.
   */
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );
  const scale = pop.interpolate({inputRange: [0, 1], outputRange: [0.6, 1]});

  return (
    <AuthScreen>
      <CobaltHeader paddingBottom={40}>
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.circle, {transform: [{scale}], opacity: pop}]}>
            <Icon name="check-circle" size={34} color="#fff" strokeWidth={2} />
          </Animated.View>
          <Text style={styles.title}>Compte créé</Text>
          <Text style={styles.subtitle}>Bienvenue sur ULAMU.</Text>
        </View>
      </CobaltHeader>

      <FloatCard>
        <Card>
          <View style={styles.recapRow}>
            <Icon name="user" size={20} variant="tile" />
            <View style={styles.flex}>
              <Text style={styles.recapLabel}>Vous accédez à</Text>
              <View style={styles.recapDest}>
                <Text style={styles.recapDestText}>Mon espace patient</Text>
                <VerifiedBadge size={16} />
              </View>
            </View>
            <Badge tone="success" dot>
              Sécurisé
            </Badge>
          </View>
        </Card>

        <View style={{marginTop: 16}}>
          <PrimaryButton title="Accéder à mon espace" iconRight="arrow-right" onPress={activatePending} />
        </View>
      </FloatCard>
    </AuthScreen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    headerCenter: {alignItems: 'center', paddingTop: 6},
    circle: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.6, color: '#fff', marginTop: 16},
    subtitle: {fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 5},
    recapRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
    recapLabel: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary},
    recapDest: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
    recapDestText: {fontFamily: fonts.display, fontSize: 15, color: colors.textPrimary},
  });
