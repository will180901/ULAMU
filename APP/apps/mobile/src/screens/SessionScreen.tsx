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
import {PickedImage, avatarUrl, pickSessionImageAssets, sessionMediaUrl} from '../services/media';
import {doitEtreRognee, ouvrirLeRogneur, rogneurDisponible} from '../services/rogneur';
import {LIMITE_OCTETS, formatOctets, genreDuMime} from '../lib/media-regles';
import {cancelRecording, fileToBase64, startRecording, stopRecording} from '../services/audio';
import {ChatActionSheet} from '../components/ChatActionSheet';
import {FeuilleSignalement} from '../components/FeuilleSignalement';
import {MediaPreview} from '../components/MediaPreview';
import {TexteMisEnForme} from '../components/TexteMisEnForme';
import {MediaViewer} from '../components/MediaViewer';
import {VoiceNotePlayer} from '../components/VoiceNotePlayer';
import {MessageReaction, MessageView, SessionView} from '../lib/contracts';
import {peutSignalerMessage} from '../lib/signalement';
import {useAbandonGuard} from '../state/useAbandonGuard';
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
  /* Signalement (chantier 59) : soit un message précis, soit le soignant lui-même. */
  const [msgSignale, setMsgSignale] = useState<string | null>(null);
  const [signalerSoignant, setSignalerSoignant] = useState(false);
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

  // Le STATUT seul pilote les effets ci-dessous : dépendre de `session` entier les relancerait à chaque
  // interrogation, soit toutes les 3 secondes.
  const sessionStatus = session?.status;

  // Chargement initial.
  useEffect(() => {
    refresh();
  }, [sessionId, refresh]);

  // Polling tant que la session vit (PREPARING/ACTIVE).
  useEffect(() => {
    if (sessionStatus !== 'PREPARING' && sessionStatus !== 'ACTIVE') {
      return;
    }
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [sessionStatus, refresh]);

  // Décompteur local entre deux interrogations.
  useEffect(() => {
    if (sessionStatus !== 'ACTIVE') {
      return;
    }
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [sessionStatus]);

  /**
   * Quitter une consultation EN COURS demande confirmation.
   *
   * L'en-tête n'a volontairement pas de bouton retour (demande utilisateur antérieure) : le bouton
   * matériel d'Android est donc la SEULE sortie, et elle réinitialise toute la pile. Un appui
   * involontaire éjectait l'utilisateur d'une consultation PAYÉE dont le chronomètre continue de
   * tourner, sans un mot et sans retour possible. Une fois la session terminée (ENDED), il n'y a plus
   * rien à perdre : on sort directement.
   */
  const leaveSession = useAbandonGuard({
    dirty: sessionStatus === 'ACTIVE',
    title: 'Quitter la consultation ?',
    message:
      "La consultation reste ouverte et son temps continue de s'écouler. Vous la retrouverez dans l'onglet Consultations.",
    onLeave: goToConsultations,
  });

  // Lu par référence : le garde-fou est recréé à chaque rendu, on se réabonnerait sinon en boucle.
  const leaveRef = useRef(leaveSession);
  leaveRef.current = leaveSession;

  // Bouton RETOUR matériel Android pendant le chat (ACTIVE/ENDED) : sans ceci, React Navigation
  // retomberait par défaut sur Handshake/Pay (retirés de la pile au paiement, donc périmés) plutôt que
  // sur l'onglet Consultations, qui est la destination attendue.
  useEffect(() => {
    if (sessionStatus !== 'ACTIVE' && sessionStatus !== 'ENDED') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveRef.current();
      return true; // empêche le pop par défaut vers un écran périmé de la pile
    });
    return () => sub.remove();
  }, [sessionStatus]);

  /*
    ── ⚠️ Le patient donne signe de vie — chantier 98, REPLACÉ au chantier 102 ───────────────────

    Le porteur veut, dans le bandeau du soignant, « en ligne » ou « vu il y a tant ». Or cette
    application n'envoyait aucun battement de présence : le serveur n'avait jamais entendu parler du
    patient, et l'aurait dit hors ligne en permanence. *Un statut qu'on ne peut jamais contredire
    n'est pas un statut : c'est une décoration.*

    Le battement part tant que cet écran est ouvert — exactement quand la question « est-il devant sa
    conversation ? » se pose. PM-26 accorde 15 minutes de fraîcheur ; deux minutes d'intervalle
    laissent de quoi en rater un sans passer pour parti.

    ⚠️ **Il vit ICI, avec les autres effets, et surtout AVANT les retours anticipés de cet écran.**
    Posé plus bas — après le `return` de la pré-consultation — il n'était appelé qu'à certains
    rendus : React comptait un crochet de plus dès que la séance s'ouvrait, et l'application
    s'arrêtait sur « Rendered more hooks than during the previous render ». *Un composant qui rend
    plusieurs écrans selon son état n'a pas le droit d'avoir ses crochets dispersés entre eux.*
  */
  useEffect(() => {
    const battre = () => {
      api.presenceHeartbeat().catch(() => undefined);
    };
    battre();
    const minuteur = setInterval(battre, 120_000);
    return () => clearInterval(minuteur);
  }, []);

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

  /*
    ── ⚠️ Plus de pré-consultation — chantier 105, 12/09/2026 ──────────────────────────────────

    Une séance en PRÉPARATION ouvre désormais la **conversation**, pas un formulaire. Décision du
    porteur : *« retire la fonctionnalité de pré-consultation partout, ça ne sert plus »*.

    Le décompteur ne part qu'au **premier message du patient** (chantier 104) : entrer dans la
    conversation ne coûte donc rien, et le patient décrit son motif comme il parle — en écrivant, en
    dictant une note vocale, en envoyant une photo. *Demander les mêmes mots deux fois — une fois
    dans un formulaire, une fois dans la conversation — était le vrai coût de cet écran.*
  */

  if (session.status === 'REFUNDED') {
    return (
      <Shell title="Consultation" onBack={goHome}>
        <View style={styles.centerBlock}>
          <Icon name="refresh" size={28} color={colors.successDot} />
          <Text style={styles.bigTitle}>Session remboursée</Text>
          <Text style={styles.bigSub}>Le soignant n'a envoyé aucun message : vous avez été intégralement remboursé. Aucune action requise.</Text>
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
  /*
    La photo de profil d'un participant (chantier 97). Les deux clés arrivent avec la séance ; avant,
    la vue ne portait aucune identité et il n'y avait rien à afficher.
  */
  const avatarDe = (senderId: string): string | null =>
    avatarUrl(senderId === session.professionalId ? session.professionalAvatarKey : session.patientAvatarKey);

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
        {/*
          ── Signaler le soignant (chantier 59, 06/09/2026) ────────────────────────────────────

          Ici, et pas seulement sur sa fiche d'annuaire : après une consultation qui s'est mal
          passée, le SEUL chemin vers cette fiche était de revenir à l'accueil et de retrouver la
          personne dans la liste — où elle peut très bien ne plus apparaître (hors ligne, filtrée).
          Demander à quelqu'un de rechercher celui qu'il veut signaler, c'est lui demander d'y
          renoncer.
        */}
        <IconButton
          icon="flag"
          onPress={() => setSignalerSoignant(true)}
          variant="tile"
          size={16}
          accessibilityLabel="Signaler ce soignant"
        />
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
                avatarExpediteur={avatarDe(item.senderId)}
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
        canReport={peutSignalerMessage(actionMsg, session.patientAccountId)}
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
        onReport={() => {
          setMsgSignale(actionMsg?.id ?? null);
          setActionMsg(null);
        }}
        onClose={() => setActionMsg(null)}
      />

      {/*
        Les deux feuilles vivent ICI, au niveau de l'écran, et non dans chaque bulle : une feuille
        par message en monterait autant qu'il y a de messages, pour n'en montrer qu'une.
      */}
      <FeuilleSignalement
        visible={msgSignale !== null}
        onClose={() => setMsgSignale(null)}
        cible="SESSION_MESSAGE"
        cibleId={msgSignale ?? ''}
        quoi="ce message"
      />
      <FeuilleSignalement
        visible={signalerSoignant}
        onClose={() => setSignalerSoignant(false)}
        cible="PROFILE"
        cibleId={session.professionalId}
        quoi="ce soignant"
      />
    </SafeAreaView>
  );
}

