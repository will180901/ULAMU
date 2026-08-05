/**
 * Signale qu'une requête « prend anormalement longtemps », pour pouvoir l'expliquer à l'utilisateur.
 *
 * Raison très concrète : l'API ULAMU est hébergée sur une offre gratuite qui met le serveur en veille
 * après un quart d'heure sans trafic. La première requête qui le réveille peut demander près d'une
 * minute. Sans explication, l'utilisateur ne voit qu'un indicateur qui tourne interminablement — et le
 * premier réflexe, devant une app de santé inconnue qui semble bloquée, est de la désinstaller.
 *
 * Le délai est volontairement court (4 s) : au-delà, l'attente n'est plus perçue comme « ça charge »
 * mais comme « c'est cassé », et c'est précisément ce moment-là qu'il faut désamorcer.
 */
import {useEffect, useState} from 'react';

const SLOW_AFTER_MS = 4000;

export function useSlowRequest(pending: boolean, delayMs = SLOW_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [pending, delayMs]);

  return slow;
}
