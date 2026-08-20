/**
 * Seed ULAMU — paramètres métier PM-01 → PM-40.
 * Source de vérité : docs/cahier_des_charges/01_architecture_fonctionnelle/parametres_metier.md
 * Les valeurs sont sérialisées en chaîne ; les durées sont en secondes sauf mention.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Param = { key: string; value: string; description: string };

export const PLATFORM_PARAMETERS: Param[] = [
  { key: "PM-01", value: "10", description: "Commission ULAMU (%) sur consultations, suivis, missions de triage (D-022)" },
  { key: "PM-02", value: "0", description: "Commission ULAMU (%) sur les retraits de gains (D-022)" },
  { key: "PM-03", value: "500", description: "Prix du dévoilement en XAF (D-023)" },
  { key: "PM-04", value: "XAF", description: "Devise unique" },
  { key: "PM-05", value: "MTN_MOMO,AIRTEL_MONEY", description: "Opérateurs de paiement (via agrégateur agréé)" },
  { key: "PM-06", value: "500", description: "Plancher du prix d'une offre de consultation en XAF (D-024)" },
  { key: "PM-07", value: "300", description: "Expiration de la confirmation de poignée de main (s) — 5 min (D-024)" },
  { key: "PM-08", value: "86400", description: "Durée de la session de dévoilement et de la réservation (s) — 24 h (D-009)" },
  { key: "PM-09", value: "10,60", description: "Durées d'offre autorisées (min) : min,max (D-024)" },
  { key: "PM-10", value: "30", description: "Expiration d'une ordonnance non délivrée (jours) (D-024)" },
  { key: "PM-11", value: "72", description: "Délai cible de vérification d'un professionnel/structure (heures ouvrées) (D-024)" },
  { key: "PM-12", value: "immediate", description: "Exécution du remboursement automatique (D-008)" },
  { key: "PM-13", value: "1,5", description: "Échelle de notation : min,max (D-021)" },
  { key: "PM-14", value: "Africa/Brazzaville", description: "Fuseau de référence — calculs internes en UTC" },
  { key: "PM-15", value: "fr", description: "Langue unique au lancement (D-005)" },
  { key: "PM-16", value: "18", description: "Âge minimum d'un compte patient (ans) — mineurs via Carnet familial (D-033)" },
  { key: "PM-17", value: "300", description: "Validité d'un code OTP SMS (s) — 5 min (D-027)" },
  { key: "PM-18", value: "5,900,900", description: "Blocage connexion : échecs,fenêtre(s),blocage(s) — 5 en 15 min → 15 min (D-027)" },
  { key: "PM-19", value: "3", description: "Limite d'envoi d'OTP par numéro et par heure (D-027)" },
  { key: "PM-20", value: "2592000", description: "Durée de session de connexion mobile (s) — 30 jours glissants (D-027)" },
  { key: "PM-21", value: "30", description: "Délai de réactivation d'un compte clôturé (jours) (D-027)" },
  { key: "PM-22", value: "604800", description: "Expiration d'une invitation de membre (s) — 7 jours (D-028)" },
  { key: "PM-23", value: "48", description: "Délai cible de traitement d'un signalement (h) (D-030)" },
  { key: "PM-24", value: "5", description: "Rétention du journal d'audit (ans) — à confirmer avocat (D-030)" },
  { key: "PM-25", value: "5", description: "Offres de consultation actives max par professionnel (D-031)" },
  { key: "PM-26", value: "900", description: "Bascule automatique en absent — inactivité web (s) — 15 min (D-031)" },
  { key: "PM-27", value: "3", description: "Sessions actives simultanées max par professionnel (D-032)" },
  { key: "PM-28", value: "600", description: "Démarrage automatique de session après paiement (s) — 10 min (D-032)" },
  { key: "PM-29", value: "1800", description: "Prolongation gratuite cumulée max (s) — +30 min (D-032)" },
  { key: "PM-30", value: "86400", description: "Délai de dépôt du compte-rendu (s) — 24 h, gains gelés au-delà (D-032)" },
  { key: "PM-31", value: "10", description: "Conservation du Carnet après clôture (ans) — à confirmer avocat (D-033)" },
  { key: "PM-32", value: "60", description: "Alerte de péremption proche du stock (jours) (D-035)" },
  { key: "PM-33", value: "604800", description: "Fraîcheur du stock : exclusion de la recherche après (s) — 7 jours (D-035)" },
  { key: "PM-34", value: "7", description: "Exclusion temporaire après 3 strikes en 30 jours (jours) (D-036)" },
  { key: "PM-35", value: "50000", description: "Seuil de double validation des remboursements manuels (XAF) (D-037)" },
  { key: "PM-36", value: "86400", description: "Délai max d'exécution d'un retrait (s) — 24 h (D-037)" },
  { key: "PM-37", value: "90", description: "Rétention du centre de notifications (jours) (D-038)" },
  { key: "PM-38", value: "14400", description: "Validité du QR Urgence temporaire (s) — 4 h, non révocable (D-041)" },
  { key: "PM-39", value: "10", description: "Rayon d'intervention par défaut d'un soignant (km) (D-042)" },
  { key: "PM-40", value: "30", description: "Expiration d'une demande d'examens non réalisée (jours) (D-043)" },
];

/**
 * Données de DÉMO (dev uniquement) — pour que l'app patient ne soit pas vide en test :
 * un patient à identifiants connus + des soignants VÉRIFIÉS, sous contrat signé, avec offres,
 * présence et indicateurs. Désactivable avec SEED_DEMO=false. Idempotent (ré-exécutable :
 * rafraîchit notamment le battement de cœur pour garder les « en ligne » disponibles).
 */
