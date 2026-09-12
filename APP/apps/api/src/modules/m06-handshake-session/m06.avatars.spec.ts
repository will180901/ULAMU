/**
 * L'identité dans la vue d'une séance — photos (chantier 97), prénoms et présence (chantier 98).
 *
 * ── Ce que ce fichier garde ───────────────────────────────────────────────────────────────────
 *
 * Demande du porteur, posée au chantier 92 et restée bloquée jusqu'ici : *« pour ce cercle il faut
 * mettre la photo de profil de celui qui a envoyé ça »*. Le blocage n'était pas la base — les deux
 * `avatarKey` y sont depuis août — mais la **vue de séance**, qui ne portait aucune identité : ni
 * nom, ni photo. Les deux écrans n'avaient rien à afficher.
 *
 * Deux choses se vérifient ici, et la seconde est celle qui compte :
 *
 *  1. les deux clés SORTENT bien, sans quoi la photo n'apparaîtrait jamais ;
 *  2. l'absence de photo rend **`null`**, et non une chaîne vide ou un `undefined` — les écrans
 *     retombent alors sur ce qu'ils affichaient avant. *Un rond gris générique ressemblerait à la
 *     fonctionnalité sans en être une.*
 *
 * ── Pourquoi des doublures ────────────────────────────────────────────────────────────────────
 *
 * Les suites d'intégration exigent une base de test que ce poste n'a pas (`DATABASE_URL` désigne la
 * production — voir `test/garde-base-de-test.ts`). `SessionService` est une classe ordinaire à six
 * dépendances : on l'instancie avec des doublures, et on lit ce qu'elle renvoie.
 */
import { CareSessionStatus } from "@prisma/client";

import { SessionService } from "./m06.session.service";

type Actor = { accountId: string; type: string };

const SEANCE = {
  id: "s1",
  handshakeId: "h1",
  status: CareSessionStatus.ACTIVE,
  patientAccountId: "pat-1",
  professionalId: "pro-1",
  subProfileId: null,
  durationMin: 30,
  paidAt: new Date("2026-09-11T20:00:00.000Z"),
  startedAt: new Date("2026-09-11T20:00:00.000Z"),
  endsAt: new Date("2026-09-11T20:30:00.000Z"),
  endedAt: null,
  extensionTotalSec: 0,
  reportDepositedAt: null,
};

/**
 * Un service dont la seule chose vivante est la lecture des deux profils.
 *
 * @param photos ce que la base rend pour chacun — `undefined` simule un profil absent.
 */
