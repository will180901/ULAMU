/**
 * Système de dialogues ULAMU — remplace les boîtes natives (Alert.alert, choix de source photo…).
 * Monté une fois (App.tsx) ; les écrans appellent `useDialog()` → `alert` / `confirm` / `actionSheet`,
 * chacun renvoie une Promise. Style ULAMU (carte cobalt centrée pour alert/confirm, feuille basse pour actionSheet).
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from './Icon';
import {fonts, Palette, radius, shadow} from '../theme';
import {useTheme, useThemedStyles} from '../state/ThemeContext';

type AlertOpts = {title?: string; message: string; okLabel?: string};
type ConfirmOpts = {title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean};
type SheetAction = {label: string; value: string; icon?: IconName; danger?: boolean};
type SheetOpts = {title?: string; message?: string; actions: SheetAction[]; cancelLabel?: string};

interface DialogApi {
  alert: (opts: AlertOpts) => Promise<void>;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  actionSheet: (opts: SheetOpts) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

/** Hook d'accès aux dialogues ULAMU. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog doit être utilisé dans <DialogProvider>');
  }
  return ctx;
}

// Pont impératif : laisse les modules NON-React (services/media.ts, helpers module) ouvrir un dialogue ULAMU.
let imperativeApi: DialogApi | null = null;
export const dialogs = {
  alert: (o: AlertOpts): Promise<void> => (imperativeApi ? imperativeApi.alert(o) : Promise.resolve()),
  confirm: (o: ConfirmOpts): Promise<boolean> => (imperativeApi ? imperativeApi.confirm(o) : Promise.resolve(false)),
  actionSheet: (o: SheetOpts): Promise<string | null> => (imperativeApi ? imperativeApi.actionSheet(o) : Promise.resolve(null)),
};

type Req =
  | {kind: 'alert'; opts: AlertOpts}
  | {kind: 'confirm'; opts: ConfirmOpts}
  | {kind: 'sheet'; opts: SheetOpts};

export function DialogProvider({children}: {children: React.ReactNode}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [req, setReq] = useState<Req | null>(null);
  const resolver = useRef<((v: any) => void) | null>(null);

  const close = useCallback((value: any) => {
    setReq(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(value);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: (opts) => new Promise<void>((res) => { resolver.current = () => res(); setReq({kind: 'alert', opts}); }),
      confirm: (opts) => new Promise<boolean>((res) => { resolver.current = res; setReq({kind: 'confirm', opts}); }),
      actionSheet: (opts) => new Promise<string | null>((res) => { resolver.current = res; setReq({kind: 'sheet', opts}); }),
    }),
    [],
  );

  // Expose l'API au pont impératif tant que le provider est monté.
  useEffect(() => {
    imperativeApi = api;
    return () => {
      if (imperativeApi === api) {
        imperativeApi = null;
      }
    };
  }, [api]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={!!req} transparent animationType="fade" onRequestClose={() => close(req?.kind === 'confirm' ? false : req?.kind === 'sheet' ? null : undefined)}>
        {req?.kind === 'sheet' ? (
          <Pressable style={styles.backdropEnd} onPress={() => close(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              {(req.opts.title || req.opts.message) && (
                <View style={styles.sheetHead}>
                  {req.opts.title ? <Text style={styles.sheetTitle}>{req.opts.title}</Text> : null}
                  {req.opts.message ? <Text style={styles.sheetMsg}>{req.opts.message}</Text> : null}
                </View>
              )}
              {req.opts.actions.map((a) => (
                <Pressable key={a.value} style={styles.row} onPress={() => close(a.value)}>
                  {a.icon ? <Icon name={a.icon} size={18} color={a.danger ? colors.error : colors.textSecondary} /> : null}
                  <Text style={[styles.rowText, a.danger && {color: colors.error}]}>{a.label}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.row, styles.sheetCancel]} onPress={() => close(null)}>
                <Text style={styles.rowCancelText}>{req.opts.cancelLabel ?? 'Annuler'}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        ) : req ? (
          <Pressable style={styles.backdropCenter} onPress={() => close(req.kind === 'confirm' ? false : undefined)}>
            <Pressable style={styles.card} onPress={() => {}}>
              {req.opts.title ? <Text style={styles.title}>{req.opts.title}</Text> : null}
              <Text style={styles.message}>{req.opts.message}</Text>
              {req.kind === 'confirm' ? (
                <View style={styles.btnRow}>
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => close(false)}>
                    <Text style={styles.btnGhostText}>{req.opts.cancelLabel ?? 'Annuler'}</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, req.opts.danger ? styles.btnDanger : styles.btnPrimary]} onPress={() => close(true)}>
                    <Text style={styles.btnSolidText}>{req.opts.confirmLabel ?? 'Confirmer'}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Pressable style={[styles.btn, styles.btnPrimary, {flex: 1}]} onPress={() => close(undefined)}>
                    <Text style={styles.btnSolidText}>{req.opts.okLabel ?? 'OK'}</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          </Pressable>
        ) : (
          <View />
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdropCenter: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28},
    backdropEnd: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    card: {width: '100%', maxWidth: 380, backgroundColor: colors.bgElevated, borderRadius: 16, padding: 20, gap: 8, ...shadow.lg},
    title: {fontFamily: fonts.displayBold, fontSize: 16.5, color: colors.textPrimary},
    message: {fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary},
    btnRow: {flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end'},
    btn: {minWidth: 96, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
    btnPrimary: {backgroundColor: colors.accent500},
    btnDanger: {backgroundColor: colors.error},
    btnGhost: {backgroundColor: colors.bgMuted},
    btnSolidText: {fontFamily: fonts.displayBold, fontSize: 14, color: '#fff'},
    btnGhostText: {fontFamily: fonts.displayBold, fontSize: 14, color: colors.textSecondary},
    // Feuille basse (action sheet)
    sheet: {backgroundColor: colors.bgElevated, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 8, paddingBottom: 26},
    handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginVertical: 8},
    sheetHead: {paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 3},
    sheetTitle: {fontFamily: fonts.displayBold, fontSize: 15, color: colors.textPrimary},
    sheetMsg: {fontFamily: fonts.body, fontSize: 12.5, color: colors.textTertiary, lineHeight: 17},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 18, borderRadius: radius.md},
    rowText: {fontFamily: fonts.body, fontSize: 15, fontWeight: '500', color: colors.textPrimary},
    sheetCancel: {marginTop: 4, justifyContent: 'center', backgroundColor: colors.bgMuted},
    rowCancelText: {fontFamily: fonts.displayBold, fontSize: 14.5, color: colors.textSecondary},
  });
