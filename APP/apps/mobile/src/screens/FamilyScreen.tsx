/**
 * Carnet familial / personnes à charge (M07, CU-07-04) — un patient majeur gère des sous-profils
 * (enfant, personne dépendante), chacun avec SON propre Carnet. Liste + création ; ouvrir un
 * sous-profil mène à son Carnet (CarnetScreen avec subProfileId). N'affecte que ses propres dépendants.
 *
 * ── Le transfert à la majorité (CU-07-05, écart D — 06/09/2026) ───────────────────────────────
 *
 * `claim/start` et `claim` existaient depuis le premier jour et **aucun écran, ni web ni mobile, ne
 * les appelait** : un proche devenu majeur ne pouvait jamais récupérer son propre Carnet de santé.
 *
 * Le geste demande DEUX personnes sur DEUX téléphones :
 *   1. le tuteur lance le transfert et reçoit un code à 6 chiffres sur SON téléphone ;
 *   2. il transmet au majeur un code d'identification (voir `lib/transfert-carnet`) ;
 *   3. le majeur, depuis SON compte, colle ce code et saisit les 6 chiffres.
 *
 * ⚠️ **Deux appareils : le copier-coller ne traverse pas.** D'où le partage natif, déjà l'idiome de
 * cette application (CarnetScreen, DoctorScreen).
 *
 * ⚠️ **Un Carnet transféré reste dans la liste du tuteur**, et il n'y a plus accès (RM-07-06). Avant
 * ce chantier la question ne se posait pas — aucun transfert n'était possible. Livrer le transfert
 * sans traiter cet état aurait donc CRÉÉ le défaut : une ligne menant à un refus. Ces lignes-là ne
 * sont plus cliquables, et disent à qui appartient désormais le Carnet.
 */
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {Card, IconButton, PrimaryButton} from '../components/ui';
import {useDialog} from '../components/Dialog';
import {EmptyState, ErrorState, LoadingState} from '../components/ScreenState';
import {Grain} from '../components/Grain';
import {Icon} from '../components/Icon';
import {AppStackParamList} from '../navigation/types';
import {ApiError} from '../lib/api-client';
import {api} from '../services/api';
import {Sex, SubProfile} from '../lib/contracts';
import {composerCode, lireCode, messageDePartage} from '../lib/transfert-carnet';
import {isValidOtp} from '../lib/validation';
import {useAbandonGuard} from '../state/useAbandonGuard';
import {fonts, Palette, radius} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

const ageOf = (iso: string): number => {
  const b = new Date(iso);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
    a--;
  }
  return Math.max(0, a);
};
const displayToIso = (disp: string): string | null => {
  const m = disp.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    return null;
  }
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() ? null : iso;
};