interface DemoPro {
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  category: "GENERAL_PRACTITIONER" | "SPECIALIST" | "DENTIST";
  specialty: string;
  district: string;
  biography: string;
  online: boolean;
  offers: Array<{ label: string; durationMin: number; priceXaf: number; kind: "STANDARD" | "FOLLOW_UP" }>;
  stats: { initiationsTotal: number; confirmedTotal: number; avgDelayS: number; ratingAvg: number; ratingCount: number };
}

const DEMO_PATIENT = {
  phone: "+242069000000",
  username: "patient.demo",
  password: "demo1234",
  firstName: "Mireille",
  lastName: "Nkounkou",
  birthDate: new Date("1994-03-15T00:00:00.000Z"),
  sex: "F",
  district: "Talangaï",
};

/** Titulaire de démo (FACILITY_MEMBER, OWNER) — rattaché à la première pharmacie de DEMO_PHARMACIES. */
const DEMO_PHARMACIST = {
  phone: "+242060000301",
  username: "pharma.demo",
  password: "demo1234",
  firstName: "Bruno",
  lastName: "Ossona",
  pharmacyName: "Pharmacie du Marché",
};

const DEMO_PROS: DemoPro[] = [
  {
    phone: "+242069000101", username: "dr.armel", firstName: "Armel", lastName: "Konaté",
    category: "GENERAL_PRACTITIONER", specialty: "Médecin généraliste", district: "Moungali",
    biography: "Écoute d'abord, prescrit ensuite. Spécialiste du suivi hypertension et diabète.",
    online: true,
    offers: [
      { label: "Consultation", durationMin: 30, priceXaf: 5000, kind: "STANDARD" },
      { label: "Session de suivi", durationMin: 30, priceXaf: 2500, kind: "FOLLOW_UP" },
    ],
    stats: { initiationsTotal: 240, confirmedTotal: 232, avgDelayS: 180, ratingAvg: 4.8, ratingCount: 214 },
  },
  {
    phone: "+242069000102", username: "dr.solange", firstName: "Solange", lastName: "Mbemba",
    category: "SPECIALIST", specialty: "Gynécologue", district: "Centre-ville",
    biography: "Santé féminine en toute discrétion. Répond aussi aux questions intimes par messagerie.",
    online: true,
    offers: [
      { label: "Consultation", durationMin: 30, priceXaf: 12000, kind: "STANDARD" },
      { label: "Session de suivi", durationMin: 30, priceXaf: 6000, kind: "FOLLOW_UP" },
    ],
    stats: { initiationsTotal: 110, confirmedTotal: 104, avgDelayS: 600, ratingAvg: 4.9, ratingCount: 96 },
  },
  {
    phone: "+242069000103", username: "dr.firmin", firstName: "Firmin", lastName: "Okemba",
    category: "DENTIST", specialty: "Dentiste", district: "Pointe-Noire",
    biography: "Urgences dentaires et conseils de prévention. Cabinet à Pointe-Noire centre.",
    online: false,
    offers: [
      { label: "Consultation", durationMin: 20, priceXaf: 7000, kind: "STANDARD" },
      { label: "Session de suivi", durationMin: 20, priceXaf: 3500, kind: "FOLLOW_UP" },
    ],
    stats: { initiationsTotal: 64, confirmedTotal: 58, avgDelayS: 900, ratingAvg: 4.6, ratingCount: 58 },
  },
];

