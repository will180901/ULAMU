/**
 * Mes numéros Mobile Money — chantier 114, 14/09/2026.
 *
 * ── ⚠️ Ce que cet écran répare ────────────────────────────────────────────────────────────────
 *
 * Signalé par le porteur : *« normalement on enregistre les numéros selon les opérateurs
 * disponibles dans le système — MTN et Airtel — pour éviter les erreurs dans les transactions. »*
 *
 * C'était pire que décrit. L'ordre de débit partait vers le numéro de **connexion**, quel que soit
 * l'opérateur choisi au moment de payer : un compte enregistré sur un numéro Airtel qui choisissait
 * « MTN MoMo » envoyait la demande vers un portefeuille MTN sur un numéro qui n'en a pas.
 *
 * > **Un numéro de connexion prouve qui on est ; un numéro Mobile Money reçoit de l'argent. Ce
 * > n'est pas le même métier, et c'était le même champ.**
 *
 * ── Ce que l'écran dit, et ce qu'il se garde de dire ──────────────────────────────────────────
 *
 * Il dit à quoi sert chaque numéro, et il **prévient** quand le préfixe ne ressemble pas à
 * l'opérateur — sans rien interdire : la portabilité existe, un 05 peut vivre chez MTN. *Un préfixe
 * qui interdit se trompe le jour où l'opérateur ouvre une nouvelle tranche ; un préfixe qui
 * prévient ne se trompe jamais tout à fait.*
 *
 * Il dit aussi ce qui se passe sans rien enregistrer : le paiement retombe sur le numéro du compte.
 * *Un repli tu est un piège ; un repli annoncé est un choix.*
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';

import {Banner, Card, IconButton, PhoneField, PrimaryButton} from '../components/ui';
import {Icon} from '../components/Icon';
import {useDialog} from '../components/Dialog';
import {Grain} from '../components/Grain';
import {ApiError} from '../lib/api-client';
import {MomoNumberView, MomoOperator} from '../lib/contracts';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/** Les deux opérateurs du pays, et le préfixe qu'on leur connaît habituellement. */
const OPERATEURS: {code: MomoOperator; nom: string; prefixe: string}[] = [
  {code: 'MTN_MOMO', nom: 'MTN MoMo', prefixe: '06'},
  {code: 'AIRTEL_MONEY', nom: 'Airtel Money', prefixe: '05'},
];

export function MomoScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Momo'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();

  const [numeros, setNumeros] = useState<MomoNumberView[] | null>(null);
  const [edite, setEdite] = useState<MomoOperator | null>(null);
  const [local, setLocal] = useState('');
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setNumeros(await api.momoNumbers());
    } catch {
      setNumeros([]);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const enregistrer = async (operator: MomoOperator) => {
    const chiffres = local.replace(/\D/g, '');
    if (chiffres.length < 9) {
      return;
    }
    setBusy(true);
    try {
      await api.setMomoNumber(operator, `+242${chiffres}`);
      setEdite(null);
      setLocal('');
      await charger();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Enregistrement impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  const retirer = async (operator: MomoOperator) => {
    setBusy(true);
    try {
      await api.removeMomoNumber(operator);
      await charger();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Suppression impossible — réessayez.'});
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
        <Text style={styles.headerTitle}>Mobile Money</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          C'est le numéro enregistré ici qui sera débité quand vous choisirez cet opérateur. Sans
          numéro enregistré, la demande part sur le numéro de votre compte.
        </Text>

        {numeros === null ? (
          <ActivityIndicator color={colors.accent500} style={styles.chargement} />
        ) : (
          OPERATEURS.map(op => {
            const actuel = numeros.find(n => n.operator === op.code) ?? null;
            const enEdition = edite === op.code;
            return (
              <Card key={op.code} padding={14}>
                <View style={styles.ligne}>
                  <Icon name="smartphone" size={17} variant="tile" />
                  <View style={styles.flex}>
                    <Text style={styles.nom}>{op.nom}</Text>
                    <Text style={styles.numero}>
                      {actuel ? actuel.msisdn : `Aucun numéro — commence habituellement par ${op.prefixe}`}
                    </Text>
                  </View>
                </View>

                {/*
                  ⚠️ Le doute s'affiche sur le numéro ENREGISTRÉ, pas seulement pendant la saisie :
                  on peut avoir enregistré un numéro douteux il y a un mois et ne s'en apercevoir
                  qu'au refus d'une transaction. *Un avertissement qui ne vit que le temps d'un
                  formulaire ne protège que ce jour-là.*
                */}
                {actuel && !actuel.looksRight ? (
                  <Banner tone="warning" title="Vérifiez cet opérateur">
                    Ce numéro ne commence pas par {op.prefixe}. S'il a été porté chez {op.nom}, tout
                    va bien — sinon, la demande de paiement n'arrivera pas.
                  </Banner>
                ) : null}

                {enEdition ? (
                  <View style={styles.edition}>
                    <PhoneField value={local} onChangeText={setLocal} onSubmitEditing={() => enregistrer(op.code)} />
                    <PrimaryButton
                      title="Enregistrer"
                      iconRight="check"
                      loading={busy}
                      disabled={local.replace(/\D/g, '').length < 9}
                      onPress={() => enregistrer(op.code)}
                    />
                    <Pressable
                      onPress={() => {
                        setEdite(null);
                        setLocal('');
                      }}
                      style={styles.lien}>
                      <Text style={styles.lienTexte}>Annuler</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => {
                        setEdite(op.code);
                        setLocal('');
                      }}
                      style={styles.bouton}>
                      <Text style={styles.boutonTexte}>{actuel ? 'Modifier' : 'Enregistrer'}</Text>
                    </Pressable>
                    {actuel ? (
                      <Pressable onPress={() => retirer(op.code)} disabled={busy} style={styles.lien}>
                        <Text style={styles.lienDanger}>Retirer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.bg},
    header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface},
    headerTitle: {fontFamily: fonts.displayBold, fontSize: 17, color: colors.textPrimary},
    content: {padding: 16, gap: 14, paddingBottom: 40},
    intro: {fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary},
    chargement: {marginTop: 24},
    ligne: {flexDirection: 'row', gap: 11, alignItems: 'center'},
    flex: {flex: 1},
    nom: {fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.textPrimary},
    numero: {fontFamily: fonts.mono, fontSize: 12.5, color: colors.textSecondary, marginTop: 3},
    actions: {flexDirection: 'row', gap: 8, marginTop: 12},
    edition: {gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 12},
    bouton: {paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgMuted},
    boutonTexte: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
    lien: {paddingHorizontal: 10, paddingVertical: 9},
    lienTexte: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textSecondary},
    lienDanger: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.error},
  });
