/**
 * Trouver un médicament — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens2.jsx (MedsScreen).
 * Le modèle « signature » d'ULAMU (D-009), branché M12 :
 *  1) recherche du catalogue (`GET /v1/medicaments`) pour composer les produits ;
 *  2) disponibilité ANONYME et gratuite par arrondissement (`POST /v1/search`) — ni nom, ni prix, ni position ;
 *  3) dévoilement-réservation PAYÉ (prix PM-03 lu en direct, `POST /v1/disclosures`, MoMo) — RIEN n'est révélé sans paiement (CU-12-02) ;
 *  4) après confirmation (auto MoMo en dev), la pharmacie est révélée + réservation 24 h (`GET /v1/disclosures/:id`).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Banner, Card, IconButton, PrimaryButton} from '../components/ui';
import {Grain} from '../components/Grain';
import {useDialog} from '../components/Dialog';
import {EmptyState} from '../components/ScreenState';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {CatalogItem, DisclosureView, MomoOperator, SearchItem} from '../lib/contracts';
import {formatXaf} from '../services/directory';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const OPERATORS: {code: MomoOperator; label: string}[] = [
  {code: 'MTN_MOMO', label: 'MTN MoMo'},
  {code: 'AIRTEL_MONEY', label: 'Airtel Money'},
];
const TERMINAL: string[] = ['EXPIRED', 'REFUNDED'];
const medLabel = (m: {dci: string; dosage: string | null}) => `${m.dci}${m.dosage ? ` ${m.dosage}` : ''}`;
const mmss = (s: number) => `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;

type Phase = 'compose' | 'results' | 'paying' | 'revealed';

export function MedsScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Meds'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {alert} = useDialog();
  const [district, setDistrict] = useState('Talangaï');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<CatalogItem[]>([]);
  const [picked, setPicked] = useState<CatalogItem[]>([]);
  const [phase, setPhase] = useState<Phase>('compose');
  const [pharmacyCount, setPharmacyCount] = useState(0);
  const [suggestAlert, setSuggestAlert] = useState(false);
  const [operator, setOperator] = useState<MomoOperator>('MTN_MOMO');
  const [disclosure, setDisclosure] = useState<DisclosureView | null>(null);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // District par défaut = celui du patient.
  useEffect(() => {
    api.getMe().then(m => m.district && setDistrict(m.district)).catch(() => undefined);
  }, []);

  // Prix du dévoilement (PM-03) — lu une fois, jamais en dur (#bug audit).
  useEffect(() => {
    api.getDisclosurePrice().then(r => setPrice(r.amountXaf)).catch(() => undefined);
  }, []);

  const priceLabel = price != null ? formatXaf(price) : '…';

  // Recherche catalogue (debounce 350 ms).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchCatalog(q).then(r => setMatches(r.items)).catch(() => setMatches([]));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const add = (m: CatalogItem) => {
    if (!picked.some(p => p.id === m.id)) {
      setPicked([...picked, m]);
    }
    setQuery('');
    setMatches([]);
  };
  const remove = (id: string) => setPicked(picked.filter(p => p.id !== id));

  const items: SearchItem[] = picked.map(p => ({medicamentId: p.id, quantity: 1}));

  const runSearch = async () => {
    if (items.length === 0) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.searchAvailability({district, items});
      const d = res.districts.find(x => x.district === district) ?? res.districts[0];
      setPharmacyCount(d?.pharmacyCount ?? 0);
      setSuggestAlert(res.suggestAlert);
      setPhase('results');
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Recherche impossible.'});
    } finally {
      setBusy(false);
    }
  };

  const pollDisclosure = useCallback((id: string) => {
    const tick = async () => {
      try {
        const d = await api.getDisclosure(id);
        if (d.status === 'ACTIVE' && d.facility) {
          if (timer.current) clearInterval(timer.current);
          setDisclosure(d);
          setPhase('revealed');
        } else if (TERMINAL.includes(d.status)) {
          if (timer.current) clearInterval(timer.current);
          setPhase('results');
        }
      } catch {
        /* retry au prochain tick */
      }
    };
    tick();
    timer.current = setInterval(tick, 2500);
  }, []);

  const reveal = async () => {
    setBusy(true);
    setPhase('paying');
    try {
      const d = await api.requestDisclosure({district, items, operator});
      pollDisclosure(d.id);
    } catch (e) {
      setPhase('results');
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Dévoilement impossible.'});
    } finally {
      setBusy(false);
    }
  };

  const poseAlert = async () => {
    try {
      await api.createMedAlert({district, medicamentIds: picked.map(p => p.id)});
      await alert({title: 'Alerte posée', message: 'Vous serez prévenu dès qu\'une pharmacie aura ces produits.'});
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Action impossible.'});
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Trouver un médicament</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Zone de composition (toujours visible) */}
        <View style={styles.districtRow}>
          <Icon name="map-pin" size={13} color={colors.textTertiary} />
          <Text style={styles.districtText}>Arrondissement : {district}</Text>
        </View>

        {phase === 'compose' && (
          <>
            <View style={styles.searchWrap}>
              <Icon name="search" size={16} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Tapez un médicament (ex : Amlodipine)…"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="none"
              />
            </View>
            {matches.length > 0 && (
              <Card padding={0}>
                {matches.map((m, i) => (
                  <Pressable key={m.id} onPress={() => add(m)} style={[styles.matchRow, i > 0 && styles.matchBorder]}>
                    <Icon name="pill" size={15} variant="tile" />
                    <View style={styles.flex}>
                      <Text style={styles.matchName}>{medLabel(m)}</Text>
                      {m.commercialNames.length > 0 && <Text style={styles.matchAlt}>{m.commercialNames.join(', ')}</Text>}
                    </View>
                    <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.2} />
                  </Pressable>
                ))}
              </Card>
            )}

            {picked.length > 0 && (
              <View style={styles.chips}>
                {picked.map(p => (
                  <Pressable key={p.id} onPress={() => remove(p.id)} style={styles.chip}>
                    <Text style={styles.chipText}>{medLabel(p)}</Text>
                    <Icon name="x" size={12} color={colors.accent} strokeWidth={2.4} />
                  </Pressable>
                ))}
              </View>
            )}

            <PrimaryButton title="Rechercher la disponibilité" iconRight="search" loading={busy} disabled={picked.length === 0} onPress={runSearch} />
            <Text style={styles.foot}>Recherche anonyme et gratuite — aucune pharmacie ni prix n'est révélé à cette étape.</Text>
          </>
        )}

        {/* Résultat anonyme */}
        {phase === 'results' && (
          <Card padding={15}>
            <View style={styles.resHead}>
              <View style={[styles.resIcon, pharmacyCount > 0 ? styles.resIconOk : styles.resIconKo]}>
                <Icon name={pharmacyCount > 0 ? 'pill' : 'search'} size={18} color={pharmacyCount > 0 ? colors.successDot : colors.textTertiary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.resTitle}>
                  {pharmacyCount > 0 ? `${pharmacyCount} pharmacie${pharmacyCount > 1 ? 's' : ''} ${pharmacyCount > 1 ? 'ont' : 'a'} vos produits` : 'Aucune pharmacie pour l\'instant'}
                </Text>
                <Text style={styles.resSub}>Information anonyme et gratuite · {district}</Text>
              </View>
            </View>

            {pharmacyCount > 0 ? (
              <>
                {/* Pharmacies masquées */}
                {Array.from({length: Math.min(pharmacyCount, 3)}).map((_, i) => (
                  <View key={i} style={styles.maskRow}>
                    <View style={styles.maskIcon}><Icon name="lock" size={13} color={colors.textDisabled} /></View>
                    <View style={styles.flex}>
                      <View style={[styles.maskBar, {width: 120 + i * 16}]} />
                      <View style={[styles.maskBar, {width: 70 + i * 10, marginTop: 5, opacity: 0.7}]} />
                    </View>
                    <Text style={styles.inStock}>En stock</Text>
                  </View>
                ))}
                <Text style={styles.section}>Opérateur</Text>
                <View style={styles.opRow}>
                  {OPERATORS.map(op => {
                    const on = operator === op.code;
                    return (
                      <Pressable key={op.code} onPress={() => setOperator(op.code)} style={[styles.opChip, on && styles.opChipOn]}>
                        <Text style={[styles.opChipText, on && styles.opChipTextOn]}>{op.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <PrimaryButton title={`Dévoiler & réserver · ${priceLabel}`} iconLeft="eye" loading={busy} onPress={reveal} />
                <View style={styles.guarantee}>
                  <Icon name="shield-check" size={12} color={colors.successDot} />
                  <Text style={styles.guaranteeText}>Disponibilité garantie ou remboursé</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.resSub}>Aucune pharmacie ne couvre ces produits dans cet arrondissement pour l'instant.</Text>
                {suggestAlert && <PrimaryButton title="M'avertir si disponible" iconLeft="bell" onPress={poseAlert} />}
              </>
            )}
            <Pressable onPress={() => setPhase('compose')} style={styles.backLink}>
              <Text style={styles.backLinkText}>Modifier ma recherche</Text>
            </Pressable>
          </Card>
        )}

        {/* Paiement en cours */}
        {phase === 'paying' && (
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.waitingTitle}>Confirmez sur votre téléphone</Text>
            <Text style={styles.waitingSub}>Validez le paiement de {disclosure?.amountXaf != null ? formatXaf(disclosure.amountXaf) : priceLabel} avec votre code {OPERATORS.find(o => o.code === operator)?.label}. La pharmacie sera révélée automatiquement.</Text>
          </View>
        )}

        {/* Révélé */}
        {phase === 'revealed' && disclosure?.facility && (
          <Card padding={16}>
            <View style={styles.revealHead}>
              <Icon name="pill" size={20} variant="tile" style={styles.revealIcon} />
              <View style={styles.flex}>
                <Text style={styles.revealName}>{disclosure.facility.name}</Text>
                <View style={styles.revealLoc}>
                  <Icon name="map-pin" size={11} color={colors.textTertiary} />
                  <Text style={styles.revealQuarter}>{disclosure.facility.quarter ?? district}</Text>
                </View>
              </View>
              <View style={styles.reservedBadge}><Text style={styles.reservedText}>Réservé</Text></View>
            </View>

            <Banner tone="info" title={`Réservation valable ${mmss(disclosure.remainingSeconds)}`}>
              Le stock est bloqué pour vous. Présentez-vous en pharmacie avec votre ordonnance si nécessaire.
            </Banner>

            {disclosure.facility.phone && (
              <PrimaryButton title="Appeler la pharmacie" iconLeft="phone" onPress={() => Linking.openURL(`tel:${disclosure.facility!.phone}`)} />
            )}
            <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
              <Text style={styles.backLinkText}>Terminer</Text>
            </Pressable>
          </Card>
        )}

        {phase === 'compose' && picked.length === 0 && matches.length === 0 && query.length < 2 && (
          <EmptyState icon="pill" title="Trouvez vos médicaments près de chez vous." hint={`Cherchez un produit : ULAMU vous dit anonymement combien de pharmacies l'ont, puis révèle laquelle pour ${priceLabel}.`} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: colors.bg},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
  content: {padding: 16, gap: 12, paddingBottom: 28},

  districtRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  districtText: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary},

  searchWrap: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.field, paddingHorizontal: 14, height: 48},
  searchInput: {flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary},

  matchRow: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12},
  matchBorder: {borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  matchName: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  matchAlt: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},

  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.pill, paddingLeft: 12, paddingRight: 9, paddingVertical: 7},
  chipText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.accent},

  foot: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, textAlign: 'center'},

  resHead: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12},
  resIcon: {width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  resIconOk: {backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder},
  resIconKo: {backgroundColor: colors.bgMuted},
  resTitle: {fontFamily: fonts.display, fontSize: 14.5, color: colors.textPrimary},
  resSub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2},

  maskRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  maskIcon: {width: 30, height: 30, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
  maskBar: {height: 9, borderRadius: 4, backgroundColor: colors.bgMuted},
  inStock: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, backgroundColor: colors.bgMuted, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4},

  section: {fontFamily: fonts.displayBold, fontSize: 13, color: colors.textPrimary, marginTop: 14, marginBottom: 8},
  opRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  opChip: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: colors.borderSubtle},
  opChipOn: {borderColor: colors.accent500, backgroundColor: colors.accent50},
  opChipText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textSecondary},
  opChipTextOn: {color: colors.accent},

  guarantee: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8},
  guaranteeText: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary},

  backLink: {alignItems: 'center', paddingVertical: 8},
  backLinkText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.accent},

  waiting: {alignItems: 'center', gap: 12, paddingVertical: 24},
  waitingTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary, textAlign: 'center'},
  waitingSub: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 12},

  revealHead: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12},
  revealIcon: {width: 40, height: 40, borderRadius: radius.md}, // couleur/bordure possédées par <Icon variant="tile">
  revealName: {fontFamily: fonts.display, fontSize: 15.5, color: colors.textPrimary},
  revealLoc: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  revealQuarter: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary},
  reservedBadge: {backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4},
  reservedText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 11, color: colors.success},
  });
