/**
 * Signaler — la porte d'entrée de la modération, côté patient. Chantier 59, 06/09/2026.
 *
 * ── Ce qui manquait, et ce que ça coûtait ─────────────────────────────────────────────────────
 *
 * `POST /v1/reports` existe depuis le premier jour. Le web l'appelle depuis le chantier 41 ; cette
 * application, non. **Un patient n'avait aucun bouton pour signaler quoi que ce soit** — ni un
 * message, ni un soignant.
 *
 * Ce n'est pas une fonctionnalité manquante parmi d'autres : sur une plateforme de santé, c'est la
 * voie de recours. Toute la modération existait derrière — file triée par gravité, décision
 * motivée, avertissement, transmission — et le patient, lui, n'avait pas de porte.
 *
 * ── Les trois choix de cet écran, repris du web pour que les deux disent la même chose ────────
 *
 * **1. On dit AVANT que l'identité du signaleur est protégée.** `redactReportForAdmin` (RM-04-04)
 * retire le `reporterId` avant que l'administration ne voie quoi que ce soit. C'est une garantie du
 * serveur, pas une promesse d'interface — et il faut la lire AVANT de remplir : un patient qui doit
 * revoir ce soignant la semaine prochaine n'ose pas signaler sans elle.
 *
 * **2. On dit AVANT que la réponse reviendra.** Quand l'équipe tranche, le serveur notifie l'auteur
 * (`m04.report.resolved`, l'issue sans le détail des sanctions, CU-04-03) — et cette application
 * affiche les notifications telles que le serveur les rédige, donc la boucle est déjà fermée ici.
 * *C'est ce qui distingue un formulaire d'un trou noir.*
 *
 * **3. Le motif est une LISTE, jamais un champ libre seul.** C'est le code du motif qui décide de
 * l'ordre de traitement dans la file — le harcèlement passe devant le spam (CU-04-04). Un
 * signalement sans code serait un signalement sans priorité, donc traité en dernier.
 */
import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Banner, PrimaryButton} from './ui';
import {useDialog} from './Dialog';
import {Icon} from './Icon';
import {ApiError} from '../lib/api-client';
import {ReportReasonCode, ReportTargetType, REPORT_TEXT_MAX} from '../lib/contracts';
import {MOTIFS_AFFICHES} from '../lib/signalement';
import {api} from '../services/api';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/**
 * Les six motifs du serveur (EF-04-05), dans l'ordre où on les LIT — pas dans celui du code.
 *
 * L'ordre descend du plus grave au plus anodin, comme la file de modération les trie. « Autre »
 * ferme la liste : il est le seul qui n'apprend rien à lui seul, d'où l'aide qui invite à écrire.
 */
const LIBELLES: Record<ReportReasonCode, {label: string; aide: string}> = {
  HARASSMENT: {label: 'Harcèlement', aide: 'Messages répétés, intimidation, menaces'},
  INAPPROPRIATE_BEHAVIOR: {label: 'Comportement inapproprié', aide: 'Propos déplacés, agressivité, contenu choquant'},
  SUSPECTED_FAKE_PROFILE: {label: 'Profil suspect', aide: 'Identité douteuse, usurpation possible'},
  MISLEADING_INFORMATION: {label: 'Information trompeuse', aide: 'Affirmations fausses ou dangereuses'},
  SPAM: {label: 'Spam ou publicité', aide: 'Sollicitation commerciale, contenu répétitif'},
  OTHER: {label: 'Autre', aide: 'Précisez ci-dessous — sans texte, ce motif n’aide personne'},
};