export function FamilyScreen({navigation}: NativeStackScreenProps<AppStackParamList, 'Family'>) {
  const {colors, scheme} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<SubProfile[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [createOpen, setCreateOpen] = useState(false);
  /* Les deux moitiés du transfert (écart D) : celle du tuteur, celle du majeur. */
  const [transfertOpen, setTransfertOpen] = useState(false);
  const [recuperationOpen, setRecuperationOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setItems(await api.listSubProfiles());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root}>
      <Grain />
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} variant="tile" size={19} accessibilityLabel="Retour" />
        <Text style={styles.headerTitle}>Carnet familial</Text>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn} hitSlop={6}>
          <Icon name="plus" size={18} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {status === 'loading' && <LoadingState label="Chargement…" />}
      {status === 'error' && <ErrorState onRetry={load} />}
      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>Gérez le Carnet de santé des personnes à votre charge (enfant mineur, proche dépendant).</Text>
          {items.length === 0 ? (
            <Card style={{alignItems: 'center', paddingVertical: 8}}>
              <EmptyState icon="users" title="Aucune personne à charge." hint="Ajoutez un proche pour lui ouvrir un Carnet de santé gratuit à vie." />
            </Card>
          ) : (
            items.map(s => {
              /*
                Un Carnet transféré n'appartient plus au tuteur (RM-07-06) : la ligne ne mène donc
                nulle part, et le dit. Sans cela elle ouvrirait un Carnet qui répondrait « accès
                refusé » — un cul-de-sac que ce chantier aurait lui-même fabriqué.
              */
              const transfere = s.status === 'TRANSFERRED';
              return (
                <Pressable
                  key={s.id}
                  disabled={transfere}
                  onPress={() => navigation.navigate('Carnet', {subProfileId: s.id, title: `${s.firstName} ${s.lastName}`})}
                  style={[styles.row, transfere && styles.rowTransfere]}>
                  <View style={[styles.avatar, transfere && styles.avatarTransfere]}>
                    <Text style={styles.avatarText}>{(s.firstName[0] ?? '') + (s.lastName[0] ?? '')}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{s.firstName} {s.lastName}</Text>
                    <Text style={styles.sub}>
                      {transfere
                        ? 'Carnet remis à cette personne — vous n’y avez plus accès.'
                        : `${ageOf(s.birthDate)} ans · ${s.sex === 'F' ? 'Femme' : 'Homme'}`}
                    </Text>
                  </View>
                  {transfere ? null : <Icon name="chevron-right" size={16} color={colors.textTertiary} />}
                </Pressable>
              );
            })
          )}

          {/*
            Les deux gestes du transfert, en bas et explicites plutôt que cachés dans chaque ligne.
            Ils sont rares — une fois par personne, à sa majorité — mais doivent être trouvables.

            ⚠️ **On ne filtre PAS la liste par âge.** L'âge de majorité est le paramètre PM-16, et il
            n'est servi à AUCUN client : le recopier ici ferait mentir l'écran le jour où il change.
            Le serveur refuse et nomme l'âge ; c'est sa phrase qu'on montre.
          */}
          <View style={styles.actions}>
            <Pressable onPress={() => setTransfertOpen(true)} style={styles.actionRow}>
              <Icon name="send" size={16} color={colors.accent} />
              <View style={styles.flex}>
                <Text style={styles.actionTitle}>Remettre un Carnet à son majeur</Text>
                <Text style={styles.actionSub}>Quand une personne à charge devient adulte, son Carnet lui revient.</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => setRecuperationOpen(true)} style={styles.actionRow}>
              <Icon name="key" size={16} color={colors.accent} />
              <View style={styles.flex}>
                <Text style={styles.actionTitle}>Récupérer mon Carnet</Text>
                <Text style={styles.actionSub}>Si un proche a tenu votre Carnet et vous a transmis un code.</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <CreateSubProfileModal visible={createOpen} onClose={() => setCreateOpen(false)} onDone={() => {
        setCreateOpen(false);
        load();
      }} />

      <TransfertModal
        visible={transfertOpen}
        dependants={items.filter(s => s.status !== 'TRANSFERRED')}
        onClose={() => setTransfertOpen(false)}
      />
      <RecuperationModal
        visible={recuperationOpen}
        onClose={() => setRecuperationOpen(false)}
        onDone={() => {
          setRecuperationOpen(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function CreateSubProfileModal({visible, onClose, onDone}: {visible: boolean; onClose: () => void; onDone: () => void}) {
  const {colors} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('F');
  const [busy, setBusy] = useState(false);

  /**
   * Fermeture de la feuille : « Annuler », appui sur le fond et bouton retour du téléphone passent tous
   * les trois par ici. Même correction que la feuille des rappels — un brouillon rempli disparaissait
   * sans un mot, et la saisie abandonnée réapparaissait à la réouverture faute d'être effacée.
   */
  const dismiss = useAbandonGuard({
    dirty: firstName.trim().length > 0 || lastName.trim().length > 0 || dob.trim().length > 0,
    title: 'Abandonner cet ajout ?',
    message: 'Les informations saisies pour cette personne seront perdues.',
    onLeave: () => {
      setFirstName('');
      setLastName('');
      setDob('');
      setSex('F');
      onClose();
    },
  });

  const submit = async () => {
    const iso = displayToIso(dob);
    if (firstName.trim().length < 1 || lastName.trim().length < 1 || !iso) {
      await alert({title: 'Champs incomplets', message: 'Prénom, nom et date de naissance (JJ/MM/AAAA) requis.'});
      return;
    }
    setBusy(true);
    try {
      await api.createSubProfile({firstName: firstName.trim(), lastName: lastName.trim(), birthDate: iso, sex});
      setFirstName('');
      setLastName('');
      setDob('');
      onDone();
    } catch (e) {
      await alert({title: 'Oups', message: e instanceof ApiError ? e.message : 'Création impossible — réessayez.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Ajouter une personne à charge</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={colors.textDisabled} autoCapitalize="words" autoFocus />
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={colors.textDisabled} autoCapitalize="words" />
          <TextInput style={styles.input} value={dob} onChangeText={t => setDob(t.replace(/[^\d/]/g, '').slice(0, 10))} placeholder="Date de naissance (JJ/MM/AAAA)" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" />
          <View style={styles.sexRow}>
            {(['F', 'M'] as Sex[]).map(s => {
              const on = sex === s;
              return (
                <Pressable key={s} onPress={() => setSex(s)} style={[styles.sexChip, on && styles.sexChipOn]}>
                  <Text style={[styles.sexText, on && styles.sexTextOn]}>{s === 'F' ? 'Fille / Femme' : 'Garçon / Homme'}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton title="Créer le Carnet" iconRight="check" loading={busy} onPress={submit} />
          <Pressable onPress={dismiss} style={styles.cancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


/**
 * La moitié du TUTEUR — étape 1 du transfert (CU-07-05).
 *
 * Deux temps dans une seule feuille : choisir la personne, puis transmettre. On ne les sépare pas en
 * deux écrans parce que le code obtenu **expire** (PM-17) : faire naviguer le tuteur entre-temps,
 * c'est risquer qu'il revienne trop tard.
 */
function TransfertModal({visible, dependants, onClose}: {visible: boolean; dependants: SubProfile[]; onClose: () => void}) {
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<string | null>(null);
  const [remise, setRemise] = useState<{prenom: string; code: string} | null>(null);

  const fermer = () => {
    setRemise(null);
    onClose();
  };

  const lancer = async (sp: SubProfile) => {
    setBusy(sp.id);
    try {
      const {intentId} = await api.startSubProfileClaim(sp.id);
      setRemise({prenom: sp.firstName, code: composerCode({subProfileId: sp.id, intentId})});
    } catch (e) {
      /*
        Le refus le plus fréquent est « pas encore l'âge requis », et le serveur y met l'âge exact
        (PM-16). On montre SA phrase : l'écran ne connaît pas ce nombre, et ne doit pas l'inventer.
      */
      await alert({title: 'Transfert impossible', message: e instanceof ApiError ? e.message : 'Réessayez dans un moment.'});
    } finally {
      setBusy(null);
    }
  };

  const partager = async () => {
    if (!remise) {
      return;
    }
    await Share.share({message: messageDePartage(remise.prenom, remise.code)});
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fermer}>
      <Pressable style={styles.backdrop} onPress={fermer}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {remise === null ? (
            <>
              <Text style={styles.sheetTitle}>Remettre un Carnet</Text>
              <Text style={styles.sheetIntro}>
                Choisissez la personne devenue adulte. Son Carnet lui appartiendra, et vous n’y aurez
                plus accès.
              </Text>
              {dependants.length === 0 ? (
                <Text style={styles.sheetIntro}>Aucune personne à charge à transférer.</Text>
              ) : (
                dependants.map(sp => (
                  <Pressable key={sp.id} onPress={() => lancer(sp)} disabled={busy !== null} style={styles.choix}>
                    <Text style={styles.choixNom}>{sp.firstName} {sp.lastName}</Text>
                    <Text style={styles.choixSub}>{busy === sp.id ? 'Envoi du code…' : `${ageOf(sp.birthDate)} ans`}</Text>
                  </Pressable>
                ))
              )}
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>À transmettre à {remise.prenom}</Text>
              {/*
                Deux choses, par deux canaux, et c'est délibéré : ce code désigne le Carnet, le code
                à 6 chiffres autorise. Envoyés ensemble dans la même conversation, ils formeraient un
                sésame complet pour qui lirait par-dessus l'épaule.
              */}
              <Text style={styles.sheetIntro}>
                Envoyez-lui ce code d’identification. Le code à 6 chiffres que vous venez de recevoir,
                donnez-le-lui <Text style={styles.gras}>autrement</Text> — de vive voix, par exemple.
              </Text>
              <Text style={styles.code} selectable>{remise.code}</Text>
              <PrimaryButton title="Partager le code" iconRight="share" onPress={partager} />
              <Text style={styles.sheetNote}>
                Le transfert ne se fera que lorsque {remise.prenom} l’aura confirmé depuis son propre
                compte. Rien n’a encore changé.
              </Text>
            </>
          )}
          <Pressable onPress={fermer} style={styles.cancel}>
            <Text style={styles.cancelText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * La moitié du MAJEUR — étape 2 (CU-07-05).
 *
 * Il colle le code reçu et saisit les six chiffres que son tuteur lui a donnés. Au succès, le Carnet
 * devient le sien : c'est une remise, pas un partage.
 */
function RecuperationModal({visible, onClose, onDone}: {visible: boolean; onClose: () => void; onDone: () => void}) {
  const {colors} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const dismiss = useAbandonGuard({
    dirty: code.trim().length > 0 || otp.trim().length > 0,
    title: 'Abandonner la récupération ?',
    message: 'Le code saisi sera effacé.',
    onLeave: () => {
      setCode('');
      setOtp('');
      onClose();
    },
  });

  const submit = async () => {
    /*
      On relit le code AVANT d'appeler : un identifiant tronqué au partage reviendrait « sous-profil
      introuvable », et ferait chercher du côté du tuteur un défaut qui n'est que dans le collage.
    */
    const lu = lireCode(code);
    if (!lu) {
      await alert({
        title: 'Code non reconnu',
        message: 'Ce code semble incomplet. Demandez à votre proche de le renvoyer en entier.',
      });
      return;
    }
    if (!isValidOtp(otp.trim())) {
      await alert({title: 'Code à 6 chiffres', message: 'Saisissez les six chiffres reçus par votre proche.'});
      return;
    }
    setBusy(true);
    try {
      await api.claimSubProfile(lu.subProfileId, {intentId: lu.intentId, otpCode: otp.trim()});
      setCode('');
      setOtp('');
      await alert({
        title: 'Carnet récupéré',
        message: 'Votre Carnet de santé vous appartient désormais. Votre proche n’y a plus accès.',
      });
      onDone();
    } catch (e) {
      await alert({title: 'Récupération impossible', message: e instanceof ApiError ? e.message : 'Réessayez dans un moment.'});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Récupérer mon Carnet</Text>
          <Text style={styles.sheetIntro}>
            Votre proche doit d’abord lancer la remise depuis son compte. Il vous transmet alors un
            code d’identification, puis un code à 6 chiffres.
          </Text>
          <TextInput
            style={[styles.input, styles.inputCode]}
            value={code}
            onChangeText={setCode}
            placeholder="Collez le code reçu"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
          />
          <PrimaryButton title="Récupérer mon Carnet" iconRight="check" loading={busy} onPress={submit} />
          <Pressable onPress={dismiss} style={styles.cancel}>
            <Text style={styles.cancelText}>Annuler</Text>
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
    addBtn: {width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center'},
    content: {padding: 16, gap: 12, paddingBottom: 28},
    intro: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, lineHeight: 18},

    row: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
    avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent600, alignItems: 'center', justifyContent: 'center'},
    avatarText: {fontFamily: fonts.display, fontSize: 15, color: '#fff'},
    name: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textPrimary},
    sub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1},

    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    sheet: {backgroundColor: colors.surface, borderTopLeftRadius: radius.cardTop, borderTopRightRadius: radius.cardTop, padding: 20, paddingBottom: 28, gap: 12},
    sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
    input: {minHeight: 48, borderRadius: radius.field, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14.5, color: colors.textPrimary},
    sexRow: {flexDirection: 'row', gap: 8},
    sexChip: {flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.field, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: colors.borderSubtle},
    sexChipOn: {backgroundColor: colors.accent50, borderColor: colors.accent500},
    sexText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.textSecondary},
    sexTextOn: {color: colors.accent},
    rowTransfere: {opacity: 0.55},
    avatarTransfere: {backgroundColor: colors.textTertiary},

    actions: {gap: 8, marginTop: 4},
    actionRow: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 13},
    actionTitle: {fontFamily: fonts.body, fontWeight: '600', fontSize: 13.5, color: colors.textPrimary},
    actionSub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2, lineHeight: 17},

    sheetIntro: {fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19},
    sheetNote: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17},
    gras: {fontWeight: '700', color: colors.textPrimary},
    choix: {borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.field, padding: 13, backgroundColor: colors.bg},
    choixNom: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textPrimary},
    choixSub: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1},
    /* Le code est long et se lit caractère par caractère : chasse fixe, et sélectionnable. */
    code: {fontFamily: 'monospace', fontSize: 12.5, color: colors.textPrimary, backgroundColor: colors.bgMuted, borderRadius: radius.field, padding: 12, lineHeight: 19},
    inputCode: {minHeight: 72, paddingTop: 12, textAlignVertical: 'top'},

    cancel: {alignItems: 'center', paddingVertical: 6},
    cancelText: {fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textTertiary},
  });
