/**
 * État GLOBAL du profil patient (MeResponse). Pièce maîtresse de la propagation instantanée :
 * tout écran qui affiche le nom/l'avatar de l'utilisateur lit `me` ici (au lieu d'un useState local).
 * Après un changement (photo, profil), on appelle setMe(réponse) → l'UI se met à jour PARTOUT, sans recharger.
 * Rafraîchi à la connexion (api.getMe), vidé à la déconnexion (anti-fuite entre comptes).
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {api} from '../services/api';
import {MeResponse} from '../lib/contracts';
import {useAuth} from './AuthContext';

type MeStatus = 'loading' | 'ready' | 'error';

interface MeContextValue {
  me: MeResponse | null;
  status: MeStatus;
  refreshMe: () => Promise<void>;
  setMe: (me: MeResponse | null) => void;
}

const MeContext = createContext<MeContextValue | null>(null);

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error('useMe doit être utilisé dans <MeProvider>');
  }
  return ctx;
}

export function MeProvider({children}: {children: React.ReactNode}) {
  const {state} = useAuth();
  const authed = state.status === 'authenticated';
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<MeStatus>('loading');

  const refreshMe = useCallback(async () => {
    try {
      const m = await api.getMe();
      setMe(m);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (authed) {
      setStatus('loading');
      refreshMe();
    } else {
      setMe(null);
      setStatus('loading');
    }
  }, [authed, refreshMe]);

  const value = useMemo<MeContextValue>(() => ({me, status, refreshMe, setMe}), [me, status, refreshMe]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}
