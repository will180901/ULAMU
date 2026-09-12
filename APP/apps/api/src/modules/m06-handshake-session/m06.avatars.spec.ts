/**
 * Les photos de profil dans la vue d'une séance — chantier 97, 12/09/2026.
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
function service(photos: { patient?: string | null; soignant?: string | null }): SessionService {
  const prisma = {
    preConsultation: { findUnique: async () => null },
    sessionRating: { findUnique: async () => null },
    sessionMessage: { findMany: async () => [] },
    patientProfile: { findUnique: async () => ({ avatarKey: photos.patient ?? null }) },
    professionalProfile: { findUnique: async () => ({ avatarKey: photos.soignant ?? null }) },
  };
  const params = { getInt: async () => 600 };

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

describe("La vue d'une séance porte les deux photos de profil", () => {
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

  /* Un profil absent en base — un compte incomplet — ne doit pas faire tomber la consultation. */
  it("et un profil absent ne casse pas l'ouverture de la séance", async () => {
    const s = service({});
    const prisma = (s as unknown as { prisma: { patientProfile: { findUnique: () => Promise<null> } } }).prisma;
    prisma.patientProfile.findUnique = async () => null;

    const vue = await s.getSession(ACTEUR as never, "s1");

    expect(vue.patientAvatarKey).toBeNull();
  });
});
