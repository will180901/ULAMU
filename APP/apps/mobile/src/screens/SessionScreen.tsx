/**
 * Session de soin chronométrée — cœur de Maquettes_ULAMU/ui_kits/patient_mobile/session.jsx (SessionView).
 * États pilotés par le SERVEUR (M06) et interrogés en polling (pas de SSE) :
 *  • PREPARING : formulaire de pré-consultation → POST /pre-consultation DÉMARRE le décompteur (D-019) ;
 *  • ACTIVE    : messagerie TEXTE (GET/POST /messages), minuteur `remainingSeconds` serveur (RM-06-02),
 *                annulation possible tant que le pro n'a jamais répondu (EF-06-10) ;
 *  • ENDED     : fil en lecture seule + compte-rendu (versé au Carnet) + notation (POST /rating) ;
 *  • REFUNDED  : session remboursée (D-008).
 *  • ACTIVE : messages TEXTE + PHOTO (galerie) + VOICE (note vocale) — libs natives (image-picker, audio).
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Banner, IconButton, PrimaryButton} from '../components/ui';
import {ErrorState, LoadingState} from '../components/ScreenState';
import {Icon} from '../components/Icon';
import {Grain} from '../components/Grain';
import {dialogs} from '../components/Dialog';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api, getAuthToken} from '../services/api';
import {PickedImage, pickSessionImageAssets, sessionMediaUrl} from '../services/media';
import {cancelRecording, fileToBase64, startRecording, stopRecording} from '../services/audio';
import {ChatActionSheet} from '../components/ChatActionSheet';
import {MediaPreview} from '../components/MediaPreview';
import {MediaViewer} from '../components/MediaViewer';
import {VoiceNotePlayer} from '../components/VoiceNotePlayer';
import {MessageReaction, MessageView, SessionView} from '../lib/contracts';
import {uuidv4} from '../lib/uuid';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
const hm = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function SessionScreen({route, navigation}: NativeStackScreenProps<AppStackParamList, 'Session'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {sessionId} = route.params;
  const [session, setSession] = useState<SessionView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [docName, setDocName] = useState('Votre soignant');
  // Présence RÉELLE du soignant (annuaire M05, `online`) — pas un texte figé sur le statut de session.
  const [docOnline, setDocOnline] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [actionMsg, setActionMsg] = useState<MessageView | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageView | null>(null);
  const [editMsg, setEditMsg] = useState<MessageView | null>(null);
  // Citation cliquable (défilement + surbrillance temporaire) et bouton flottant « revenir en bas ».
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const scrollRef = useRef<FlatList<MessageView>>(null);
  // Sortie de session → on revient à l'ACCUEIL (jamais sur la poignée de main qui est sous la pile).
  const goHome = useCallback(() => navigation.reset({index: 0, routes: [{name: 'Tabs'}]}), [navigation]);
  // Retour direct sur l'onglet Consultations (pas juste l'Accueil) — utilisé par le bouton matériel Android.
  const goToConsultations = useCallback(
    () => navigation.reset({index: 0, routes: [{name: 'Tabs', params: {screen: 'Consultations'}}]}),
    [navigation],
  );

  const jumpToMessage = useCallback((targetId: string) => {
    const index = messages.findIndex(m => m.id === targetId);
    if (index === -1) {
      return; // message cité absent de la page courante (ex. masqué « pour moi ») — pas de crash, on ignore.
    }
    scrollRef.current?.scrollToIndex({index, viewPosition: 0.5, animated: true});
    setHighlightedId(targetId);
    setTimeout(() => setHighlightedId(prev => (prev === targetId ? null : prev)), 1500);
  }, [messages]);

  const onThreadScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowJumpToBottom(distanceFromBottom > 220);
  }, []);

  // Boucle sur TOUT le curseur (pas juste la 1ʳᵉ page) : la liste ordonne du plus ancien au plus
  // récent (asc), donc s'arrêter à la 1ʳᵉ page revenait à toujours revoir les mêmes plus anciens
  // messages et ne JAMAIS afficher les plus récents dès qu'une session dépasse une page (bug détecté
  // à l'audit — les messages récents devenaient invisibles tout en étant marqués lus côté serveur).
  const fetchMessages = useCallback(async (s: SessionView) => {
    if (s.status !== 'ACTIVE' && s.status !== 'ENDED') {
      return;
    }
    let items: MessageView[] = [];
    let cursor: string | undefined;
    do {
      const page = await api.listSessionMessages(sessionId, cursor, 100);
      items = items.concat(page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    setMessages(items);
  }, [sessionId]);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getCareSession(sessionId);
      setSession(s);
      setRemaining(s.remainingSeconds);
      await fetchMessages(s);
      setLoad('ready');
      // Nom + présence RÉELLE du soignant (annuaire M05) — rafraîchis à chaque poll (même cadence que
      // le reste de l'écran, cf. en-tête du fichier) pour ne jamais figer un « en ligne » périmé.
      api.getProfessionalProfile(s.professionalId)
        .then(p => {
          setDocName(p.displayName);
          setDocOnline(p.availableNow);
        })
        .catch(() => undefined);
    } catch {
      setLoad(prev => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [sessionId, fetchMessages]);

  // Chargement initial.
  useEffect(() => {
    refresh();
  }, [sessionId, refresh]);

  // Polling tant que la session vit (PREPARING/ACTIVE).
  useEffect(() => {
    if (!session || (session.status !== 'PREPARING' && session.status !== 'ACTIVE')) {
      return;
    }
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [session?.status, refresh]);

  // Décompteur local entre deux interrogations.
  useEffect(() => {
    if (session?.status !== 'ACTIVE') {
      return;
    }
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [session?.status]);

  // Bouton RETOUR matériel Android pendant le chat (ACTIVE/ENDED, l'en-tête n'a volontairement pas de
  // bouton retour in-app — demande utilisateur antérieure) : sans ceci, React Navigation retomberait
  // par défaut sur Handshake/Pay (remplacés par `replace`, donc périmés/déroutants sous la pile) plutôt
  // que sur l'onglet Consultations, qui est la destination attendue.
  useEffect(() => {
    if (!session || (session.status !== 'ACTIVE' && session.status !== 'ENDED')) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToConsultations();
      return true; // empêche le pop par défaut vers un écran périmé de la pile
    });
    return () => sub.remove();
  }, [session?.status, goToConsultations]);

  if (load === 'loading') {
    return (
      <Shell title="Consultation" onBack={() => navigation.goBack()}>
        <LoadingState label="Ouverture de la consultation…" />
      </Shell>
    );
  }
  if (load === 'error' || !session) {
    return (
      <Shell title="Consultation" onBack={() => navigation.goBack()}>
        <ErrorState onRetry={refresh} />
      </Shell>
    );
  }

  if (session.status === 'PREPARING') {
    return <PreConsultation session={session} docName={docName} onBack={() => navigation.goBack()} onStarted={s => {
      setSession(s);
      setRemaining(s.remainingSeconds);
    }} />;
  }

  if (session.status === 'REFUNDED') {
    return (
      <Shell title="Consultation" onBack={goHome}>
        <View style={styles.centerBlock}>
          <Icon name="refresh" size={28} color={colors.successDot} />
          <Text style={styles.bigTitle}>Session remboursée</Text>
          <Text style={styles.bigSub}>Le soignant n'a envoyé aucun message : vous avez été intégralement remboursé (D-008). Aucune action requise.</Text>
          <PrimaryButton title="Revenir à l'accueil" iconLeft="home" onPress={goHome} />
        </View>
      </Shell>
    );
  }

  // ACTIVE ou ENDED → fil de conversation.
  const ended = session.status === 'ENDED';
  const proReplied = messages.some(m => m.senderId === session.professionalId);
  // Annulation possible seulement après 5 min de session ouverte sans réponse du soignant (le backend fait foi).
  const openedFor5min = !!session.startedAt && Date.now() - new Date(session.startedAt).getTime() >= 5 * 60 * 1000;
  const cancellable = session.status === 'ACTIVE' && !proReplied && openedFor5min;
  const within15 = (iso: string) => Date.now() - new Date(iso).getTime() < 15 * 60 * 1000;
  const isMine = (m: MessageView) => m.senderId === session.patientAccountId;

  const deleteMsg = async (m: MessageView, forEveryone: boolean) => {
    setActionMsg(null);
    setMessages(prev =>
      forEveryone
        ? prev.map(x => (x.id === m.id ? {...x, deletedAt: new Date().toISOString(), body: null, fileKey: null, mediaKeys: []} : x))
        : prev.filter(x => x.id !== m.id),
    );
    try {
      await api.deleteSessionMessage(sessionId, m.id, {forEveryone});
    } catch {
      refresh();
    }
  };
  const saveEdit = async (body: string) => {
    const m = editMsg;
    setEditMsg(null);
    if (!m || !body.trim()) {
      return;
    }
    setMessages(prev => prev.map(x => (x.id === m.id ? {...x, body: body.trim(), editedAt: new Date().toISOString()} : x)));
    try {
      const updated = await api.editSessionMessage(sessionId, m.id, {body: body.trim()});
      setMessages(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      refresh();
    }
  };
  const reactToMsg = async (m: MessageView, emoji: string) => {
    setActionMsg(null);
    try {
      const updated = await api.reactToMessage(sessionId, m.id, {emoji});
      setMessages(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      // Une réaction ratée n'affecte que ce message — pas besoin de rafraîchir tout le fil.
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      {/* En-tête : soignant + minuteur (pas de bouton retour — on ne quitte pas une session en cours, demande utilisateur) */}
      <View style={styles.chatHeader}>
        <View style={styles.flex}>
          <Text style={styles.chatName} numberOfLines={1}>{docName}</Text>
          <View style={styles.chatMeta}>
            <Text style={[styles.chatOnline, !ended && !docOnline && {color: colors.textTertiary}]}>
              ● {ended ? 'session terminée' : session.otherPartyTyping ? "en train d'écrire…" : docOnline ? 'en ligne' : 'hors ligne'}
            </Text>
            <Icon name="lock" size={9} color={colors.textTertiary} />
            <Text style={styles.chatEnc}>chiffré</Text>
          </View>
        </View>
        {session.professionalDelaySec > 0 && (
          <View style={styles.delayChip}>
            <Icon name="clock" size={11} color={colors.error} />
            <Text style={styles.delayText}>retard {mmss(session.professionalDelaySec)}</Text>
          </View>
        )}
        {!ended && (
          <View style={[styles.timer, remaining < 120 && styles.timerWarn]}>
            <Icon name="clock" size={12} color={remaining < 120 ? colors.error : colors.accent} />
            <Text style={[styles.timerText, remaining < 120 && {color: colors.error}]}>{mmss(remaining)}</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <FlatList
            ref={scrollRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: true})}
            onScroll={onThreadScroll}
            scrollEventThrottle={100}
            // Pas de getItemLayout (hauteurs de bulle trop variables : texte/photo/vocal) — un saut
            // lointain (citation tapée loin dans l'historique) peut donc échouer avant mesure ; on
            // approxime par offset puis on retente une fois le rendu stabilisé (comportement documenté RN).
            onScrollToIndexFailed={info => {
              scrollRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: false});
              setTimeout(() => scrollRef.current?.scrollToIndex({index: info.index, viewPosition: 0.5, animated: true}), 100);
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.openChip}>
                <Text style={styles.openChipText}>SESSION OUVERTE · {session.durationMin} MIN</Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.emptyThread}>
                {ended ? 'Aucun message durant cette session.' : 'Décrivez votre situation au soignant — il vous répond en direct.'}
              </Text>
            }
            renderItem={({item, index}) => (
              <Bubble
                msg={item}
                mine={isMine(item)}
                grouped={index > 0 && messages[index - 1].senderId === item.senderId && !item.replyTo}
                patientId={session.patientAccountId}
                docName={docName}
                highlighted={highlightedId === item.id}
                onLongPress={() => !item.deletedAt && setActionMsg(item)}
                onJumpToReply={jumpToMessage}
                onReact={emoji => reactToMsg(item, emoji)}
              />
            )}
          />
          {showJumpToBottom && (
            <Pressable
              style={styles.jumpToBottomBtn}
              onPress={() => scrollRef.current?.scrollToEnd({animated: true})}
              accessibilityLabel="Revenir en bas">
              <View style={{transform: [{rotate: '90deg'}]}}>
                <Icon name="chevron-right" size={18} color="#fff" />
              </View>
            </Pressable>
          )}
        </View>

        {ended ? (
          <EndedFooter session={session} onRated={() => refresh()} onLeave={goHome} />
        ) : (
          <Composer
            sessionId={sessionId}
            docName={docName}
            patientId={session.patientAccountId}
            replyTarget={replyTarget}
            onClearReply={() => setReplyTarget(null)}
            editMsg={editMsg}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditMsg(null)}
            onSent={m => setMessages(prev => [...prev, m])}
            cancellable={cancellable}
            onCancel={async () => {
              try {
                await api.cancelSession(sessionId);
                goHome(); // annulation → retour à l'accueil (pas la poignée de main)
              } catch (e) {
                alertSafe(e instanceof ApiError ? e.message : "Annulation impossible — réessayez.");
              }
            }}
          />
        )}
      </KeyboardAvoidingView>

      <ChatActionSheet
        visible={!!actionMsg}
        canEdit={!!actionMsg && isMine(actionMsg) && actionMsg.kind === 'TEXT' && within15(actionMsg.createdAt)}
        canDeleteForEveryone={!!actionMsg && isMine(actionMsg) && within15(actionMsg.createdAt)}
        onReact={emoji => actionMsg && reactToMsg(actionMsg, emoji)}
        onReply={() => {
          setReplyTarget(actionMsg);
          setActionMsg(null);
        }}
        onEdit={() => {
          setEditMsg(actionMsg);
          setActionMsg(null);
        }}
        onDeleteForMe={() => actionMsg && deleteMsg(actionMsg, false)}
        onDeleteForEveryone={() => actionMsg && deleteMsg(actionMsg, true)}
        onClose={() => setActionMsg(null)}
      />
    </SafeAreaView>
  );
}

