/**
 * Centre de notifications — reproduction de Maquettes_ULAMU/ui_kits/patient_mobile/screens2.jsx (NotifScreen).
 * Branché M14 : `GET /v1/notifications/me` (historique in-app), `POST /me/:id/read` (idempotent D-046).
 * Rappel EF-14-06 : titres génériques, JAMAIS de contenu médical (la liste s'y conforme côté serveur).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Card, IconButton, Switch} from '../components/ui';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon, IconName} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {api} from '../services/api';
import {useDialog} from '../components/Dialog';
import {NotificationCategory, NotificationItem, NotificationPreference} from '../lib/contracts';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

/*
  ── Les intitulés des catégories ne sont plus écrits ici (dette n°18, 03/09/2026) ──────────────

  Cet écran portait `CAT_LABEL`, son propre dictionnaire des catégories. Le web portait le sien.
  **Les deux avaient déjà divergé** : « Consultations & soins » ici, « Consultations » là-bas ;
  « Système & compte » ici, « Service » là-bas. Deux utilisateurs de la même plateforme ne lisaient
  pas le même nom pour le même réglage.

  C'est aussi ce qui a fait qu'une phrase fausse — « réservations qui expirent » — a demandé DEUX
  chantiers pour disparaître : le 29 pour le web, le 30 pour cet écran.

  Le serveur sert désormais `label` et `help`, à côté du catalogue de modèles qui les décrit.

  ── Et « Rappels » disparaît sans qu'on ait à y penser ────────────────────────────────────────

  Le chantier 30 avait retiré cette entrée du dictionnaire, pour une raison vérifiée : **aucun
  modèle de notification ne porte la catégorie `reminder`** — son interrupteur ne coupait rien.
  Mais le retirer du dictionnaire ne la retirait pas de la LISTE : le serveur l'envoyait encore, et
  l'écran retombait sur la clé brute, affichant « reminder ».

  Le serveur ne sert plus que les catégories qui portent réellement un modèle, comptées dans le
  catalogue. La ligne a disparu des deux applications, et **reviendra d'elle-même le jour où un
  premier rappel sera écrit**.

  ⚠️ À ne pas confondre avec les RAPPELS DE MÉDICAMENTS (`/v1/reminders`, M14), qui existent
  toujours : ce sont des alarmes locales que le patient se pose, pas des notifications serveur.
*/

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Icône heuristique d'après la catégorie / le titre — titres génériques (EF-14-06). */
function iconFor(n: NotificationItem): IconName {
  const s = `${n.category} ${n.template} ${n.title}`.toLowerCase();
  if (s.includes('paie') || s.includes('rembours') || s.includes('payment') || s.includes('reçu')) return 'credit-card';
  if (s.includes('ordonnance') || s.includes('prescription')) return 'file-medical';
  if (s.includes('rappel') || s.includes('médic') || s.includes('reminder')) return 'pill';
  if (s.includes('session') || s.includes('consult') || s.includes('poignée') || s.includes('handshake')) return 'stethoscope';
  if (s.includes('réserv') || s.includes('expir') || s.includes('disclosure')) return 'clock';
  if (s.includes('sécur') || s.includes('critical') || s.includes('urgence')) return 'shield-check';
  return 'bell';
}