/** Référentiel médicaments de démo (M11). */
const DEMO_MEDS: Array<{ dci: string; commercialNames: string[]; form: string; dosage: string }> = [
  { dci: "Amlodipine", commercialNames: ["Amlor"], form: "comprimé", dosage: "5 mg" },
  { dci: "Ramipril", commercialNames: ["Triatec"], form: "comprimé", dosage: "10 mg" },
  { dci: "Paracétamol", commercialNames: ["Doliprane", "Efferalgan"], form: "comprimé", dosage: "500 mg" },
  { dci: "Amoxicilline", commercialNames: ["Clamoxyl"], form: "gélule", dosage: "500 mg" },
  { dci: "Métronidazole", commercialNames: ["Flagyl"], form: "comprimé", dosage: "250 mg" },
  { dci: "Ibuprofène", commercialNames: ["Advil", "Nurofen"], form: "comprimé", dosage: "400 mg" },
];

/** Pharmacies vérifiées de démo (M02/M11) — stock = liste de DCI couvertes, prix indicatif. */
const DEMO_PHARMACIES: Array<{ phone: string; name: string; district: string; quarter: string; lat: number; lng: number; stock: Array<{ dci: string; priceXaf: number; quantity: number }> }> = [
  {
    phone: "+242060000201", name: "Pharmacie du Marché", district: "Talangaï", quarter: "Poto-Poto", lat: -4.2521, lng: 15.2876,
    stock: [
      { dci: "Amlodipine", priceXaf: 2400, quantity: 120 },
      { dci: "Ramipril", priceXaf: 3100, quantity: 80 },
      { dci: "Paracétamol", priceXaf: 800, quantity: 300 },
      { dci: "Amoxicilline", priceXaf: 2900, quantity: 60 },
    ],
  },
  {
    phone: "+242060000202", name: "Pharmacie de la Paix", district: "Talangaï", quarter: "Mikalou", lat: -4.2489, lng: 15.2731,
    stock: [
      { dci: "Amlodipine", priceXaf: 2600, quantity: 40 },
      { dci: "Paracétamol", priceXaf: 750, quantity: 200 },
      { dci: "Ibuprofène", priceXaf: 1500, quantity: 150 },
    ],
  },
  {
    phone: "+242060000203", name: "Pharmacie Centrale", district: "Moungali", quarter: "Centre-ville", lat: -4.2701, lng: 15.2603,
    stock: [
      { dci: "Ramipril", priceXaf: 3000, quantity: 50 },
      { dci: "Métronidazole", priceXaf: 1800, quantity: 90 },
      { dci: "Amoxicilline", priceXaf: 3050, quantity: 70 },
    ],
  },
];

