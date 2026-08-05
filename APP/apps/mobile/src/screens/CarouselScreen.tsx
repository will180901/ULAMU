/**
 * Écran d'accueil du parcours d'authentification — le carrousel.
 *
 * C'est le premier écran de l'app, et le SEUL conservé tel quel lors de la refonte : illustrations en
 * fondu enchaîné sur le mesh gradient animé, navigables au doigt (balayage horizontal ou appui sur un
 * point). Il remplace l'ancien écran « Bienvenue », qui s'intercalait au premier lancement.
 *
 * Il ne porte plus de formulaire : « Rejoindre » ouvre désormais la page de connexion, une vraie page
 * de la pile de navigation. Le fond animé, lui, est monté une seule fois derrière toute la pile
 * (`AuthMeshBackground` dans RootNavigator) — il ne se recharge donc pas d'un écran à l'autre, ce qui
 * donne la continuité visuelle entre le carrousel et les formulaires.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {CarouselContent} from '../components/AuthCarouselDrawer';
import {AuthStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Carousel'>;

export function CarouselScreen({navigation}: Props) {
  return (
    <View style={styles.root}>
      <CarouselContent onLogin={() => navigation.navigate('Login')} label="Rejoindre" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