export function FeuilleSignalement({
  visible,
  onClose,
  cible,
  cibleId,
  quoi,
}: {
  visible: boolean;
  onClose: () => void;
  cible: ReportTargetType;
  cibleId: string;
  /** Ce qu'on signale, en toutes lettres — « ce message », « ce soignant ». */
  quoi: string;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const [motif, setMotif] = useState<ReportReasonCode | null>(null);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMotif(null);
    setTexte('');
    onClose();
  };

  /*
    Fermer par mégarde (appui hors de la feuille, bouton retour) efface un motif choisi et un texte
    écrit. On ne retient personne sur une feuille restée vierge — mais quelqu'un qui vient de
    raconter ce qui s'est passé ne doit pas le perdre d'un geste involontaire.
  */
  const dismiss = useAbandonGuard({
    dirty: motif !== null || texte.trim().length > 0,
    title: 'Abandonner ce signalement ?',
    message: 'Ce que vous avez écrit sera effacé.',
    onLeave: reset,
  });

  const envoyer = async () => {
    if (!motif) {
      return;
    }
    setBusy(true);
    try {
      await api.createReport({
        targetType: cible,
        targetId: cibleId,
        reasonCode: motif,
        ...(texte.trim() ? {reasonText: texte.trim()} : {}),
      });
      reset();
      /*
        L'accusé de réception redit les deux garanties — c'est le moment où la personne se demande
        « qu'est-ce que je viens de déclencher, et qui va savoir que c'est moi ».
      */
      await alert({
        title: 'Signalement transmis',
        message:
          'L’équipe de modération l’examinera et vous recevrez sa réponse dans vos notifications. ' +
          'Votre nom n’est communiqué ni à la personne signalée, ni à l’équipe qui examine.',
      });
    } catch (e) {
      await alert({
        title: 'Envoi impossible',
        message: e instanceof ApiError ? e.message : 'Réessayez dans un moment.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Signaler {quoi}</Text>
          <Text style={styles.sub}>
            Choisissez le motif qui décrit le mieux la situation : il décide de l’ordre dans lequel l’équipe
            traitera votre signalement.
          </Text>

          {/*
            La garantie AVANT le formulaire, et non après : c'est elle qui décide si on ose remplir.
          */}
          <Banner tone="info" title="Votre nom ne sera jamais montré">
            Ni à la personne signalée, ni à l’équipe qui examine.
          </Banner>

          <ScrollView style={styles.liste} keyboardShouldPersistTaps="handled">
            {MOTIFS_AFFICHES.map(cle => {
              const m = LIBELLES[cle];
              const choisi = motif === cle;
              return (
                <Pressable
                  key={cle}
                  onPress={() => setMotif(cle)}
                  style={[styles.motif, choisi && styles.motifOn]}
                  accessibilityRole="radio"
                  accessibilityState={{selected: choisi}}>
                  <Icon name={choisi ? 'check-circle' : 'plus'} size={16} color={choisi ? colors.accent : colors.textTertiary} />
                  <View style={styles.flex}>
                    <Text style={styles.motifLabel}>{m.label}</Text>
                    <Text style={styles.motifAide}>{m.aide}</Text>
                  </View>
                </Pressable>
              );
            })}

            <Text style={styles.label}>
              Précisions <Text style={styles.facultatif}>(facultatif)</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={texte}
              onChangeText={setTexte}
              placeholder="Ce qui s’est passé, en quelques mots."
              placeholderTextColor={colors.textDisabled}
              multiline
              textAlignVertical="top"
              maxLength={REPORT_TEXT_MAX}
            />
            <Text style={styles.compteur}>
              {texte.length}/{REPORT_TEXT_MAX} · n’écrivez aucune information médicale ici.
            </Text>
          </ScrollView>

          <PrimaryButton title="Envoyer le signalement" loading={busy} disabled={!motif} onPress={envoyer} />
          <Pressable onPress={dismiss} style={styles.annuler}>
            <Text style={styles.annulerText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 24,
      gap: 10,
      maxHeight: '88%',
    },
    handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center'},
    title: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
    sub: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18},
    liste: {flexGrow: 0},
    flex: {flex: 1},
    motif: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    motifOn: {borderColor: colors.accent, backgroundColor: colors.bgMuted},
    motifLabel: {fontFamily: fonts.body, fontSize: 13.5, fontWeight: '600', color: colors.textPrimary},
    motifAide: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1, lineHeight: 15},
    label: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 12},
    facultatif: {fontWeight: '400', color: colors.textTertiary},
    textArea: {
      minHeight: 78,
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
    compteur: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 5},
    annuler: {alignItems: 'center', paddingVertical: 6},
    annulerText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