/* ── Pré-consultation (PREPARING) ── */
function PreConsultation({session, docName, onBack, onStarted}: {session: SessionView; docName: string; onBack: () => void; onStarted: (s: SessionView) => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [symptoms, setSymptoms] = useState('');
  const [sinceWhen, setSinceWhen] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (symptoms.trim().length < 3) {
      return;
    }
    setBusy(true);
    try {
      const s = await api.submitPreConsultation(session.id, {symptoms: symptoms.trim(), sinceWhen: sinceWhen.trim() || undefined});
      onStarted(s);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Envoi impossible — réessayez.';
      setBusy(false);
      // Si la session a démarré automatiquement entre-temps, un refresh la basculera en ACTIVE.
      if (e instanceof ApiError && e.status === 409) {
        onStarted({...session, status: 'ACTIVE'});
      } else {
        // eslint-disable-next-line no-alert
        alertSafe(msg);
      }
    }
  };

  return (
    <Shell title="Pré-consultation" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.preContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.preIntro}>
          <Text style={styles.bigTitle}>Préparez votre session</Text>
          <Text style={styles.bigSub}>
            Décrivez votre motif : {docName} le lira dès l'ouverture. La session de {session.durationMin} min démarre dès l'envoi.
          </Text>
        </View>

        <Text style={styles.label}>Vos symptômes</Text>
        <TextInput
          style={styles.textArea}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Ex : maux de tête le soir, fatigue inhabituelle…"
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.label}>Depuis quand ? (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={sinceWhen}
          onChangeText={setSinceWhen}
          placeholder="Ex : trois semaines"
          placeholderTextColor={colors.textDisabled}
        />

        <Banner tone="info" title="Le décompteur ne tourne pas encore">
          Il démarrera à l'envoi de votre pré-consultation (ou automatiquement après quelques minutes).
        </Banner>
      </ScrollView>
      <View style={styles.preFooter}>
        <PrimaryButton title="Envoyer et démarrer la session" iconRight="arrow-right" loading={busy} disabled={symptoms.trim().length < 3} onPress={submit} />
      </View>
    </Shell>
  );
}