async function seedDemo(): Promise<void> {
  const { hashPassword } = await import("../src/common/crypto/password");
  const consents = { createMany: { data: [
    { documentType: "CGU", documentVersion: "1.0" },
    { documentType: "PRIVACY", documentVersion: "1.0" },
  ] } };

  // ── Patient de démo (identifiants connus pour les tests) ──
  if (!(await prisma.account.findUnique({ where: { phone: DEMO_PATIENT.phone } }))) {
    await prisma.account.create({
      data: {
        phone: DEMO_PATIENT.phone,
        username: DEMO_PATIENT.username,
        passwordHash: await hashPassword(DEMO_PATIENT.password),
        type: "PATIENT",
        patientProfile: { create: {
          firstName: DEMO_PATIENT.firstName, lastName: DEMO_PATIENT.lastName,
          birthDate: DEMO_PATIENT.birthDate, sex: DEMO_PATIENT.sex, district: DEMO_PATIENT.district,
        } },
        consents,
      },
    });
  }

  // ── Soignants vérifiés sous contrat signé ──
  const now = new Date();
  for (const pro of DEMO_PROS) {
    let account = await prisma.account.findUnique({ where: { phone: pro.phone } });
    if (!account) {
      account = await prisma.account.create({
        data: {
          phone: pro.phone,
          username: pro.username,
          passwordHash: await hashPassword("demo1234"),
          type: "PROFESSIONAL",
          professionalProfile: { create: {
            firstName: pro.firstName, lastName: pro.lastName, category: pro.category,
            specialty: pro.specialty, district: pro.district, biography: pro.biography,
          } },
          consents,
        },
      });
    }
    const professionalId = account.id;

    // VerificationCase VERIFIED + contrat avec UNE version signée (RM-05-01 / D-029).
    const existingCase = await prisma.verificationCase.findUnique({ where: { professionalId } });
    if (!existingCase) {
      await prisma.verificationCase.create({
        data: {
          professionalId,
          status: "VERIFIED",
          agreement: { create: { versions: { create: {
            version: 1, commissionPct: 10, bodyHash: "seed-demo",
            signedAt: now, signedBy: professionalId, effectiveAt: now,
          } } } },
        },
      });
    } else if (existingCase.status !== "VERIFIED") {
      await prisma.verificationCase.update({ where: { id: existingCase.id }, data: { status: "VERIFIED" } });
    }

    // Offres (créées une seule fois).
    if ((await prisma.careOffer.count({ where: { professionalId } })) === 0) {
      await prisma.careOffer.createMany({ data: pro.offers.map((o) => ({ professionalId, ...o, active: true })) });
    }

    // Présence — DEV/DÉMO : pour un pro « en ligne » on pose un battement dans le FUTUR. La règle
    // PM-26 traite un âge négatif (horloge désynchronisée) comme « frais » → le pro reste disponible
    // en permanence sans app pro qui pinge, pour que le patient puisse tester le parcours complet.
    // En PROD, c'est le vrai heartbeat du pro (M05) qui pilote la présence — ce seed n'existe qu'en dev.
    const demoHeartbeat = pro.online ? new Date(now.getTime() + 3650 * 24 * 3600 * 1000) : now;
    await prisma.presenceStatus.upsert({
      where: { accountId: professionalId },
      update: { state: pro.online ? "ONLINE" : "OFFLINE", lastHeartbeatAt: demoHeartbeat, since: now },
      create: { accountId: professionalId, state: pro.online ? "ONLINE" : "OFFLINE", lastHeartbeatAt: demoHeartbeat, since: now },
    });

    // Indicateurs publics (note, réactivité) — alimentent l'annuaire (EF-05-01).
    const stats = pro.stats;
    await prisma.professionalStats.upsert({
      where: { professionalId },
      update: {
        initiationsTotal: stats.initiationsTotal, confirmedTotal: stats.confirmedTotal,
        confirmDelaySumS: stats.avgDelayS * stats.confirmedTotal,
        ratingSum: Math.round(stats.ratingAvg * stats.ratingCount), ratingCount: stats.ratingCount,
      },
      create: {
        professionalId,
        initiationsTotal: stats.initiationsTotal, confirmedTotal: stats.confirmedTotal,
        confirmDelaySumS: stats.avgDelayS * stats.confirmedTotal,
        ratingSum: Math.round(stats.ratingAvg * stats.ratingCount), ratingCount: stats.ratingCount,
      },
    });
  }

  // ── Référentiel médicaments (M11) — créé une seule fois, mappé par DCI ──
  const medIdByDci = new Map<string, string>();
  for (const med of DEMO_MEDS) {
    let row = await prisma.medicament.findFirst({ where: { dci: med.dci, dosage: med.dosage } });
    if (!row) {
      row = await prisma.medicament.create({ data: { dci: med.dci, commercialNames: med.commercialNames, form: med.form, dosage: med.dosage } });
    }
    medIdByDci.set(med.dci, row.id);
  }

  // ── Pharmacies vérifiées sous contrat signé + stock frais (M02/M11/M12) ──
  const expiry = new Date(now.getTime() + 365 * 24 * 3_600_000); // +1 an
  for (const ph of DEMO_PHARMACIES) {
    let facility = await prisma.facility.findFirst({ where: { name: ph.name, district: ph.district } });
    if (!facility) {
      facility = await prisma.facility.create({
        data: {
          type: "PHARMACY", name: ph.name, district: ph.district, quarter: ph.quarter,
          latitude: ph.lat, longitude: ph.lng, phone: ph.phone, status: "ACTIVE",
        },
      });
    }
    const facilityId = facility.id;

    // Titulaire de démo (identifiants connus) — seulement sur la pharmacie désignée.
    if (ph.name === DEMO_PHARMACIST.pharmacyName) {
      let pharmacist = await prisma.account.findUnique({ where: { phone: DEMO_PHARMACIST.phone } });
      if (!pharmacist) {
        pharmacist = await prisma.account.create({
          data: {
            phone: DEMO_PHARMACIST.phone,
            username: DEMO_PHARMACIST.username,
            passwordHash: await hashPassword(DEMO_PHARMACIST.password),
            type: "FACILITY_MEMBER",
            facilityMemberProfile: { create: { firstName: DEMO_PHARMACIST.firstName, lastName: DEMO_PHARMACIST.lastName } },
            consents,
          },
        });
      }
      await prisma.facilityMember.upsert({
        where: { facilityId_accountId: { facilityId, accountId: pharmacist.id } },
        update: {},
        create: { facilityId, accountId: pharmacist.id, role: "OWNER", rights: ["stock", "dispense", "stats"] },
      });
    }

    // VerificationCase VERIFIED + contrat signé (RM-05-01 / D-029 — sinon non publiable).
    const existingCase = await prisma.verificationCase.findUnique({ where: { facilityId } });
    if (!existingCase) {
      await prisma.verificationCase.create({
        data: {
          facilityId, status: "VERIFIED",
          agreement: { create: { versions: { create: {
            version: 1, commissionPct: 10, bodyHash: "seed-demo-pharma", signedAt: now, signedBy: "seed", effectiveAt: now,
          } } } },
        },
      });
    } else if (existingCase.status !== "VERIFIED") {
      await prisma.verificationCase.update({ where: { id: existingCase.id }, data: { status: "VERIFIED" } });
    }

    // Fraîcheur du stock rafraîchie à chaque exécution (PM-33 — garde la pharmacie publiable).
    await prisma.facilityStockState.upsert({
      where: { facilityId },
      update: { lastFreshAt: now },
      create: { facilityId, lastFreshAt: now },
    });

    // Lots de stock (créés une seule fois par médicament).
    for (const s of ph.stock) {
      const medicamentId = medIdByDci.get(s.dci);
      if (!medicamentId) continue;
      const lotCode = "LOT-DEMO";
      const exists = await prisma.stockItem.findUnique({ where: { facilityId_medicamentId_lotCode: { facilityId, medicamentId, lotCode } } });
      if (!exists) {
        await prisma.stockItem.create({ data: { facilityId, medicamentId, lotCode, quantity: s.quantity, expiryDate: expiry, priceXaf: s.priceXaf } });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Démo OK — patient « ${DEMO_PATIENT.username} » (mdp ${DEMO_PATIENT.password}) + ${DEMO_PROS.length} soignants + titulaire « ${DEMO_PHARMACIST.username} » (mdp ${DEMO_PHARMACIST.password}) + ${DEMO_MEDS.length} médicaments + ${DEMO_PHARMACIES.length} pharmacies.`);
}

async function main(): Promise<void> {
  for (const p of PLATFORM_PARAMETERS) {
    await prisma.platformParameter.upsert({
      where: { key: p.key },
      update: { value: p.value, description: p.description },
      create: p,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seed OK — ${PLATFORM_PARAMETERS.length} paramètres PM upsertés.`);

  // Bootstrap SUPER_ADMIN (EF-02-08) : créé une seule fois s'il n'existe aucun admin.
  // Il devra activer son TOTP avant toute action admin (RM-01-06, AdminGuard).
  const adminCount = await prisma.account.count({ where: { type: "ADMIN" } });
  if (adminCount === 0) {
    const phone = process.env.SEED_ADMIN_PHONE ?? "+242060000001";
    const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
    const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!"; // DEV uniquement — à changer immédiatement
    const { hashPassword } = await import("../src/common/crypto/password");
    await prisma.account.create({
      data: {
        phone,
        username,
        passwordHash: await hashPassword(password),
        type: "ADMIN",
        facilityMemberProfile: { create: { firstName: "Super", lastName: "Admin" } },
        adminRole: { create: { role: "SUPER_ADMIN", assignedBy: "seed" } },
        /* ⚠️ PLUS de secret TOTP créé ici, et ce n'est pas un allègement de sécurité — c'est la
           correction d'un défaut constaté en production le 20/08/2026.

           Le seed scellait le secret avec la clé `SECRETBOX_KEY` de la machine qui l'exécute. Or ce
           seed tourne en local, tandis que l'API qui devra relire ce secret tourne sur Render, avec
           sa propre clé. Le secret était donc illisible dès sa création : toute connexion admin
           répondait 500, et le compte était définitivement inaccessible — `disableTotp` refusant par
           ailleurs de dépanner un ADMIN (RM-01-06).

           La règle qui en découle : un secret ne doit jamais être scellé par un autre environnement
           que celui qui le relira. Le compte active donc son TOTP lui-même, depuis l'application,
           où le secret est scellé par le serveur qui l'utilisera. */
        consents: {
          createMany: {
            data: [
              { documentType: "CGU", documentVersion: "1.0" },
              { documentType: "PRIVACY", documentVersion: "1.0" },
            ],
          },
        },
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Bootstrap SUPER_ADMIN créé (${username} / ${phone}, mdp ${password}) — SANS TOTP : à activer depuis l'application.`);
  }

  // Données de démo (dev) — désactivables avec SEED_DEMO=false.
  if (process.env.SEED_DEMO !== "false") {
    await seedDemo();
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
