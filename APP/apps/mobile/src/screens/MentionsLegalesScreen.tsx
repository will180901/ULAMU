/**
 * Mentions légales — lire ce qu'on a accepté, et voir qu'on l'a accepté. Chantier 62, 07/09/2026.
 *
 * ── Ce qui manquait, et c'est plus grave que « ne pas pouvoir relire » ─────────────────────────
 *
 * L'application faisait accepter des documents **qu'elle ne montrait pas**. La case d'inscription
 * disait : *« J'accepte que mes données de santé soient chiffrées et accessibles aux seuls
 * soignants que je consulte »* — une phrase sur le chiffrement. Sur la foi de cette case, le
 * serveur enregistrait un consentement aux **CGU v1.0** et à la **politique de confidentialité
 * v1.0**, une ligne que le modèle qualifie de *preuve légale, immuable* (loi n° 29-2019).
 *
 * ⚠️ **Une preuve fabriquée à partir d'une case qui ne nomme pas ce qu'elle prouve ne prouve rien.**
 *
 * Cet écran fait donc les deux moitiés : il montre les textes, et il montre la ligne de preuve —
 * quelle version, quel jour.
 *
 * ── Pourquoi les textes viennent du serveur ────────────────────────────────────────────────────
 *
 * Ils sont servis par celui-là même qui enregistre la version. Recopiés ici, ils pourraient changer
 * sans que la version bouge, et tous les consentements passés se mettraient à désigner un texte qui
 * n'est plus celui qu'on a lu — sans que personne ne s'en aperçoive.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Banner, Card, IconButton} from '../components/ui';
import {Grain} from '../components/Grain';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {ConsentRecordView, LegalDocument} from '../lib/contracts';
import {fonts, Palette} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const dateFr = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});

export function MentionsLegalesScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'MentionsLegales'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [documents, setDocuments] = useState<LegalDocument[] | null>(null);
  const [consentements, setConsentements] = useState<ConsentRecordView[]>([]);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [docs, mes] = await Promise.all([api.legalDocuments(), api.myConsents()]);
      setDocuments(docs.documents);
      setConsentements(mes);
    } catch {
      setErreur(true);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  /** La ligne de preuve pour ce document : à quelle version, et quand. */
  const acceptation = (type: string): ConsentRecordView | undefined => consentements.find(c => c.documentType === type);

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Mentions légales</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {erreur ? (
          /*
            Un écran vide se prendrait pour « il n'y a rien à lire ». Sur un document qui vaut
            preuve, c'est le pire malentendu possible — une lecture qui échoue n'est ni un zéro ni
            un « non ».
          */
          <Banner tone="error" title="Les documents n’ont pas pu être chargés">
            Ils ne sont pas absents : seul leur affichage manque. Réessayez dans un moment.
          </Banner>
        ) : documents === null ? (
          <View style={styles.chargement}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          documents.map(d => {
            const mien = acceptation(d.type);
            const perimee = mien !== undefined && mien.documentVersion !== d.version;
            return (
              <Card key={d.type}>
                <Text style={styles.titre}>{d.title}</Text>
                {mien ? (
                  <Text style={styles.preuve}>
                    Version {mien.documentVersion} · acceptée le {dateFr(mien.acceptedAt)}
                  </Text>
                ) : (
                  <Text style={styles.preuve}>Version {d.version} · en vigueur aujourd’hui</Text>
                )}
                {/*
                  Quand la version acceptée n'est plus la version courante, on le dit : sans cela,
                  on lit le texte d'aujourd'hui en croyant relire ce qu'on a signé.
                */}
                {perimee ? (
                  <Text style={styles.perimee}>
                    Vous avez accepté la version {mien?.documentVersion} ; le texte ci-dessous est la version {d.version},
                    en vigueur aujourd’hui.
                  </Text>
                ) : null}
                {d.paragraphs.map(p => (
                  <Text key={p.slice(0, 24)} style={styles.paragraphe}>
                    {p}
                  </Text>
                ))}
              </Card>
            );
          })
        )}

        {/*
          Les données sont hébergées AILLEURS que le pays desservi, et le texte ci-dessus le dit.
          On le répète ici en clair : c'est la ligne qui a été FAUSSE jusqu'au 24/08/2026, où elle
          affirmait un hébergement au Congo-Brazzaville.
        */}
        {documents !== null && !erreur ? (
          <Card>
            <Text style={styles.titre}>À propos</Text>
            <View style={styles.ligne}>
              <Text style={styles.cle}>Application</Text>
              <Text style={styles.valeur}>ULAMU Mobile</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.cle}>Pays de service</Text>
              <Text style={styles.valeur}>Congo-Brazzaville</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.cle}>Hébergement des données</Text>
              <Text style={styles.valeur}>Francfort, Allemagne</Text>
            </View>
          </Card>
        ) : null}
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
    chargement: {paddingVertical: 24, alignItems: 'center'},
    titre: {fontFamily: fonts.display, fontSize: 15.5, letterSpacing: -0.3, color: colors.textPrimary},
    preuve: {fontFamily: fonts.body, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: colors.textTertiary, marginTop: 3},
    perimee: {fontFamily: fonts.body, fontSize: 11.5, color: colors.warning, marginTop: 6, lineHeight: 16},
    paragraphe: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 19, marginTop: 8},
    ligne: {flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8},
    cle: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary},
    valeur: {fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary},
  });