/* ── Composeur (ACTIVE) — texte + photo (aperçu avant envoi) + note vocale (onde live) ── */
const REC_BARS = 44;

function Composer({
  sessionId,
  onSent,
  cancellable,
  onCancel,
  docName,
  patientId,
  replyTarget,
  onClearReply,
  editMsg,
  onSaveEdit,
  onCancelEdit,
}: {
  sessionId: string;
  onSent: (m: MessageView) => void;
  cancellable: boolean;
  onCancel: () => void;
  docName: string;
  patientId: string;
  replyTarget: MessageView | null;
  onClearReply: () => void;
  editMsg: MessageView | null;
  onSaveEdit: (body: string) => void;
  onCancelEdit: () => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [preview, setPreview] = useState<PickedImage[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  // Note vocale : AUCUNE limite de durée/taille (demande explicite) — juste un avertissement doux,
  // non bloquant, passé 90 min (batterie/stockage) ; l'enregistrement continue quoi qu'il arrive.
  const [batteryWarning, setBatteryWarning] = useState(false);
  const warnedRef = useRef(false);
  // Signal « en train d'écrire » (ou d'enregistrer) — throttlé, le TTL serveur (6s) tolère un envoi
  // espacé sans faire clignoter l'indicateur côté récepteur.
  const lastTypingSentRef = useRef(0);
  const pingTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      lastTypingSentRef.current = now;
      api.setTyping(sessionId).catch(() => undefined);
    }
  }, [sessionId]);

  // Édition : pré-remplit le champ avec le message à modifier.
  useEffect(() => {
    if (editMsg) {
      setDraft(editMsg.body ?? '');
    }
  }, [editMsg]);

  const previewOf = (m: MessageView) => (m.kind === 'PHOTO' ? '📷 Photo' : m.kind === 'VOICE' ? '🎤 Note vocale' : (m.body ?? '').slice(0, 80));

  const emit = async (kind: 'TEXT' | 'PHOTO' | 'VOICE', extra: {body?: string; fileKey?: string; mediaKeys?: string[]}) => {
    const replyToId = replyTarget?.id;
    const m = await api.sendSessionMessage(sessionId, {clientMsgId: uuidv4(), kind, ...extra, ...(replyToId ? {replyToId} : {})});
    onSent(m);
    if (replyTarget) {
      onClearReply();
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) {
      return;
    }
    // Mode édition : on enregistre au lieu d'envoyer.
    if (editMsg) {
      onSaveEdit(body);
      setDraft('');
      return;
    }
    setBusy(true);
    try {
      await emit('TEXT', {body});
      setDraft('');
    } catch (e) {
      alertSafe(e instanceof ApiError ? e.message : 'Message non envoyé — réessayez.');
    } finally {
      setBusy(false);
    }
  };

  // Photo(s) : on choisit (1..N), on prévisualise (+ légende), puis on envoie en une bulle album.
  const attachPhoto = async () => {
    if (busy || recording) {
      return;
    }
    try {
      const assets = await pickSessionImageAssets(10);
      if (assets.length > 0) {
        setPreview(assets);
      }
    } catch {
      alertSafe('Photo indisponible — réessayez.');
    }
  };
  const sendPreview = async (caption: string) => {
    if (preview.length === 0) {
      return;
    }
    setPreviewBusy(true);
    try {
      const keys = await Promise.all(
        preview.map(p => api.uploadSessionMedia(sessionId, {fileBase64: p.base64, mime: p.mime}).then(up => up.fileKey)),
      );
      // 1 photo → fileKey (compat) ; plusieurs → mediaKeys (bulle album).
      const extra = keys.length === 1 ? {fileKey: keys[0]} : {mediaKeys: keys};
      await emit('PHOTO', {...extra, ...(caption ? {body: caption} : {})});
      setPreview([]);
    } catch (e) {
      alertSafe(e instanceof ApiError ? e.message : 'Photo non envoyée — réessayez.');
    } finally {
      setPreviewBusy(false);
    }
  };

  const startRec = async () => {
    if (busy) {
      return;
    }
    try {
      setRecSec(0);
      setLevels([]);
      setBatteryWarning(false);
      warnedRef.current = false;
      await startRecording((sec, level) => {
        setRecSec(sec);
        setLevels(prev => [...prev, level].slice(-REC_BARS));
        pingTyping();
        if (sec >= 90 * 60 && !warnedRef.current) {
          warnedRef.current = true;
          setBatteryWarning(true);
        }
      });
      setRecording(true);
    } catch {
      alertSafe('Micro indisponible — autorisez le microphone dans les réglages.');
    }
  };
  const stopAndSend = async () => {
    const durationSec = recSec;
    setRecording(false);
    setBusy(true);
    try {
      const uri = await stopRecording();
      if (uri) {
        const b64 = await fileToBase64(uri);
        const up = await api.uploadSessionMedia(sessionId, {fileBase64: b64, mime: 'audio/mp4'});
        await emit('VOICE', {fileKey: up.fileKey, body: String(durationSec)}); // body = durée (s) pour le lecteur
      }
    } catch (e) {
      alertSafe(e instanceof ApiError ? e.message : 'Note vocale non envoyée — réessayez.');
    } finally {
      setBusy(false);
      setRecSec(0);
      setLevels([]);
    }
  };
  const cancelRec = async () => {
    await cancelRecording();
    setRecording(false);
    setRecSec(0);
    setLevels([]);
  };

  // 44 barres : derniers niveaux captés, complétés à gauche par du silence.
  const bars = [...Array(Math.max(0, REC_BARS - levels.length)).fill(0), ...levels];

  return (
    <View>
      {cancellable && (
        <Pressable onPress={onCancel} style={styles.cancelRow}>
          <Icon name="refresh" size={13} color={colors.textTertiary} />
          <Text style={styles.cancelText}>Annuler — remboursement intégral (le soignant n'a pas encore répondu)</Text>
        </Pressable>
      )}
      {(replyTarget || editMsg) && !recording && (
        <View style={styles.replyBanner}>
          <View style={styles.replyBar} />
          <View style={styles.flex}>
            <Text style={styles.replyWho}>
              {editMsg ? 'Modifier le message' : replyTarget && replyTarget.senderId === patientId ? 'Réponse à vous-même' : `Réponse à ${docName}`}
            </Text>
            <Text style={styles.replyPrev} numberOfLines={1}>{editMsg ? editMsg.body ?? '' : replyTarget ? previewOf(replyTarget) : ''}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (editMsg) {
                onCancelEdit();
                setDraft('');
              } else {
                onClearReply();
              }
            }}
            hitSlop={8}>
            <Icon name="x" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}
      {recording && batteryWarning && (
        <View style={styles.batteryBanner}>
          <Icon name="clock" size={14} color={colors.warning} />
          <Text style={styles.batteryText}>Enregistrement long — pensez à la batterie et au stockage.</Text>
          <Pressable onPress={() => setBatteryWarning(false)} hitSlop={8}>
            <Icon name="x" size={14} color={colors.warning} />
          </Pressable>
        </View>
      )}
      {recording ? (
        <View style={styles.composer}>
          <Pressable onPress={cancelRec} style={styles.attachBtn} hitSlop={6} accessibilityLabel="Annuler l'enregistrement">
            <Icon name="trash" size={18} color={colors.errorDot} />
          </Pressable>
          <View style={styles.recBar}>
            <View style={styles.recDot} />
            <View style={styles.recWave}>
              {bars.map((lv, i) => (
                <View key={i} style={{width: 2.5, borderRadius: 2, height: 3 + lv * 23, backgroundColor: colors.accent500}} />
              ))}
            </View>
            <Text style={styles.recText}>{String(Math.floor(recSec / 60))}:{String(recSec % 60).padStart(2, '0')}</Text>
          </View>
          <Pressable onPress={stopAndSend} style={styles.sendBtn} accessibilityLabel="Envoyer la note vocale">
            <Icon name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.composer}>
          {!editMsg && (
            <IconButton icon="image" onPress={attachPhoto} disabled={busy} size={20} accessibilityLabel="Joindre une photo" style={styles.attachBtn} />
          )}
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={text => {
              setDraft(text);
              if (text.trim()) pingTyping();
            }}
            placeholder={editMsg ? 'Modifier le message…' : 'Votre message…'}
            placeholderTextColor={colors.textDisabled}
            multiline
          />
          {draft.trim() || editMsg ? (
            <Pressable onPress={send} disabled={busy} style={[styles.sendBtn, busy && styles.sendBtnOff]}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name={editMsg ? 'check' : 'send'} size={16} color="#fff" />}
            </Pressable>
          ) : (
            <Pressable onPress={startRec} disabled={busy} style={[styles.sendBtn, busy && styles.sendBtnOff]} accessibilityLabel="Enregistrer une note vocale">
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="mic" size={17} color="#fff" />}
            </Pressable>
          )}
        </View>
      )}

      <MediaPreview visible={preview.length > 0} uris={preview.map(p => p.uri)} busy={previewBusy} onCancel={() => setPreview([])} onSend={sendPreview} />
    </View>
  );
}

