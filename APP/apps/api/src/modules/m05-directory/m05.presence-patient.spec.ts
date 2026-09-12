/**
 * Le battement de présence d'un PATIENT — chantier 102, 12/09/2026.
 *
 * ── Le défaut que ce fichier garde ────────────────────────────────────────────────────────────
 *
 * Le chantier 98 a fait dire au bandeau du soignant « en ligne » ou « vu il y a douze minutes » du
 * patient, et a branché l'envoi d'un battement depuis son téléphone. **La route était réservée au
 * professionnel.** Chaque battement était refusé, l'échec avalé en silence côté application, et le
 * statut affichait « hors ligne » pour toujours.
 *
 * *Brancher un appel sans vérifier que la porte s'ouvre, puis avaler le refus, produit une
 * fonctionnalité qui a l'air de marcher et ne marche jamais.* Vu en ligne, sur une vraie
 * consultation, par le porteur.
 *
 * ── Ce qui reste fermé ────────────────────────────────────────────────────────────────────────
 *
 * Les deux routes qui décident vraiment de la disponibilité — la bascule d'état et la lecture de sa
 * propre présence — restent réservées au professionnel. *Ouvrir une porte n'est pas ouvrir la
 * maison.*
 */
import { ForbiddenException } from "@nestjs/common";

import { M05Controller } from "./m05.controller";

type Acteur = { accountId: string; type: string };

const PATIENT: Acteur = { accountId: "pat-1", type: "PATIENT" };
const SOIGNANT: Acteur = { accountId: "pro-1", type: "PROFESSIONAL" };

function controleur(recu: string[]) {
  const presence = {
    heartbeat: async (id: string) => {
      recu.push(id);
      return { state: "ONLINE" };
    },
    setState: async () => ({ state: "ONLINE" }),
    getMine: async () => ({ state: "ONLINE" }),
  };
  return new M05Controller({} as never, presence as never, {} as never);
}

describe("Le battement de présence", () => {
  it("⚠️ accepte le PATIENT — sans quoi son statut est « hors ligne » pour toujours", async () => {
    const recu: string[] = [];

    await controleur(recu).heartbeat(PATIENT as never);

    expect(recu).toEqual(["pat-1"]);
  });

  it("et le professionnel, comme avant", async () => {
    const recu: string[] = [];

    await controleur(recu).heartbeat(SOIGNANT as never);

    expect(recu).toEqual(["pro-1"]);
  });

  /*
    ⚠️ **Mais la DISPONIBILITÉ reste au professionnel.** C'est elle qui décide si quelqu'un apparaît
    dans l'annuaire et peut recevoir une consultation : un patient n'a rien à y écrire.
  */
  it("⚠️ alors que la bascule de disponibilité reste refusée au patient", () => {
    const c = controleur([]);

    /*
      Le refus est SYNCHRONE : la garde jette avant que la moindre promesse soit créée. L'attendre
      avec `rejects` ne l'attraperait pas — le test échouerait en annonçant une promesse manquante,
      c'est-à-dire en accusant tout sauf la garde.
    */
    expect(() => c.setPresenceState(PATIENT as never, { state: "ONLINE" } as never)).toThrow(ForbiddenException);
    expect(() => c.myPresence(PATIENT as never)).toThrow(ForbiddenException);
  });
});
