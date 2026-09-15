/**
 * Tous les avis d'un soignant — chantier 124, 15/09/2026 (EF-05-07 ; CU-05-02).
 *
 * ── Pourquoi cet écran existe ─────────────────────────────────────────────────────────────────
 *
 * ⚠️ **On ne pouvait lire que dix avis, et toujours les dix mêmes.** La fiche servait les dix
 * derniers commentaires, sans suite possible. Question du porteur : *« supposant qu'on atteint une
 * grande audience, comment les avis vont s'afficher ? »* — un soignant avec quatre cents avis en
 * montrait dix, et les trois cent quatre-vingt-dix autres étaient inaccessibles à jamais.
 *
 * > **Une moyenne sans ses avis est un chiffre qu'on doit croire sur parole.**
 *
 * ── Les trois choix de cet écran ──────────────────────────────────────────────────────────────
 *
 * 📌 **Les barres de la répartition sont des BOUTONS.** Toucher « 1 ★ » ne montre que les avis à
 * une étoile. *La seule question qu'on se pose vraiment devant une moyenne est « qu'est-ce qui
 * s'est mal passé chez les mécontents ? »* — et presque aucune plateforme ne la rend facile. C'est
 * aussi le visuel que le porteur a retenu de la fiche : il devient l'outil de navigation.
 *
 * 📌 **La fidélité à la place du nom.** Aucun identifiant de patient n'est servi, par décision :
 * « Mireille a consulté le Dr X » est une information médicale sur une personne identifiable. Ce
 * qui rassure n'est pas QUI a écrit, c'est que la personne ait payé, consulté — et qu'elle soit
 * **revenue**.
 *
 * 📌 **Les notes sans commentaire restent dans la liste.** Elles comptent dans la moyenne ; les
 * cacher ferait deux totaux qui ne se répondent pas.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Card, IconButton} from '../components/ui';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {DirectoryReview, ReviewSort} from '../lib/contracts';
import {api} from '../services/api';
import {formatDateCourte} from '../services/directory';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Status = 'loading' | 'ready' | 'error';

const TRIS: [ReviewSort, string][] = [
  ['recent', 'Plus récents'],
  ['best', 'Meilleurs'],
  ['worst', 'Moins bons'],
];

export function AvisScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Avis'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {professionalId, professionalName, ratingLabel, ratingCount, distribution, scoreInitial} = route.params;

  const [items, setItems] = useState<DirectoryReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(ratingCount);
  const [status, setStatus] = useState<Status>('loading');
  const [suiteEnCours, setSuiteEnCours] = useState(false);
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [score, setScore] = useState<number | null>(scoreInitial ?? null);

  /*
    L'échelle vient des CLÉS servies par le serveur (PM-13), jamais écrite en dur — une règle
    recopiée est une règle qui dérive.
  */
  const echelle = Object.keys(distribution)
    .map(Number)
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);

  const charger = useCallback(async () => {
    setStatus('loading');
    try {
      const page = await api.listProfessionalReviews(professionalId, {sort, ...(score !== null ? {score} : {})});
      setItems(page.items);
      setCursor(page.nextCursor);
      setTotal(page.total);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [professionalId, sort, score]);

  useEffect(() => {
    charger();
  }, [charger]);

  /*
    ⚠️ La suite ne se demande qu'une fois à la fois. Sans ce garde, un défilement rapide lance
    plusieurs requêtes sur le MÊME curseur et la liste affiche deux fois les mêmes avis — la
    version visible du défaut que le serveur évite par son ordre total.
  */
  const chargerLaSuite = async () => {
    if (cursor === null || suiteEnCours || status !== 'ready') {
      return;
    }
    setSuiteEnCours(true);
    try {
      const page = await api.listProfessionalReviews(professionalId, {
        sort,
        cursor,
        ...(score !== null ? {score} : {}),
      });
      setItems(precedents => [...precedents, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // Un échec de PAGE SUIVANTE ne jette pas ce qui est déjà lu : on garde la liste, le bouton
      // reviendra au prochain défilement. *Perdre ce qu'on a déjà pour une page qui manque est une
      // punition disproportionnée.*
    } finally {
      setSuiteEnCours(false);
    }
  };

  const entete = (
    <View style={styles.entete}>
      <View style={styles.resume}>
        <Text style={styles.note}>{ratingLabel ?? '—'}</Text>
        <View style={styles.flex}>
          <Text style={styles.resumeCompte}>
            {ratingCount} avis {ratingCount > 1 ? 'vérifiés' : 'vérifié'}
          </Text>
          <Text style={styles.resumeAide}>déposés après une consultation payée</Text>
        </View>
      </View>

      {/*
        ⚠️ **Les barres sont des boutons.** C'est le cœur de cet écran : on ne lit pas quatre cents
        avis, on cherche ceux d'une note précise. Toucher « 1 ★ » répond à la seule question qui
        compte vraiment — *qu'est-ce qui s'est mal passé chez les mécontents ?*
      */}
      <View style={styles.barres}>
        {[...echelle].reverse().map(note => {
          const combien = distribution[String(note)] ?? 0;
          const part = ratingCount > 0 ? combien / ratingCount : 0;
          const actif = score === note;
          return (
            <Pressable
              key={note}
              onPress={() => setScore(actif ? null : note)}
              style={[styles.ligne, actif && styles.ligneActive]}
              accessibilityRole="button"
              accessibilityState={{selected: actif}}
              accessibilityLabel={`${combien} avis à ${note} étoile${note > 1 ? 's' : ''}${actif ? ', filtre actif' : ''}`}>
              <Text style={[styles.ligneNote, actif && styles.ligneNoteActive]}>{note}</Text>
              <Icon name="star" size={10} color="#C49128" />
              <View style={styles.piste}>
                <View style={[styles.remplissage, {width: `${Math.round(part * 100)}%`}]} />
              </View>
              <Text style={[styles.ligneCompte, actif && styles.ligneNoteActive]}>{combien}</Text>
            </Pressable>
          );
        })}
      </View>

      {score !== null && (
        <Pressable onPress={() => setScore(null)} style={styles.filtre} accessibilityRole="button">
          <Icon name="x" size={13} color={colors.accent500} />
          <Text style={styles.filtreTexte}>
            {total} avis à {score} étoile{score > 1 ? 's' : ''} · tout revoir
          </Text>
        </Pressable>
      )}

      <View style={styles.tris}>
        {TRIS.map(([id, label]) => {
          const on = sort === id;
          return (
            <Pressable
              key={id}
              onPress={() => setSort(id)}
              style={[styles.tri, on && styles.triOn]}
              accessibilityRole="button"
              accessibilityState={{selected: on}}>
              <Text style={[styles.triTexte, on && styles.triTexteOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />

      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle} numberOfLines={1}>
          Avis sur {professionalName}
        </Text>
      </View>

      {status === 'error' ? (
        <ErrorState onRetry={charger} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.createdAt}-${i}`}
          contentContainerStyle={styles.contenu}
          ListHeaderComponent={entete}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={chargerLaSuite}
          ListEmptyComponent={
            status === 'loading' ? (
              <LoadingState label="Chargement des avis…" />
            ) : (
              <Card>
                <Text style={styles.vide}>
                  {score !== null
                    ? `Personne n’a mis ${score} étoile${score > 1 ? 's' : ''} à ce soignant.`
                    : 'Ce soignant n’a pas encore reçu d’avis.'}
                </Text>
              </Card>
            )
          }
          renderItem={({item}) => (
            <Card>
              <View style={styles.avisEntete}>
                <View style={styles.etoiles}>
                  {echelle.map(n => (
                    <Icon key={n} name="star" size={12} color={n <= item.score ? '#C49128' : colors.borderSubtle} />
                  ))}
                </View>
                <Text style={styles.avisDate}>{formatDateCourte(item.createdAt)}</Text>
              </View>

              {/*
                ⚠️ **La fidélité à la place du nom.** Un patient qui revient est le signal le plus
                fort qui existe, et il ne nomme personne. À la première consultation, on dit ce
                qu'on peut dire : que l'avis est adossé à une consultation payée.
              */}
              <View style={styles.preuve}>
                <Icon name="shield-check" size={12} color={colors.success} />
                <Text style={styles.preuveTexte}>
                  {item.consultationsWithPro > 1
                    ? `Patient revenu ${item.consultationsWithPro} fois chez ce soignant`
                    : 'Avis vérifié · consultation payée'}
                </Text>
              </View>

              {item.comment ? (
                <Text style={styles.avisTexte}>{item.comment}</Text>
              ) : (
                <Text style={styles.avisSansTexte}>Cette personne a noté sans écrire de commentaire.</Text>
              )}
            </Card>
          )}
          ListFooterComponent={
            items.length === 0 ? null : suiteEnCours ? (
              <View style={styles.pied}>
                <ActivityIndicator color={colors.accent500} />
              </View>
            ) : (
              /*
                ⚠️ On dit toujours OÙ l'on en est. « 20 avis sur 400 » sans la suite ferait croire
                qu'il n'y en a que vingt ; *un total qu'on affiche sans dire ce qu'on en montre est
                la moitié d'une information.*
              */
              <Text style={styles.pied}>
                {items.length >= total ? `Tous les avis sont affichés (${total})` : `${items.length} avis affichés sur ${total}`}
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    root: {flex: 1, backgroundColor: colors.bg},

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    headerTitle: {flex: 1, fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},

    contenu: {padding: 16, gap: 10, paddingBottom: 28},
    entete: {gap: 12, marginBottom: 4},

    resume: {flexDirection: 'row', alignItems: 'center', gap: 12},
    note: {fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.2, color: colors.textPrimary},
    resumeCompte: {fontFamily: fonts.body, fontWeight: '700', fontSize: 13.5, color: colors.textPrimary},
    resumeAide: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 1},

    barres: {gap: 3},
    ligne: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm},
    ligneActive: {backgroundColor: colors.bgMuted},
    ligneNote: {fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary, width: 9, textAlign: 'right'},
    ligneNoteActive: {color: colors.accent500, fontWeight: '700'},
    piste: {flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.borderSubtle, overflow: 'hidden'},
    remplissage: {height: 7, borderRadius: 4, backgroundColor: '#C49128'},
    ligneCompte: {fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary, width: 26, textAlign: 'right'},

    filtre: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start'},
    filtreTexte: {fontFamily: fonts.body, fontSize: 12, fontWeight: '600', color: colors.accent500},

    tris: {flexDirection: 'row', gap: 7},
    tri: {paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle},
    triOn: {backgroundColor: colors.accent500, borderColor: colors.accent500},
    triTexte: {fontFamily: fonts.body, fontSize: 12, fontWeight: '600', color: colors.textSecondary},
    triTexteOn: {color: '#fff'},

    avisEntete: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    etoiles: {flexDirection: 'row', gap: 2},
    avisDate: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary},
    preuve: {flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7},
    preuveTexte: {fontFamily: fonts.body, fontSize: 11, fontWeight: '600', color: colors.textSecondary},
    avisTexte: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.textPrimary, marginTop: 8},
    avisSansTexte: {fontFamily: fonts.body, fontSize: 12.5, fontStyle: 'italic', color: colors.textTertiary, marginTop: 8},

    vide: {fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
    pied: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, textAlign: 'center', paddingVertical: 16},
  });