/* ── Pied de session terminée (ENDED) : compte-rendu + notation ── */
function EndedFooter({session, onRated, onLeave}: {session: SessionView; onRated: () => void; onLeave: () => void}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (score < 1) {
      return;
    }
    setBusy(true);
    try {
      await api.rateSession(session.id, {score, comment: comment.trim() || undefined});
      onRated();
    } catch (e) {
      alertSafe(e instanceof ApiError ? e.message : 'Notation impossible — réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.endedFooter}>
      {session.reportDepositedAt ? (
        <View style={styles.reportCard}>
          <Icon name="file-medical" size={18} color={colors.accent400} />
          <Text style={styles.reportText}>Compte-rendu reçu — il est versé à votre dossier médical.</Text>
        </View>
      ) : (
        <Text style={styles.endedNote}>La session est terminée. Le compte-rendu du soignant arrivera dans votre dossier.</Text>
      )}

      {session.rated ? (
        <Text style={styles.thanks}>Merci pour votre évaluation.</Text>
      ) : (
        <>
          <Text style={styles.rateLabel}>Notez votre consultation</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setScore(n)} hitSlop={4}>
                <Icon name="star" size={30} color={n <= score ? '#C49128' : colors.borderStrong} strokeWidth={1.6} />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Un commentaire ? (optionnel)"
            placeholderTextColor={colors.textDisabled}
          />
          <PrimaryButton title="Envoyer ma note" iconRight="check" loading={busy} disabled={score < 1} onPress={submit} />
        </>
      )}
      <Pressable onPress={onLeave} style={styles.leaveBtn}>
        <Text style={styles.leaveText}>Revenir à mes consultations</Text>
      </Pressable>
    </View>
  );
}

