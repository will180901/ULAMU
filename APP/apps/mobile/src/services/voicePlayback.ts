/**
 * Coordinateur « une seule note vocale à la fois » (façon WhatsApp). Chaque lecteur s'enregistre
 * en jouant ; démarrer un lecteur met les autres en pause. Léger pub-sub sans dépendance.
 */
type Stopper = () => void;

const stoppers = new Map<string, Stopper>();

/** Réclame la lecture pour `id` : met en pause tous les autres lecteurs actifs. */
export function claimPlayback(id: string, stopSelf: Stopper): void {
  for (const [key, stop] of stoppers) {
    if (key !== id) {
      stop();
    }
  }
  stoppers.set(id, stopSelf);
}

/** Libère `id` (à l'arrêt ou au démontage). */
export function releasePlayback(id: string): void {
  stoppers.delete(id);
}