function service(
  photos: { patient?: string | null; soignant?: string | null },
  presence?: { state: "ONLINE" | "OFFLINE" | "DO_NOT_DISTURB"; ageSec: number } | null,
): SessionService {
  const prisma = {
    sessionRating: { findUnique: async () => null },
    sessionMessage: { findMany: async () => [] },
    patientProfile: {
      findUnique: async () => ({ avatarKey: photos.patient ?? null, firstName: "Mireille", lastName: "Nkouka" }),
    },
    professionalProfile: {
      findUnique: async () => ({ avatarKey: photos.soignant ?? null, firstName: "Armel", lastName: "Konaté" }),
    },
    /* `undefined` = le serveur n'a JAMAIS entendu parler de cette personne ; `null` explicite aussi. */
    presenceStatus: {
      findUnique: async () =>
        presence ? { state: presence.state, lastHeartbeatAt: new Date(Date.now() - presence.ageSec * 1000) } : null,
    },
  };
  /* PM-28 (démarrage auto), PM-30 (dépôt) et PM-26 (fraîcheur d'une présence) passent tous par ici. */
  const params = { getInt: async () => 900 };

  const s = new SessionService(
    prisma as never,
    params as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  // `loadForParticipant` vérifie les droits et `settle` fait courir le décompteur : ni l'un ni
  // l'autre n'est le sujet ici, et tous deux demanderaient une vraie base.
  (s as unknown as { loadForParticipant: () => Promise<typeof SEANCE> }).loadForParticipant = async () => SEANCE;
  (s as unknown as { settle: () => Promise<typeof SEANCE> }).settle = async () => SEANCE;
  (s as unknown as { otherPartyTyping: () => boolean }).otherPartyTyping = () => false;
  return s;
}

const ACTEUR: Actor = { accountId: "pro-1", type: "PROFESSIONAL" };

describe("La vue d'une séance porte l'identité des deux participants", () => {
  it("sert la clé de chacun des deux participants", async () => {
    const vue = await service({ patient: "av_pat.jpg", soignant: "av_pro.jpg" }).getSession(ACTEUR as never, "s1");

    expect(vue.patientAvatarKey).toBe("av_pat.jpg");
    expect(vue.professionalAvatarKey).toBe("av_pro.jpg");
  });

  /*
    ⚠️ `null`, et rien d'autre. Une chaîne vide passerait le test « la clé existe-t-elle ? » des
    écrans et produirait une image cassée dans le cercle de lecture ; un `undefined` disparaîtrait
    du JSON, et le contrat ne dirait plus la même chose que le type.
  */
  it("⚠️ et rend null — pas une chaîne vide — quand il n'y a pas de photo", async () => {
    const vue = await service({ patient: null, soignant: null }).getSession(ACTEUR as never, "s1");

    expect(vue.patientAvatarKey).toBeNull();
    expect(vue.professionalAvatarKey).toBeNull();
  });

  /*
    ── La présence de l'autre participant — chantier 98 ────────────────────────────────────────

    Le bandeau de la discussion dit « en ligne », « en train d'écrire… » ou « vu il y a 12 min ».
    Les deux premiers viennent d'ailleurs ; le troisième vient d'ici.
  */
  it("dit en ligne quand le signe de vie est frais", async () => {
    const vue = await service({}, { state: "ONLINE", ageSec: 30 }).getSession(ACTEUR as never, "s1");

    expect(vue.otherPartyPresence.online).toBe(true);
    expect(vue.otherPartyPresence.since).not.toBeNull();
  });

  /* Au-delà de PM-26, un battement n'est plus une présence — la MÊME règle que l'annuaire. */
  it("et hors ligne quand il a vieilli au-delà du délai de l'annuaire", async () => {
    const vue = await service({}, { state: "ONLINE", ageSec: 2000 }).getSession(ACTEUR as never, "s1");

    expect(vue.otherPartyPresence.online).toBe(false);
    expect(vue.otherPartyPresence.since).not.toBeNull();
  });

  /*
    ⚠️ **« On ne sait pas » ne s'écrit pas comme « hors ligne depuis toujours ».** Quand le serveur
    n'a jamais reçu le moindre battement — ce qui était le cas de TOUS les patients avant le
    chantier 98, leur application n'en envoyant aucun — `since` doit rester nul, pour que l'écran
    dise « hors ligne » sans inventer une durée.
  */
  it("⚠️ et ne date rien quand il n'a jamais eu de nouvelles", async () => {
    const vue = await service({}, null).getSession(ACTEUR as never, "s1");

    expect(vue.otherPartyPresence.online).toBe(false);
    expect(vue.otherPartyPresence.since).toBeNull();
  });

  /*
    Le prénom du patient, que l'écran du soignant affichait jusqu'ici comme « Le patient » faute de
    l'avoir. Le nom de famille suit, pour la seule initiale du cercle.
  */
  it("sert le prénom et le nom des deux participants", async () => {
    const vue = await service({}).getSession(ACTEUR as never, "s1");

    expect(vue.patientFirstName).toBe("Mireille");
    expect(vue.patientLastName).toBe("Nkouka");
    expect(vue.professionalFirstName).toBe("Armel");
  });

  /* Un profil absent en base — un compte incomplet — ne doit pas faire tomber la consultation. */
  it("et un profil absent ne casse pas l'ouverture de la séance", async () => {
    const s = service({});
    const prisma = (s as unknown as { prisma: { patientProfile: { findUnique: () => Promise<null> } } }).prisma;
    prisma.patientProfile.findUnique = async () => null;

    const vue = await s.getSession(ACTEUR as never, "s1");

    expect(vue.patientAvatarKey).toBeNull();
  });
});