/* ── Bulle de message (TEXTE / PHOTO / VOICE) ── */
/** Grille album (1 à N photos en une bulle) — façon WhatsApp ; tap → ouvre l'image au plein cadre. */
function MediaGrid({keys, headers, onOpen}: {keys: string[]; headers?: Record<string, string>; onOpen: (key: string) => void}) {
  const styles = useThemedStyles(makeStyles);
  if (keys.length === 1) {
    const uri = sessionMediaUrl(keys[0]) ?? undefined;
    return (
      <Pressable onPress={() => onOpen(keys[0])}>
        <Image source={{uri, headers}} style={styles.photoMsg} resizeMode="cover" />
      </Pressable>
    );
  }
  const shown = keys.slice(0, 4);
  const extra = keys.length - shown.length;
  return (
    <View style={styles.grid}>
      {shown.map((k, idx) => {
        const uri = sessionMediaUrl(k) ?? undefined;
        const isLast = idx === shown.length - 1;
        return (
          <Pressable key={k} onPress={() => onOpen(k)} style={styles.gridCell}>
            <Image source={{uri, headers}} style={styles.gridImg} resizeMode="cover" />
            {isLast && extra > 0 ? (
              <View style={styles.gridMore}>
                <Text style={styles.gridMoreText}>+{extra}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Bubble({
  msg,
  mine,
  grouped,
  patientId,
  docName,
  highlighted,
  onLongPress,
  onJumpToReply,
  onReact,
}: {
  msg: MessageView;
  mine: boolean;
  grouped: boolean;
  patientId: string;
  docName: string;
  highlighted: boolean;
  onLongPress: () => void;
  onJumpToReply: (targetId: string) => void;
  onReact: (emoji: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const rowStyle = [styles.row, mine ? styles.rowMine : styles.rowDoc, {marginTop: grouped ? 2 : 10}];
  const token = getAuthToken();
  const headers = token ? {Authorization: `Bearer ${token}`} : undefined;
  // Surbrillance temporaire (tap sur une citation) — appliquée uniformément quel que soit le type de bulle.
  const bubbleStyle = [styles.bubble, mine ? styles.bubbleMine : styles.bubbleDoc, highlighted && styles.bubbleHighlighted];

  // Tombstone — message supprimé pour tout le monde (le serveur a vidé le contenu).
  if (msg.deletedAt) {
    return (
      <View style={rowStyle}>
        <View style={styles.bubbleWrap}>
          <View style={[...bubbleStyle, styles.bubbleDeleted]}>
            <Text style={[styles.deletedText, mine && styles.deletedTextMine]}>🚫 Message supprimé</Text>
          </View>
        </View>
      </View>
    );
  }

  // Bas de bulle : heure · « modifié » · accusés 3 états (✓ / ✓✓ gris / ✓✓ bleu) côté patient.
  const footer = (
    <View style={styles.msgFooter}>
      {msg.editedAt ? <Text style={[styles.editedTag, mine && styles.editedTagMine]}>modifié</Text> : null}
      <Text style={[styles.time, mine && styles.timeMine]}>{hm(msg.createdAt)}</Text>
      {mine && msg.status ? (
        <Text style={[styles.receipt, msg.status === 'read' ? styles.receiptRead : styles.receiptSent]}>
          {msg.status === 'sent' ? '✓' : '✓✓'}
        </Text>
      ) : null}
    </View>
  );

  // Carte de citation (réponse à un message) — affichée en tête de bulle.
  // Tap sur la citation → défilement + surbrillance temporaire du message original (§5 SARIS).
  const replyCard = msg.replyTo ? (
    <Pressable
      onPress={() => onJumpToReply(msg.replyTo!.id)}
      style={[styles.replyCard, mine ? styles.replyCardMine : styles.replyCardDoc]}>
      <View style={[styles.replyCardBar, mine && styles.replyCardBarMine]} />
      <View style={styles.flex}>
        <Text style={[styles.replyCardWho, mine && styles.replyCardTextMine]} numberOfLines={1}>
          {msg.replyTo.senderId === patientId ? 'Vous' : docName}
        </Text>
        <Text style={[styles.replyCardText, mine && styles.replyCardTextMine]} numberOfLines={1}>
          {msg.replyTo.preview}
        </Text>
      </View>
    </Pressable>
  ) : null;

  // Album / photo(s) : 1..N images en une bulle, légende (body) optionnelle dessous.
  const imageKeys = msg.mediaKeys?.length ? msg.mediaKeys : msg.kind === 'PHOTO' && msg.fileKey ? [msg.fileKey] : [];
  if (imageKeys.length > 0) {
    return (
      <View style={rowStyle}>
        <View style={styles.bubbleWrap}>
          <Pressable onLongPress={onLongPress} delayLongPress={300} style={[...bubbleStyle, styles.photoBubble]}>
            {replyCard}
            <MediaGrid keys={imageKeys} headers={headers} onOpen={setViewerKey} />
            {msg.body ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, styles.photoCaption]}>{msg.body}</Text> : null}
            <View style={styles.photoFooter}>{footer}</View>
          </Pressable>
          <ReactionsRow reactions={msg.reactions} mine={mine} onToggle={onReact} />
        </View>
        <MediaViewer
          visible={!!viewerKey}
          uri={viewerKey ? sessionMediaUrl(viewerKey) ?? null : null}
          headers={headers}
          onClose={() => setViewerKey(null)}
        />
      </View>
    );
  }

  // VOICE : lecteur riche (onde + seek + durée + vitesse) — voir VoiceNotePlayer. body = durée en secondes.
  if (msg.kind === 'VOICE' && msg.fileKey) {
    const uri = sessionMediaUrl(msg.fileKey);
    const durationSec = msg.body && /^\d+$/.test(msg.body) ? parseInt(msg.body, 10) : undefined;
    return (
      <View style={rowStyle}>
        <View style={styles.bubbleWrap}>
          <Pressable onLongPress={onLongPress} delayLongPress={300} style={[...bubbleStyle, styles.voiceBubble]}>
            {replyCard}
            {uri ? <VoiceNotePlayer uri={uri} mine={mine} durationSec={durationSec} /> : null}
            {footer}
          </Pressable>
          <ReactionsRow reactions={msg.reactions} mine={mine} onToggle={onReact} />
        </View>
      </View>
    );
  }

  // Repli (DOCUMENT ou média sans clé).
  if (msg.kind !== 'TEXT') {
    return (
      <View style={rowStyle}>
        <View style={styles.bubbleWrap}>
          <Pressable onLongPress={onLongPress} delayLongPress={300} style={bubbleStyle}>
            {replyCard}
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, {fontStyle: 'italic'}]}>Pièce jointe</Text>
            {footer}
          </Pressable>
          <ReactionsRow reactions={msg.reactions} mine={mine} onToggle={onReact} />
        </View>
      </View>
    );
  }

  // TEXTE.
  return (
    <View style={rowStyle}>
      <View style={styles.bubbleWrap}>
        <Pressable onLongPress={onLongPress} delayLongPress={300} style={bubbleStyle}>
          {replyCard}
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.body}</Text>
          {footer}
        </Pressable>
        <ReactionsRow reactions={msg.reactions} mine={mine} onToggle={onReact} />
      </View>
    </View>
  );
}

/** Ligne de réactions agrégées sous une bulle (façon WhatsApp) — tap = ajouter/retirer la même réaction. */
function ReactionsRow({reactions, mine, onToggle}: {reactions: MessageReaction[]; mine: boolean; onToggle: (emoji: string) => void}) {
  const styles = useThemedStyles(makeStyles);
  if (reactions.length === 0) {
    return null;
  }
  return (
    <View style={[styles.reactionsRow, mine ? styles.reactionsRowMine : styles.reactionsRowDoc]}>
      {reactions.map(r => (
        <Pressable key={r.emoji} onPress={() => onToggle(r.emoji)} style={[styles.reactionPill, r.mine && styles.reactionPillMine]} hitSlop={2}>
          <Text style={styles.reactionEmoji}>{r.emoji}</Text>
          {r.count > 1 ? <Text style={styles.reactionCount}>{r.count}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

/* ── Coque d'écran simple (états non-chat) ── */
function Shell({title, onBack, children}: {title: string; onBack: () => void; children: React.ReactNode}) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={onBack} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

function alertSafe(message: string): void {
  dialogs.alert({title: 'Oups', message});
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: colors.bg},

  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  headerTitle: {fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary},

  // Chat header
  chatHeader: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle},
  chatName: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary},
  chatMeta: {flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1},
  chatOnline: {fontFamily: fonts.body, fontSize: 10.5, fontWeight: '600', color: colors.success},
  chatEnc: {fontFamily: fonts.body, fontSize: 10.5, color: colors.textTertiary},
  timer: {flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent50, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6},
  timerWarn: {backgroundColor: colors.errorBg},
  timerText: {fontFamily: fonts.monoMedium, fontSize: 13, color: colors.accent},
  delayChip: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.errorBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5},
  delayText: {fontFamily: fonts.monoMedium, fontSize: 10.5, color: colors.error},

  // Thread
  thread: {padding: 14, paddingBottom: 18, flexGrow: 1},
  openChip: {alignItems: 'center', marginBottom: 10},
  openChipText: {fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.6, color: colors.textTertiary, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden'},
  emptyThread: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, textAlign: 'center', marginTop: 24, paddingHorizontal: 24, lineHeight: 18},

  row: {flexDirection: 'row'},
  rowMine: {justifyContent: 'flex-end'},
  rowDoc: {justifyContent: 'flex-start'},
  bubbleWrap: {maxWidth: '82%'},
  bubble: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12},
  bubbleMine: {backgroundColor: colors.accent500, borderBottomRightRadius: 3},
  bubbleDoc: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderBottomLeftRadius: 3, ...shadow.sm},
  bubbleHighlighted: {borderWidth: 2, borderColor: colors.accent500},
  // Réactions emoji agrégées sous la bulle (façon WhatsApp).
  reactionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3},
  reactionsRowMine: {alignSelf: 'flex-end'},
  reactionsRowDoc: {alignSelf: 'flex-start'},
  reactionPill: {flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, ...shadow.sm},
  reactionPillMine: {borderColor: colors.accent500, backgroundColor: colors.accent50},
  reactionEmoji: {fontSize: 12.5},
  reactionCount: {fontFamily: fonts.body, fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginLeft: 1},
  // Bouton flottant « revenir en bas » — visible après ~220px de défilement vers le haut.
  jumpToBottomBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  bubbleText: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.textPrimary},
  bubbleTextMine: {color: '#fff'},
  time: {fontFamily: fonts.mono, fontSize: 9, color: colors.textDisabled, alignSelf: 'flex-end', marginTop: 3},
  timeMine: {color: 'rgba(255,255,255,0.75)'},

  // Composer
  cancelRow: {flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.bgSubtle, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  cancelText: {fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary},
  // Avertissement doux (non bloquant, ne stoppe rien) passé 90 min d'enregistrement continu.
  batteryBanner: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.warningBg, borderTopWidth: 1, borderTopColor: colors.warningBorder},
  batteryText: {flex: 1, fontFamily: fonts.body, fontSize: 11, color: colors.warning},
  composer: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  composerInput: {flex: 1, minHeight: 40, maxHeight: 110, borderRadius: 20, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 9, fontFamily: fonts.body, fontSize: 13.5, color: colors.textPrimary},
  sendBtn: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
  sendBtnOff: {backgroundColor: colors.accent200},
  attachBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  // Barre d'enregistrement vocal (onde live)
  recBar: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder},
  recDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.errorDot},
  recWave: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 30, overflow: 'hidden'},
  recText: {fontFamily: fonts.mono, fontSize: 12, color: colors.error, fontWeight: '600', minWidth: 34, textAlign: 'right'},
  // Bulle photo
  photoBubble: {padding: 4},
  photoMsg: {width: 210, height: 210, borderRadius: 9},
  photoCaption: {marginTop: 5, marginHorizontal: 4},
  photoTime: {marginRight: 4, marginBottom: 2},
  // Bulle vocale (lecteur riche en colonne : onde + heure dessous)
  voiceBubble: {paddingHorizontal: 8, paddingVertical: 6, gap: 1},

  // Bas de bulle : heure + « modifié » + accusés
  msgFooter: {flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 3},
  photoFooter: {marginRight: 4, marginBottom: 2},
  editedTag: {fontFamily: fonts.body, fontSize: 9, fontStyle: 'italic', color: colors.textDisabled},
  editedTagMine: {color: 'rgba(255,255,255,0.7)'},
  receipt: {fontFamily: fonts.body, fontSize: 11, fontWeight: '700', marginLeft: 1},
  receiptSent: {color: 'rgba(255,255,255,0.75)'},
  receiptRead: {color: '#8FD3FF'},

  // Bulle supprimée (tombstone)
  bubbleDeleted: {backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderSubtle},
  deletedText: {fontFamily: fonts.body, fontSize: 13, fontStyle: 'italic', color: colors.textTertiary},
  deletedTextMine: {color: colors.textTertiary},

  // Carte de citation dans une bulle (réponse à …)
  replyCard: {flexDirection: 'row', gap: 7, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 7, marginBottom: 5, overflow: 'hidden'},
  replyCardDoc: {backgroundColor: colors.bgMuted},
  replyCardMine: {backgroundColor: 'rgba(255,255,255,0.16)'},
  replyCardBar: {width: 3, borderRadius: 2, backgroundColor: colors.accent},
  replyCardBarMine: {backgroundColor: 'rgba(255,255,255,0.85)'},
  replyCardWho: {fontFamily: fonts.displayBold, fontSize: 11, color: colors.accent},
  replyCardText: {fontFamily: fonts.body, fontSize: 11.5, color: colors.textSecondary},
  replyCardTextMine: {color: 'rgba(255,255,255,0.92)'},

  // Grille album
  grid: {flexDirection: 'row', flexWrap: 'wrap', width: 218, gap: 2, borderRadius: 9, overflow: 'hidden'},
  gridCell: {width: 108, height: 108},
  gridImg: {width: '100%', height: '100%'},
  gridMore: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center'},
  gridMoreText: {fontFamily: fonts.displayBold, fontSize: 22, color: '#fff'},

  // Bandeau de réponse / édition au-dessus du composeur
  replyBanner: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.bgSubtle, borderTopWidth: 1, borderTopColor: colors.borderSubtle},
  replyBar: {width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accent},
  replyWho: {fontFamily: fonts.displayBold, fontSize: 11.5, color: colors.accent},
  replyPrev: {fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary},

  // Pré-consultation
  preContent: {padding: 16, gap: 10},
  preIntro: {gap: 6, marginBottom: 4},
  label: {fontFamily: fonts.body, fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginTop: 6},
  input: {minHeight: 46, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary},
  textArea: {minHeight: 110, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surface, padding: 14, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary},
  preFooter: {padding: 16, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.surface},

  // États centrés
  centerBlock: {alignItems: 'center', gap: 12, padding: 28},
  bigTitle: {fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.textPrimary, textAlign: 'center'},
  bigSub: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, textAlign: 'center'},

  // Ended footer
  endedFooter: {padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.surface},
  reportCard: {flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, borderRadius: radius.card, padding: 12},
  reportText: {flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.textPrimary, lineHeight: 18},
  endedNote: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, textAlign: 'center', lineHeight: 18},
  thanks: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.success, textAlign: 'center'},
  rateLabel: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textPrimary, textAlign: 'center'},
  stars: {flexDirection: 'row', justifyContent: 'center', gap: 8},
  leaveBtn: {alignItems: 'center', paddingVertical: 6},
  leaveText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.accent},
});
