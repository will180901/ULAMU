/**
 * L'expiration d'une session — chantier 53, 06/09/2026.
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * La règle vivait dans `AuthGuard`, en ligne. Elle n'était donc appliquée qu'au moment où quelqu'un
 * **utilisait** un jeton : la garde constatait l'inactivité, révoquait, refusait. Correct pour la
 * sécurité — un jeton volé cesse de servir — mais cela laissait en base des sessions « non
 * révoquées » qui ne pouvaient plus rien.
 *
 * ⚠️ **Et l'écran « Mes appareils » les affichait comme actives.** Mesuré en production le
 * 06/09/2026 : **28 sessions listées, 26 déjà mortes**, dont dix-huit sur un seul compte — pas une
 * seule utilisable. Un écran de sécurité qui montre dix-huit appareils dont aucun n'a accès ne
 * protège plus personne : la session réellement suspecte y serait noyée, et celui qui fait le
 * ménage clique dans un tas de cadavres — le bouton de révocation n'ayant aucune confirmation.
 *
 * Ces tests gardent la seule chose qui compte ici : **la garde et la liste disent la MÊME chose**.
 * Deux règles pour une même question finiraient par diverger, et l'écran se remettrait à mentir.
 */
import { idleLimitSeconds, sessionIsExpired, WEB_IDLE_SECONDS } from "./session-expiry";

/** PM-20 tel qu'il est semé : 30 jours glissants pour le mobile (D-027). */
const PM20 = 2_592_000;
const MAINTENANT = 1_757_000_000_000;
const MINUTE = 60_000;

describe("Combien de temps une session survit à l'inactivité", () => {
  it("le web tolère 30 minutes (ENF-07)", () => {
    expect(WEB_IDLE_SECONDS).toBe(30 * 60);
    expect(idleLimitSeconds("web", PM20)).toBe(30 * 60);
  });

  /*
    Le mobile est un appareil personnel : sa durée est un PARAMÈTRE, pas une constante. Elle est
    donc injectée — écrire « 30 jours » ici ferait mentir le test le jour où PM-20 change.
  */
  it("le mobile suit PM-20, injecté et jamais écrit en dur", () => {
    expect(idleLimitSeconds("mobile", PM20)).toBe(PM20);
    expect(idleLimitSeconds("mobile", 42)).toBe(42);
  });
});

describe("Une session web meurt après 30 minutes", () => {
  it("vivante à 29 minutes, morte à 31", () => {
    expect(sessionIsExpired("web", MAINTENANT - 29 * MINUTE, MAINTENANT, PM20)).toBe(false);
    expect(sessionIsExpired("web", MAINTENANT - 31 * MINUTE, MAINTENANT, PM20)).toBe(true);
  });

  /*
    La comparaison est STRICTE, exactement comme la garde le faisait avant l'extraction : à la
    seconde pile, la session vit encore. Si la liste et la garde ne s'accordaient pas sur cette
    borne, la liste révoquerait une session que la garde aurait laissée passer — et l'utilisateur
    serait déconnecté pour avoir consulté ses appareils.
  */
  it("à la seconde PILE, elle vit encore — la borne est la même des deux côtés", () => {
    expect(sessionIsExpired("web", MAINTENANT - WEB_IDLE_SECONDS * 1000, MAINTENANT, PM20)).toBe(false);
    expect(sessionIsExpired("web", MAINTENANT - WEB_IDLE_SECONDS * 1000 - 1, MAINTENANT, PM20)).toBe(true);
  });
});

describe("Une session mobile vit beaucoup plus longtemps", () => {
  /*
    Le cas qui explique la mesure de production : dix-huit sessions web d'un même compte, toutes
    mortes depuis des heures, toutes listées comme des appareils connectés.
  */
  it("ce qui tue une session web depuis longtemps laisse une session mobile intacte", () => {
    const troisHeures = MAINTENANT - 180 * MINUTE;

    expect(sessionIsExpired("web", troisHeures, MAINTENANT, PM20)).toBe(true);
    expect(sessionIsExpired("mobile", troisHeures, MAINTENANT, PM20)).toBe(false);
  });

  it("meurt tout de même passé PM-20", () => {
    expect(sessionIsExpired("mobile", MAINTENANT - (PM20 + 1) * 1000, MAINTENANT, PM20)).toBe(true);
  });

  /*
    Un client inconnu — une future application, un outil — doit être traité comme le mobile, jamais
    comme le web. Se tromper dans ce sens déconnecte quelqu'un toutes les demi-heures ; se tromper
    dans l'autre laisserait un jeton vivre trente jours. On choisit la gêne, pas le risque… et c'est
    pourquoi ce test existe : pour que le choix reste délibéré.
  */
  it("un client inconnu suit la règle du mobile, pas celle du web", () => {
    expect(idleLimitSeconds("desktop", PM20)).toBe(PM20);
  });
});