/* ── Pré-consultation (PREPARING) ── */
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
  /**
   * Prépare UN fichier pour l'envoi : rogne la vidéo si nécessaire, puis l'encode.
   *
   * ⚠️ **L'encodage se fait ICI et pas à la sélection.** Une vidéo de 8 Mo fait une chaîne de 11 Mo
   * en mémoire : la produire pour un fichier qu'on va peut-être retirer, ou dont on ne gardera que
   * trois secondes, serait payer d'avance pour un peut-être.
   *
   * ⚠️ Et le poids de l'EXTRAIT est vérifié après la découpe, jamais avant : *une estimation sert à
   * prévenir, c'est le fichier produit qui décide.*
   */
  const preparerPourEnvoi = async (p: PickedImage): Promise<{base64: string; mime: string}> => {
    if (genreDuMime(p.mime) !== 'video') {
      return {base64: p.base64, mime: p.mime};
    }
    let chemin = p.uri;
    if (doitEtreRognee(p.tailleOctets ?? 0, p.dureeSec ?? 0)) {
      if (!rogneurDisponible()) {
        throw new Error('Cet appareil ne sait pas découper une vidéo — filmez plus court.');
      }
      const extrait = await ouvrirLeRogneur(p.uri, {
        accent: colors.accent500,
        fond: colors.surface,
        texte: colors.textPrimary,
      });
      if (!extrait) {
        throw new Error('annule');
      }
      chemin = extrait.chemin;
    }
    const base64 = await fileToBase64(chemin);
    // 3 caractères de base64 pour 4 octets : on retrouve le poids réel sans relire le fichier.
    const octets = Math.floor((base64.length * 3) / 4);
    if (octets > LIMITE_OCTETS) {
      throw new Error(
        `L'extrait pèse ${formatOctets(octets)} — maximum ${formatOctets(LIMITE_OCTETS)}. Gardez un passage plus court.`,
      );
    }
    // Le rogneur rend toujours du MP4, quel que soit le format d'entrée.
    return {base64, mime: chemin === p.uri ? p.mime : 'video/mp4'};
  };

  const sendPreview = async (caption: string) => {
    if (preview.length === 0) {
      return;
    }
    setPreviewBusy(true);
    try {
      /*
        ⚠️ En SÉRIE, pas en parallèle : le rogneur ouvre un écran, et deux écrans de découpe
        simultanés se recouvriraient. *Ce qui demande un geste ne se parallélise pas.*
      */
      const keys: string[] = [];
      for (const p of preview) {
        const pret = await preparerPourEnvoi(p);
        const up = await api.uploadSessionMedia(sessionId, {fileBase64: pret.base64, mime: pret.mime});
        keys.push(up.fileKey);
      }
      // 1 photo → fileKey (compat) ; plusieurs → mediaKeys (bulle album).
      const extra = keys.length === 1 ? {fileKey: keys[0]} : {mediaKeys: keys};
      await emit('PHOTO', {...extra, ...(caption ? {body: caption} : {})});
      setPreview([]);
    } catch (e) {
      // Renoncer au rognage n'est pas une panne : on referme sans rien dire.
      if (e instanceof Error && e.message === 'annule') {
        setPreviewBusy(false);
        return;
      }
      alertSafe(e instanceof ApiError || e instanceof Error ? e.message : 'Pièce non envoyée — réessayez.');
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

      <MediaPreview visible={preview.length > 0} pieces={preview} busy={previewBusy} onCancel={() => setPreview([])} onSend={sendPreview} />
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
/**
 * Le genre d'une pièce, lu dans sa CLÉ (`sm_<uuid>.mp4`) — sans rien télécharger.
 *
 * ⚠️ Au niveau du MODULE, et non dans l'écran : `MediaGrid` en a besoin, et c'est un composant
 * voisin. *Une fonction définie dans un composant n'existe pas pour celui d'à côté — et le
 * compilateur ne l'a pas vu parce qu'un autre nom existait ailleurs.*
 */
function estUneVideo(cle: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(cle);
}

function MediaGrid({keys, headers, onOpen}: {keys: string[]; headers?: Record<string, string>; onOpen: (key: string) => void}) {
  const styles = useThemedStyles(makeStyles);
  if (keys.length === 1) {
    const uri = sessionMediaUrl(keys[0]) ?? undefined;
    /*
      ⚠️ **Une vidéo ne se met pas dans une `<Image>`** — elle y donne un carré vide. Et on ne la
      télécharge pas non plus d'entrée : elle pèse plusieurs mégaoctets. *Charger dix vidéos pour en
      regarder une est un coût qu'on fait payer à quelqu'un qui n'a rien demandé à voir* — même règle
      que le web (chantier 104). Le genre se lit dans la CLÉ, qui porte son extension.
    */
    if (estUneVideo(keys[0])) {
      return (
        <Pressable onPress={() => onOpen(keys[0])} style={styles.videoMsg}>
          <View style={styles.videoRond}>
            <Icon name="play" size={20} color="#fff" />
          </View>
          <Text style={styles.videoLabel}>Vidéo</Text>
        </Pressable>
      );
    }
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
  avatarExpediteur,
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
  /** Photo de profil de l'expéditeur — `null` s'il n'en a pas (chantier 97). */
  avatarExpediteur: string | null;
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
            {msg.body ? (
              <TexteMisEnForme
                texte={msg.body}
                style={[styles.bubbleText, mine && styles.bubbleTextMine, styles.photoCaption]}
              />
            ) : null}
            <View style={styles.photoFooter}>{footer}</View>
          </Pressable>
          <ReactionsRow reactions={msg.reactions} mine={mine} onToggle={onReact} />
        </View>
        <MediaViewer
          visible={!!viewerKey}
          uri={viewerKey ? sessionMediaUrl(viewerKey) ?? null : null}
          headers={headers}
          video={!!viewerKey && /\.(mp4|webm|mov)$/i.test(viewerKey)}
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
            {uri ? <VoiceNotePlayer uri={uri} mine={mine} durationSec={durationSec} avatar={avatarExpediteur} /> : null}
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
          <TexteMisEnForme texte={msg.body ?? ''} style={[styles.bubbleText, mine && styles.bubbleTextMine]} />
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
  videoMsg: {width: 210, height: 132, borderRadius: 9, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center', gap: 8},
  videoRond: {width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
  videoLabel: {fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.8)'},
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
