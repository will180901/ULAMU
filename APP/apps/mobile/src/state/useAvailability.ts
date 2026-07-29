/**
 * Vérification de disponibilité d'un identifiant PENDANT la saisie (nom d'utilisateur, email,
 * téléphone) — M01.
 *
 * Existe pour supprimer un mur : jusqu'ici seul le nom d'utilisateur était vérifié en direct, tandis
 * que l'email et le téléphone ne l'étaient qu'à la toute fin de l'inscription. Quelqu'un qui se
 * réinscrivait par erreur remplissait trois écrans, attendait un code par email, le saisissait — et
 * se heurtait seulement là à « ce numéro est déjà enregistré », le code gaspillé et décompté de son
 * quota horaire (PM-19).
 *
 * Le même hook sert les trois champs : leurs états et leurs temporisations ne peuvent donc plus
 * diverger, et un futur champ vérifiable se branche sans réécrire cette mécanique.
 */
import {useEffect, useRef, useState} from 'react';

/**
 * `idle`      champ vide, rien à dire
 * `invalid`   mal formé — inutile d'interroger le serveur
 * `checking`  requête en cours (ou saisie encore en train d'être temporisée)
 * `available` libre
 * `taken`     déjà utilisé par un compte
 * `error`     le serveur n'a pas répondu — état DISTINCT de `idle`, sans quoi une panne réseau
 *             laisserait l'écran muet et le bouton mort sans que rien n'en dise la cause.
 */
export type AvailabilityStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

/** Temporisation avant d'interroger le serveur : assez court pour paraître instantané, assez long
 * pour ne pas envoyer une requête par lettre tapée (les routes concernées sont à débit limité). */
const DEBOUNCE_MS = 450;

export function useAvailability(
  rawValue: string,
  opts: {
    /** Met la valeur sous sa forme canonique (minuscules, indicatif +242…) avant tout envoi. */
    normalize: (raw: string) => string | null;
    /** Interroge le serveur. Rejette en cas d'échec réseau — le hook en fait un statut `error`. */
    check: (normalized: string) => Promise<{available: boolean}>;
  },
): AvailabilityStatus {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  // Les deux fonctions sont souvent redéfinies à chaque rendu par l'appelant : les lire par référence
  // évite de relancer la vérification (et donc de repartir sur 450 ms d'attente) à chaque frappe.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const trimmed = (rawValue ?? '').trim();
    if (trimmed.length === 0) {
      setStatus('idle');
      return;
    }
    const normalized = optsRef.current.normalize(rawValue);
    if (!normalized) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await optsRef.current.check(normalized);
        // Une réponse arrivée après que l'utilisateur a retapé ne doit jamais écraser l'état courant :
        // sans ce garde, une réponse lente pour « ma » pouvait s'appliquer à « marie » déjà saisi.
        if (!cancelled) {
          setStatus(res.available ? 'available' : 'taken');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [rawValue]);

  return status;
}
