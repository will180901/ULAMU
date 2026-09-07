/**
 * Aide — écrire à l'administration, et lire sa réponse. Chantier 61, 07/09/2026 (M16, CU-16-04).
 *
 * ── Ce qui manquait ────────────────────────────────────────────────────────────────────────────
 *
 * `POST /v1/support-requests` et `GET /v1/support-requests/mine` existent depuis le 01/09 et le web
 * les appelle. Cette application, non : **un patient n'avait aucun moyen d'écrire à qui que ce
 * soit.** Pour sortir de l'application et chercher un contact ailleurs, il n'y avait rien à
 * trouver — l'adresse `support@ulamu.cg` porte un domaine qui n'appartient pas au projet.
 *
 * C'est le filet de dernier recours : celui qu'on tire quand le reste a échoué, y compris quand un
 * signalement n'aboutit pas.
 *
 * ── Pourquoi la réponse vit ICI ────────────────────────────────────────────────────────────────
 *
 * Un formulaire qui envoie sans jamais rien rendre est **pire** que l'adresse morte qu'il remplace :
 * au moins, avec une adresse, on sait qu'on n'a pas eu de réponse. L'écran montre donc les deux
 * moitiés — ce qu'on a demandé, ce qu'on a reçu.
 *
 * ── Ce qu'il ne prétend pas être ───────────────────────────────────────────────────────────────
 *
 * Ce n'est pas une messagerie. Une demande reçoit UNE réponse, et elle est close : ULAMU n'a pas de
 * messagerie interne, et les échanges n'existent que pendant une consultation. Afficher un fil
 * laisserait croire à un aller-retour que rien ne fait vivre.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Banner, Card, IconButton, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {ErrorState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {SupportRequestView, SupportSubject, SUPPORT_BODY_MAX} from '../lib/contracts';
import {demandeEnvoyable, libelleSujet, SUJETS_OFFERTS} from '../lib/support';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {useHardwareBack} from '../state/useHardwareBack';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const dateHeureFr = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});

export function AideScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Aide'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const [sujet, setSujet] = useState<SupportSubject>('OTHER');
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const [miennes, setMiennes] = useState<SupportRequestView[] | null>(null);
  const [erreurListe, setErreurListe] = useState(false);

  const charger = useCallback(async () => {
    setErreurListe(false);
    try {
      setMiennes(await api.mySupportRequests());
    } catch {
      setErreurListe(true);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  /*
    Quitter efface un texte écrit. Quelqu'un qui vient de raconter ce qui lui arrive ne doit pas le
    perdre d'un geste involontaire — même garde-fou que sur la feuille de signalement.
  */
  const partir = useAbandonGuard({
    dirty: texte.trim().length > 0,
    title: 'Abandonner cette demande ?',
    message: 'Ce que vous avez écrit sera effacé.',
    onLeave: () => navigation.goBack(),
  });
  useHardwareBack(partir);

  const envoyer = async () => {
    if (!demandeEnvoyable(texte)) {
      return;
    }
    setBusy(true);
    try {
      await api.createSupportRequest({subject: sujet, body: texte.trim()});
      setTexte('');
      await charger();
      await alert({
        title: 'Demande envoyée',
        message:
          'Elle apparaît ci-dessous, et la réponse s’y affichera. Vous n’avez rien à relancer, et il n’y aura pas de courriel.',
      });
    } catch (e) {
      await alert({
        title: 'Envoi impossible',
        message: e instanceof ApiError ? e.message : 'Votre demande n’a pas pu être envoyée. Réessayez dans un moment.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={partir} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Aide</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.cardTitle}>Écrire à l’administration</Text>
          <Text style={styles.cardSub}>
            La réponse arrive sur cette page — ULAMU n’envoie pas de courriel de support.
          </Text>

          <Text style={styles.label}>De quoi s’agit-il ?</Text>
          {SUJETS_OFFERTS.map(s => {
            const choisi = sujet === s.cle;
            return (
              <Pressable
                key={s.cle}
                onPress={() => setSujet(s.cle)}
                style={[styles.sujet, choisi && styles.sujetOn]}
                accessibilityRole="radio"
                accessibilityState={{selected: choisi}}>
                <Icon name={choisi ? 'check-circle' : 'plus'} size={15} color={choisi ? colors.accent : colors.textTertiary} />
                <View style={styles.flex}>
                  <Text style={styles.sujetLabel}>{s.label}</Text>
                  <Text style={styles.sujetAide}>{s.aide}</Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.label}>Votre demande</Text>
          <TextInput
            style={styles.textArea}
            value={texte}
            onChangeText={setTexte}
            placeholder="Décrivez votre situation en quelques phrases."
            placeholderTextColor={colors.textDisabled}
            multiline
            textAlignVertical="top"
            maxLength={SUPPORT_BODY_MAX}
          />
          {/*
            La borne du serveur est annoncée AVANT, pas apprise par un refus après avoir écrit. Et
            l'avertissement sur le mot de passe est là parce que c'est exactement ce qu'on écrit
            spontanément quand on demande de l'aide pour se connecter.
          */}
          <Text style={styles.compteur}>
            {texte.trim().length} / {SUPPORT_BODY_MAX} caractères. N’écrivez pas votre mot de passe ni un code de
            connexion : l’administration ne vous les demandera jamais.
          </Text>

          <PrimaryButton
            title="Envoyer ma demande"
            iconRight="send"
            loading={busy}
            disabled={!demandeEnvoyable(texte)}
            onPress={envoyer}
          />
        </Card>

        <Text style={styles.section}>MES DEMANDES</Text>
        {miennes === null && !erreurListe ? (
          <View style={styles.chargement}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : erreurListe ? (
          /*
            Une lecture qui échoue n'est ni un zéro ni un « non » : on dit que les demandes existent
            toujours côté serveur, sinon on croit les avoir perdues et on les réécrit.
          */
          <Banner tone="error" title="Vos demandes n’ont pas pu être lues">
            Celles que vous avez envoyées sont conservées : seul cet affichage manque.
          </Banner>
        ) : miennes && miennes.length === 0 ? (
          <Text style={styles.vide}>Vous n’avez encore rien écrit à l’administration.</Text>
        ) : (
          (miennes ?? []).map(d => (
            <Card key={d.id}>
              <View style={styles.ligneTitre}>
                <Text style={styles.demandeSujet}>{libelleSujet(d.subject)}</Text>
                <View style={[styles.pilule, d.status === 'ANSWERED' ? styles.piluleOk : styles.piluleAttente]}>
                  <Text style={[styles.piluleText, d.status === 'ANSWERED' && styles.piluleTextOk]}>
                    {d.status === 'ANSWERED' ? 'Répondue' : 'En attente'}
                  </Text>
                </View>
              </View>
              <Text style={styles.demandeDate}>{dateHeureFr(d.createdAt)}</Text>
              <Text style={styles.demandeCorps}>{d.body}</Text>

              {d.answer ? (
                /* Visuellement distincte de la demande : sans cela on relit son propre texte en
                   croyant lire celui de l'administration. */
                <View style={styles.reponse}>
                  <Text style={styles.reponseTitre}>
                    Réponse de l’administration · {d.answeredAt ? dateHeureFr(d.answeredAt) : '—'}
                  </Text>
                  <Text style={styles.reponseTexte}>{d.answer}</Text>
                </View>
              ) : (
                <Text style={styles.attente}>Aucune réponse pour l’instant. Elle s’affichera ici.</Text>
              )}
            </Card>
          ))
        )}

        {erreurListe ? <ErrorState onRetry={charger} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.bg},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    content: {padding: 16, gap: 12, paddingBottom: 32},
    flex: {flex: 1},
    cardTitle: {fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
    cardSub: {fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2},
    label: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 12},
    sujet: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginTop: 6,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    sujetOn: {borderColor: colors.accent, backgroundColor: colors.bgMuted},
    sujetLabel: {fontFamily: fonts.body, fontSize: 13.5, fontWeight: '600', color: colors.textPrimary},
    sujetAide: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1, lineHeight: 15},
    textArea: {
      minHeight: 110,
      marginTop: 6,
      padding: 11,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      fontFamily: fonts.body,
      fontSize: 13.5,
      color: colors.textPrimary,
    },
    compteur: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 6, marginBottom: 10, lineHeight: 15},
    section: {
      fontFamily: fonts.body,
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.7,
      color: colors.textTertiary,
      marginTop: 8,
      marginBottom: 2,
    },
    chargement: {paddingVertical: 20, alignItems: 'center'},
    vide: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, paddingVertical: 8},
    ligneTitre: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
    demandeSujet: {flex: 1, fontFamily: fonts.body, fontSize: 13.5, fontWeight: '600', color: colors.textPrimary},
    pilule: {borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3},
    piluleAttente: {backgroundColor: colors.bgMuted},
    piluleOk: {backgroundColor: colors.successBg},
    piluleText: {fontFamily: fonts.body, fontSize: 10.5, fontWeight: '700', color: colors.textTertiary},
    piluleTextOk: {color: colors.success},
    demandeDate: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary, marginTop: 2},
    demandeCorps: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginTop: 8},
    reponse: {
      marginTop: 10,
      paddingLeft: 10,
      paddingVertical: 8,
      paddingRight: 8,
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
      backgroundColor: colors.bgMuted,
      borderRadius: radius.sm,
    },
    reponseTitre: {fontFamily: fonts.body, fontSize: 10.5, fontWeight: '700', color: colors.textTertiary},
    reponseTexte: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textPrimary, lineHeight: 18, marginTop: 4},
    attente: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 8},
  });