export function NotificationsScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Notifications'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {confirm} = useDialog();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.listNotifications();
      setItems(res.items);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (n: NotificationItem) => {
    if (n.readAt) {
      return;
    }
    setItems(prev => prev.map(x => (x.id === n.id ? {...x, readAt: new Date().toISOString()} : x)));
    api.markNotificationRead(n.id).catch(() => undefined);
  };

  const markAll = async () => {
    const unread = items.filter(x => !x.readAt);
    if (unread.length === 0) {
      return;
    }
    setItems(prev => prev.map(x => (x.readAt ? x : {...x, readAt: new Date().toISOString()})));
    await Promise.all(unread.map(n => api.markNotificationRead(n.id).catch(() => undefined)));
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  /**
   * Suppression d'UNE notification — confirmée, comme l'est déjà la suppression multiple.
   *
   * Les deux effacent définitivement, mais seule la seconde le demandait. Or c'est l'unitaire qui part
   * d'une petite corbeille collée au corps de la carte, elle-même pressable : c'est le geste le plus
   * facile à déclencher par erreur, et c'était le seul sans filet.
   */
  const removeOne = async (n: NotificationItem) => {
    const ok = await confirm({
      title: 'Supprimer cette notification ?',
      message: 'Cette suppression est définitive.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setItems(prev => prev.filter(x => x.id !== n.id)); // optimiste ; resync si échec
    api.deleteNotification(n.id).catch(() => load());
  };
  const removeSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) {
      return;
    }
    const ok = await confirm({
      title: `Supprimer ${ids.length} notification${ids.length > 1 ? 's' : ''} ?`,
      message: 'Cette suppression est définitive.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      danger: true,
    });
    if (!ok) {
      return;
    }
    setItems(prev => prev.filter(x => !selected.has(x.id)));
    exitSelect();
    api.deleteNotifications(ids).catch(() => load());
  };

  const hasUnread = items.some(x => !x.readAt);

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>{selectMode ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''}` : 'Notifications'}</Text>
        {selectMode ? (
          <>
            <Pressable onPress={removeSelected} hitSlop={6} disabled={selected.size === 0}>
              <Text style={[styles.markAll, {color: selected.size === 0 ? colors.textDisabled : colors.error}]}>Supprimer</Text>
            </Pressable>
            <Pressable onPress={exitSelect} hitSlop={6}>
              <Text style={styles.markAll}>Annuler</Text>
            </Pressable>
          </>
        ) : (
          <>
            {hasUnread && (
              <Pressable onPress={markAll} hitSlop={6}>
                <Text style={styles.markAll}>Tout lire</Text>
              </Pressable>
            )}
            {items.length > 0 && (
              <IconButton icon="trash" onPress={() => setSelectMode(true)} variant="tile" size={16} accessibilityLabel="Sélectionner pour supprimer" />
            )}
            <IconButton icon="settings" onPress={() => setPrefsOpen(true)} variant="tile" size={17} accessibilityLabel="Préférences de notifications" />
          </>
        )}
      </View>

      {status === 'loading' && <LoadingState label="Chargement de vos notifications…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState icon="bell" title="Aucune notification." hint="Vous serez averti ici des confirmations, rappels et mises à jour." />
            </Card>
          ) : (
            items.map(n => {
              const unread = !n.readAt;
              const isSel = selected.has(n.id);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => (selectMode ? toggleSelect(n.id) : markRead(n))}
                  onLongPress={() => {
                    setSelectMode(true);
                    toggleSelect(n.id);
                  }}
                  style={[styles.card, unread && styles.cardUnread, selectMode && isSel && styles.cardSelected]}>
                  {selectMode && (
                    <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                      {isSel && <Icon name="check" size={12} color="#fff" strokeWidth={2.4} />}
                    </View>
                  )}
                  <Icon name={iconFor(n)} size={16} variant="tile" style={styles.cardIcon} />
                  <View style={styles.flex}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                      {unread && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.cardBody}>{n.body}</Text>
                    <Text style={styles.cardWhen}>{relTime(n.createdAt)}</Text>
                  </View>
                  {!selectMode && (
                    <Pressable onPress={() => removeOne(n)} hitSlop={8} style={styles.cardTrash} accessibilityLabel="Supprimer cette notification">
                      <Icon name="trash" size={15} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })
          )}
          {items.length > 0 && (
            <View style={styles.footRow}>
              <Icon name="lock" size={11} color={colors.textTertiary} />
              <Text style={styles.footText}>Jamais de contenu médical sur l'écran verrouillé</Text>
            </View>
          )}
        </ScrollView>
      )}

      <PreferencesModal visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </SafeAreaView>
  );
}

function PreferencesModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [prefs, setPrefs] = useState<NotificationPreference[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    setErr(false);
    setPrefs(null);
    api
      .getNotificationPreferences()
      .then(r => setPrefs(r.preferences))
      .catch(() => setErr(true));
  }, []);

  // Recharge à CHAQUE ouverture (données fraîches) ; en cas d'échec → état d'erreur avec « Réessayer »
  // (et non une liste vide et muette).
  useEffect(() => {
    if (visible) {
      load();
    }
  }, [visible, load]);

  const toggle = (p: NotificationPreference, next: boolean) => {
    if (!p.adjustable) {
      return;
    }
    setPrefs(prev => (prev ?? []).map(x => (x.category === p.category ? {...x, enabled: next} : x)));
    api.setNotificationPreference({category: p.category as NotificationCategory, enabled: next}).catch(() => {
      // resync en cas d'échec
      api.getNotificationPreferences().then(r => setPrefs(r.preferences)).catch(() => undefined);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Préférences de notification</Text>
          <Text style={styles.sheetSub}>Choisissez ce dont vous voulez être averti. Les alertes critiques restent toujours actives (RM-14-02).</Text>
          {err ? (
            <View style={styles.prefError}>
              <Text style={styles.loading}>Impossible de charger les préférences.</Text>
              <Pressable onPress={load} style={styles.prefRetry}>
                <Text style={styles.prefRetryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : prefs === null ? (
            <Text style={styles.loading}>Chargement…</Text>
          ) : (
            prefs.map(p => {
              return (
                <View key={p.category} style={styles.prefRow}>
                  <View style={styles.flex}>
                    <Text style={styles.prefTitle}>{p.label}</Text>
                    {p.help ? <Text style={styles.prefSub}>{p.help}</Text> : null}
                  </View>
                  {p.adjustable ? (
                    <Switch value={p.enabled} onValueChange={next => toggle(p, next)} />
                  ) : (
                    <View style={styles.lockTag}>
                      <Icon name="lock" size={12} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
              );
            })
          )}
          <Pressable onPress={onClose} style={styles.sheetCancel}>
            <Text style={styles.sheetCancelText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: colors.bg},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  headerTitle: {flex: 1, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},
  markAll: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.accent},

  content: {padding: 16, gap: 10, paddingBottom: 24},
  card: {flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
  cardUnread: {borderColor: 'rgba(111,146,218,0.3)'},
  cardSelected: {borderColor: colors.accent500, backgroundColor: colors.accent50},
  checkbox: {width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center'},
  checkboxOn: {backgroundColor: colors.accent500, borderColor: colors.accent500},
  cardTrash: {width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  cardIcon: {width: 34, height: 34, borderRadius: radius.md}, // couleur possédée par <Icon variant="tile"> désormais
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  cardTitle: {flex: 1, fontFamily: fonts.body, fontWeight: '600', fontSize: 13, color: colors.textPrimary},
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent400},
  cardBody: {fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 2},
  cardWhen: {fontFamily: fonts.mono, fontSize: 9.5, color: colors.textDisabled, marginTop: 4},

  footRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6},
  footText: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary},

  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 10},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
  sheetSub: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginBottom: 4},
  loading: {fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, textAlign: 'center', paddingVertical: 16},
  prefError: {alignItems: 'center', paddingVertical: 8, gap: 8},
  prefRetry: {paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.button, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100},
  prefRetryText: {fontFamily: fonts.body, fontWeight: '700', fontSize: 13, color: colors.accent},
  prefRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  prefTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
  prefSub: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textTertiary, marginTop: 1},
  lockTag: {width: 36, height: 24, borderRadius: radius.pill, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center'},
  sheetCancel: {alignItems: 'center', paddingVertical: 8, marginTop: 4},
  sheetCancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
