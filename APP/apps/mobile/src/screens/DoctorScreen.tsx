/**
 * Profil du soignant — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens.jsx (DoctorView),
 * branché sur GET /v1/directory/:id (M05). Les TARIFS n'apparaissent QUE sur cet écran (règle handoff §5).
 * Footer collant : en ligne → « Initier la consultation » (poignée de main M06) ;
 * hors ligne → cloche « M'avertir quand il est disponible » (CU-05-05 / EF-05-06).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Avatar, Badge, Banner, Card, IconButton, PrimaryButton, VerifiedBadge, VerifiedTag} from '../components/ui';
import {AvatarViewer} from '../components/AvatarViewer';
import {FeuilleSignalement} from '../components/FeuilleSignalement';
import {useDialog} from '../components/Dialog';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {DirectoryOffer} from '../lib/contracts';
import {api} from '../services/api';
import {alertAvailability, DoctorProfileVM, fetchDoctorProfile, formatXaf} from '../services/directory';
import {fonts, Palette} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type Status = 'loading' | 'ready' | 'error';

export function DoctorScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Doctor'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const {id} = route.params;
  const [doctor, setDoctor] = useState<DoctorProfileVM | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [alerting, setAlerting] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [signaler, setSignaler] = useState(false);
  /**
   * L'offre que le patient a cochée. `null` tant que la fiche n'est pas chargée — et **posée sur la
   * MOINS CHÈRE** dès qu'elle l'est.
   *
   * ⚠️ Pourquoi une case déjà cochée, et pourquoi celle-là. Ne rien cocher obligerait à choisir même
   * quand il n'y a qu'une offre, et laisserait le prix du bas vide au moment où l'on décide. Cocher
   * la moins chère ne peut jamais coûter à quelqu'un qui n'a pas regardé : *un défaut qui pousse
   * vers la dépense n'est pas un défaut, c'est une vente.*
   */
  const [offerId, setOfferId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const vm = await fetchDoctorProfile(id);
      setDoctor(vm);
      setOfferId(vm.consultOffers[0]?.id ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /*
    L'offre retenue, avec son filet : un identifiant qui ne correspond à rien — la fiche s'est
    rechargée, le soignant a retiré cette offre entre-temps — retombe sur la moins chère plutôt que
    de laisser l'écran sans prix. *Une sélection périmée est une absence de sélection, pas une
    erreur à afficher.*
  */
  const offreChoisie: DirectoryOffer | null =
    doctor?.consultOffers.find(o => o.id === offerId) ?? doctor?.consultOffers[0] ?? null;

  const onInitiate = async () => {
    if (!doctor) {
      return;
    }
    if (!offreChoisie) {
      await alert({title: 'Indisponible', message: "Ce soignant n'a pas d'offre de consultation active pour l'instant."});
      return;
    }
    setInitiating(true);
    try {
      /*
        ⚠️ **C'est l'offre COCHÉE qui part**, pas la première de la liste. Le serveur fige ensuite
        son prix, son libellé et sa durée sur la poignée de main (chantier 118) : ce que le patient
        vient de lire est exactement ce qu'il paiera, et ce que le reçu portera.
      */
      const hs = await api.initiateHandshake({offerId: offreChoisie.id});
      navigation.navigate('Handshake', {
        handshakeId: hs.id,
        professionalName: doctor.name,
        amountXaf: offreChoisie.priceXaf,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Action impossible — réessayez.';
      await alert({title: "Impossible d'initier", message: msg});
    } finally {
      setInitiating(false);
    }
  };

  const onAlert = async () => {
    if (!doctor) {
      return;
    }
    setAlerting(true);
    try {
      await alertAvailability(doctor.id);
      await alert({title: 'Alerte posée', message: `Vous serez averti dès que ${doctor.name} repasse en ligne (valable 7 jours).`});
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Action impossible — réessayez.';
      await alert({title: 'Oups', message: msg});
    } finally {
      setAlerting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Profil du soignant</Text>
      </View>

      {status === 'loading' && <LoadingState label="Chargement du profil…" />}
      {status === 'error' && <ErrorState onRetry={load} />}

      {status === 'ready' && doctor && (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Identité */}
            <View style={styles.identity}>
              <Pressable onPress={() => setAvatarOpen(true)} hitSlop={6} accessibilityLabel={`Voir la photo de ${doctor.name}`}>
                <Avatar name={doctor.name} size={68} online={doctor.online} />
              </Pressable>
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {doctor.name}
                  </Text>
                  <VerifiedBadge size={18} />
                </View>
                <Text style={styles.spec}>{doctor.spec}</Text>
                <View style={{marginTop: 7}}>
                  <VerifiedTag />
                </View>
                <View style={styles.badgeRow}>
                  <Badge tone={doctor.online ? 'success' : 'neutral'} dot>
                    {doctor.online ? 'En ligne' : 'Hors ligne'}
                  </Badge>
                  <Badge tone="neutral" icon="map-pin">
                    {doctor.zone}
                  </Badge>
                </View>
              </View>
            </View>

            {/* Stats segmentées */}
            <Card padding={0}>
              <View style={styles.statsRow}>
                {([
                  ['star', doctor.ratingLabel ?? 'Nouveau', doctor.reviews > 0 ? `${doctor.reviews} avis` : 'récent'],
                  ['clock', offreChoisie != null ? `${offreChoisie.durationMin} min` : '—', 'par session'],
                  ['send', doctor.resp ?? '—', 'réponse'],
                ] as [IconName, string, string][]).map(([ic, v, l], i) => (
                  <View key={l} style={[styles.stat, i > 0 && styles.statBorder]}>
                    <Icon name={ic} size={15} />
                    <Text style={styles.statNum}>{v}</Text>
                    <Text style={styles.statLbl}>{l}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/*
              ── Ce qui SE VEND, et ce qui est INCLUS (chantier 120, 15/09/2026) ────────────────

              Une seule liste « Tarifs » portait jusqu'ici trois choses de natures différentes : la
              consultation qu'on achète, le tarif de suivi qu'on n'achète pas ici, et l'ordonnance
              qui ne s'achète pas du tout. Alignées avec un prix à droite, elles se lisaient comme
              un menu — dont deux lignes sur trois n'étaient pas commandables.

              *Ce qui porte un prix dans une même colonne se lit comme ce qu'on peut choisir.* Les
              deux sont donc séparées : ce qu'on choisit ici, puis ce qui vient avec.
            */}
            {/*
              ⚠️ **Le titre n'invite à choisir que s'il y a un choix.** Mesuré en ligne le 15/09 : le
              seul soignant de l'annuaire n'a **qu'une** offre active — « Choisissez votre
              consultation » se serait affiché au-dessus d'une ligne unique et non cochable.

              C'est la même règle que la case à cocher absente, appliquée au mot : *inviter à choisir
              là où il n'y a rien à choisir fait chercher une option qui n'existe pas.*
            */}
            <SectionLabel>{doctor.consultOffers.length > 1 ? 'Choisissez votre consultation' : 'Consultation'}</SectionLabel>
            <Card padding={0}>
              <View style={styles.tariffs}>
                {doctor.consultOffers.length === 0 ? (
                  <TariffRow
                    icon="stethoscope"
                    title="Aucune consultation proposée"
                    sub="ce soignant n’a pas d’offre active en ce moment"
                    price="—"
                    first
                  />
                ) : doctor.consultOffers.length === 1 ? (
                  /*
                    Une seule offre : pas de case à cocher. *Un interrupteur qui ne change rien est
                    pire qu'un interrupteur absent* — il fait croire à un choix, et fait chercher
                    l'autre branche.
                  */
                  <TariffRow
                    icon="stethoscope"
                    title={doctor.consultOffers[0].label}
                    sub={`${doctor.consultOffers[0].durationMin} min · messagerie`}
                    price={formatXaf(doctor.consultOffers[0].priceXaf)}
                    first
                  />
                ) : (
                  doctor.consultOffers.map((o, i) => {
                    const coche = offreChoisie?.id === o.id;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => setOfferId(o.id)}
                        style={[styles.tariffRow, i > 0 && styles.tariffBorder]}
                        accessibilityRole="radio"
                        accessibilityState={{selected: coche}}
                        accessibilityLabel={`${o.label}, ${o.durationMin} minutes, ${formatXaf(o.priceXaf)}`}>
                        <View style={[styles.radio, coche && styles.radioOn]}>{coche && <View style={styles.radioDot} />}</View>
                        <View style={styles.flex}>
                          <Text style={styles.tariffTitle} numberOfLines={2}>
                            {o.label}
                          </Text>
                          <Text style={styles.tariffSub}>{o.durationMin} min · messagerie</Text>
                        </View>
                        <Text style={[styles.tariffPrice, coche && {color: colors.accent500}]}>{formatXaf(o.priceXaf)}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </Card>
            {doctor.consultOffers.length > 1 && (
              <Text style={styles.choixAide}>
                Vous ne payez qu’une seule fois : le tarif coché couvre toute la consultation.
              </Text>
            )}

            <SectionLabel>Inclus, sans supplément</SectionLabel>
            <Card padding={0}>
              <View style={styles.tariffs}>
                <TariffRow
                  icon="file-medical"
                  title="Ordonnance signée"
                  sub="si le soignant en établit une"
                  price="Gratuit"
                  first
                  free
                />
              </View>
            </Card>

            {/*
              ⚠️ **Le suivi n'entre pas dans le choix** — c'est le tarif de quelqu'un qu'on suit
              DÉJÀ, proposé par le soignant après un compte-rendu. Le chantier 65 avait déjà réparé
              une fois le fait qu'il se vendait comme une première consultation ; le remettre dans
              une liste cochable le revendrait de la même manière.

              Il reste ANNONCÉ, hors du choix : le taire laisserait croire qu'un second rendez-vous
              se repaie plein tarif — et c'est justement ce qui fait renoncer à revenir.
            */}
            {doctor.followPrice != null && (
              <View style={styles.suiviBloc}>
                <Icon name="refresh" size={14} color={colors.textTertiary} />
                <Text style={styles.suiviTexte}>
                  <Text style={styles.suiviFort}>Session de suivi · {formatXaf(doctor.followPrice)}</Text> — elle ne s’achète pas
                  ici : le soignant vous la propose après un compte-rendu, si un suivi est nécessaire.
                </Text>
              </View>
            )}

            {/*
              ⚠️ **Plus de « pré-consultation », ici non plus** — chantier 111, 14/09/2026.

              Le chantier 105 l'avait retirée du parcours ; cette carte en parlait encore sur la
              fiche du soignant, et promettait un formulaire qui n'existe plus. *Une promesse qui
              survit à la fonctionnalité qu'elle décrivait est un mensonge poli.*

              Ce que le patient fait maintenant : il ouvre la conversation et il parle — texte, note
              vocale, photo ou vidéo. C'est son premier message qui démarre la séance.
            */}

            <Banner tone="info" title="Poignée de main avant paiement">
              Aucun franc n'est débité tant que le soignant n'a pas confirmé être prêt. Remboursement automatique en cas de défaillance.
            </Banner>

            {/*
              ── Signaler ce soignant (chantier 59, 06/09/2026) ─────────────────────────────────

              En BAS de la fiche, et volontairement discret : ce n'est pas ce qu'on vient y faire.
              Mais quand on en a besoin, il faut le trouver sans chercher — et sur cet écran, tout
              ce qu'il y a à savoir de la personne est déjà lu.

              Il n'est PAS dans l'en-tête : le bouton qui s'y trouve — revenir — est celui pour
              lequel on vient, et un second le serre. Dans une SESSION, où le drapeau est en
              en-tête, il n'existe aucun autre chemin ; ici, la fiche entière est devant nous.
            */}
            <Pressable onPress={() => setSignaler(true)} style={styles.signalerRow} accessibilityRole="button">
              <Icon name="flag" size={14} color={colors.textTertiary} />
              <Text style={styles.signalerText}>Signaler ce soignant</Text>
            </Pressable>
          </ScrollView>

          {/*
            ── « Sur devis » était un mensonge (chantier 65, 07/09/2026) ───────────────────────

            Quand un soignant n'a **aucune offre active**, cet écran affichait « Sur devis » et
            proposait quand même « Initier la consultation ». Le bouton menait à une impasse — le
            serveur exige un `offerId` —, et surtout : **il n'existe aucun mécanisme de devis dans
            ULAMU.** Un prix est une offre active, ou rien. « Sur devis » invitait à attendre une
            négociation qui n'aura jamais lieu.

            ⚠️ Mesuré en production le 07/09 : le SEUL soignant de l'annuaire est exactement dans ce
            cas — ses deux offres sont désactivées. C'est donc ce que voit aujourd'hui n'importe quel
            patient qui ouvre l'application.

            L'écran dit maintenant ce qui est vrai, et propose le seul geste qui ait un sens : être
            prévenu. *Un bouton qui ne peut pas aboutir est pire qu'un bouton absent.*
          */}
          <View style={styles.footer}>
            <View style={styles.flex}>
              {/*
                ⚠️ **Le prix du bas est celui de l'offre COCHÉE**, plus « la première trouvée ». Un
                bouton qui engage doit porter le montant qu'il engage : *le chiffre sur lequel on
                appuie et celui qu'on paiera sont le même chiffre, ou l'écran ment.*
              */}
              <Text style={styles.footerPrice}>
                {offreChoisie != null ? formatXaf(offreChoisie.priceXaf) : 'Pas de consultation'}
              </Text>
              {/*
                ⚠️ **Deux lignes, pas une** — vu sur le téléphone le 15/09 : à une seule ligne,
                « débité après la poignée de main » se coupait en « …poignée de m… ».

                La limite existe pour qu'un libellé d'offre bavard ne fasse pas gonfler le pied ;
                elle ne doit pas manger la phrase qui dit QUAND l'argent part. *Un garde-fou posé
                contre un cas rare ne doit pas abîmer le cas ordinaire.*
              */}
              <Text style={styles.footerSub} numberOfLines={2}>
                {offreChoisie === null
                  ? 'ce soignant ne propose pas de consultation en ce moment'
                  : !doctor.online
                    ? 'indisponible pour le moment'
                    : doctor.consultOffers.length > 1
                      ? `${offreChoisie.label} · débité après la poignée de main`
                      : 'débité après la poignée de main'}
              </Text>
            </View>
            {doctor.online && offreChoisie !== null ? (
              <PrimaryButton title="Initier la consultation" iconLeft="stethoscope" loading={initiating} onPress={onInitiate} />
            ) : (
              <PrimaryButton title="M'avertir" iconLeft="bell" loading={alerting} onPress={onAlert} />
            )}
          </View>
        </>
      )}
      {doctor && <AvatarViewer visible={avatarOpen} uri={null} name={doctor.name} onClose={() => setAvatarOpen(false)} />}
      <FeuilleSignalement
        visible={signaler}
        onClose={() => setSignaler(false)}
        cible="PROFILE"
        cibleId={id}
        quoi="ce soignant"
      />
    </SafeAreaView>
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{String(children).toUpperCase()}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function TariffRow({icon, title, sub, price, first, free}: {icon: IconName; title: string; sub: string; price: string; first?: boolean; free?: boolean}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.tariffRow, !first && styles.tariffBorder]}>
      <Icon name={icon} size={16} color={colors.textTertiary} />
      <View style={styles.flex}>
        <Text style={styles.tariffTitle}>{title}</Text>
        <Text style={styles.tariffSub}>{sub}</Text>
      </View>
      <Text style={[styles.tariffPrice, free && {color: colors.success}]}>{price}</Text>
    </View>
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
  signalerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14},
  signalerText: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textTertiary},

  content: {padding: 16, gap: 14, paddingBottom: 110},

  // Identité
  identity: {flexDirection: 'row', gap: 14, alignItems: 'center'},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  name: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary, flexShrink: 1},
  spec: {fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, marginTop: 2},
  badgeRow: {flexDirection: 'row', gap: 6, marginTop: 8},

  // Stats
  statsRow: {flexDirection: 'row'},
  stat: {flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 8},
  statBorder: {borderLeftWidth: 1, borderLeftColor: colors.borderSubtle},
  statNum: {fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
  statLbl: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary},

  // Tarifs
  tariffs: {paddingHorizontal: 14},
  tariffRow: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11},
  tariffBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  tariffTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  tariffSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary},
  tariffPrice: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary},

  // Choix de l'offre — mêmes proportions que le choix d'opérateur de l'écran de paiement, pour que
  // le geste soit le même aux deux endroits où l'on choisit quelque chose qui se paie.
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center'},
  radioOn: {borderColor: colors.accent500},
  radioDot: {width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent500},
  choixAide: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: -6, paddingHorizontal: 2},

  // Suivi — annoncé, jamais cochable
  suiviBloc: {flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2},
  suiviTexte: {flex: 1, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: colors.textTertiary},
  suiviFort: {fontWeight: '700', color: colors.textSecondary},

  // Section label
  sectionLabel: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sectionLabelText: {fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textTertiary},
  sectionLine: {flex: 1, height: 1, backgroundColor: colors.borderSubtle},

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerPrice: {fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4, color: colors.textPrimary},
  footerSub: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary},
});
