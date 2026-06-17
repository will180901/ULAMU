/**
 * Bouton Urgence flottant + modale (M15) — reproduction de tabs.jsx (bouton Urgence + Modal urgence).
 * Posé sur la coque à onglets (masqué pendant les flux plein écran). « Appeler » ouvre le clavier
 * d'appel natif (tel:) pré-rempli avec EMERGENCY_NUMBER ; la fiche vitale vient de la synthèse Carnet (M07).
 */
import React, {useEffect, useState} from 'react';
import {Linking, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDialog} from './Dialog';
import {Banner, PrimaryButton} from './ui';
import {Icon} from './Icon';
import {api} from '../services/api';
import {EMERGENCY_NUMBER} from '../config';
import {HealthSummary} from '../lib/contracts';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

export function UrgenceButton() {
  const {colors} = useTheme();
  const {alert} = useDialog();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [vitals, setVitals] = useState<HealthSummary | null>(null);

  // Fiche vitale (M15) alimentée par la synthèse du Carnet (M07) — chargée à l'ouverture.
  useEffect(() => {
    if (open && !vitals) {
      api.getHealthSummary().then(setVitals).catch(() => undefined);
    }
  }, [open, vitals]);

  // Ouvre le clavier d'appel natif pré-rempli avec le numéro de garde — l'utilisateur valide l'appel.
  const onCall = async () => {
    setOpen(false);
    const url = `tel:${EMERGENCY_NUMBER}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        throw new Error('tel non supporté');
      }
      await Linking.openURL(url);
    } catch {
      await alert({title: 'Appel impossible', message: `Composez le ${EMERGENCY_NUMBER} depuis votre téléphone en cas d'urgence vitale.`});
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.fab, {bottom: Math.max(insets.bottom, 8) + 70}, shadow.lg]}
        accessibilityRole="button"
        accessibilityLabel="Urgence">
        <Icon name="phone" size={17} color="#fff" strokeWidth={1.9} />
        <Text style={styles.fabText}>Urgence</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Urgence médicale</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.closeBtn}>
                <Icon name="plus" size={20} color={colors.textTertiary} strokeWidth={2} />
              </Pressable>
            </View>

            <Banner tone="error" title="Si la vie est en danger">
              Appelez immédiatement — l'appel doit être gratuit et prioritaire, même sans crédit.
            </Banner>

            {/* Fiche vitale (M15 ← synthèse Carnet M07) */}
            {vitals && (vitals.bloodType || vitals.activeAllergies.length > 0 || vitals.chronicDiseases.length > 0) && (
              <View style={styles.vitals}>
                <Text style={styles.vitalsTitle}>Fiche vitale</Text>
                {vitals.bloodType && <VitalRow icon="users" label="Groupe sanguin" value={vitals.bloodType} />}
                {vitals.activeAllergies.length > 0 && <VitalRow icon="shield-check" label="Allergies" value={vitals.activeAllergies.join(', ')} danger />}
                {vitals.chronicDiseases.length > 0 && <VitalRow icon="file-medical" label="Chroniques" value={vitals.chronicDiseases.join(', ')} />}
              </View>
            )}

            <Text style={styles.body}>
              Votre position approximative (votre arrondissement) sera partagée avec le service de garde.
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <View style={styles.flex}>
                <PrimaryButton title="Appeler le service de garde" iconLeft="phone" onPress={onCall} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function VitalRow({icon, label, value, danger}: {icon: 'users' | 'shield-check' | 'file-medical'; label: string; value: string; danger?: boolean}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.vitalRow}>
      <Icon name={icon} size={14} color={danger ? colors.error : colors.accent400} />
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={[styles.vitalValue, danger && {color: colors.error}]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: {flex: 1},
  vitals: {backgroundColor: colors.bgSubtle, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.card, padding: 12, gap: 8},
  vitalsTitle: {fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.textPrimary},
  vitalRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  vitalLabel: {fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, width: 92},
  vitalValue: {flex: 1, fontFamily: fonts.body, fontWeight: '600', fontSize: 12.5, color: colors.textPrimary},
  fab: {
    position: 'absolute',
    right: 14,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    backgroundColor: colors.errorDot,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 30,
  },
  fabText: {fontFamily: fonts.displayBold, fontSize: 13, color: '#fff'},

  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24},
  sheet: {width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.card, padding: 18, gap: 12},
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sheetTitle: {fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.textPrimary},
  closeBtn: {transform: [{rotate: '45deg'}]},
  body: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2},
  cancel: {paddingHorizontal: 16, paddingVertical: 13, borderRadius: radius.button, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.borderDefault},
  cancelText: {fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.textSecondary},
});
