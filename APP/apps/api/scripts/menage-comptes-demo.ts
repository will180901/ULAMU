/**
 * Ménage des comptes de démonstration — DESTRUCTEUR.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * Pendant la reconstruction du web, l'annuaire contenait quatre professionnels de démonstration
 * plus un DOUBLON d'Armel Konaté (créé à la main pendant des tests, vérifié et sous contrat, donc
 * visible des patients). Le porteur teste en direct depuis son téléphone : ce bruit rend la
 * vérification confuse — on ne sait plus quel « Armel Konaté » on regarde.
 *
 * Décision du porteur, 28/08/2026 : ne garder que `patient.demo` et le VRAI `dr.armel`.
 *
 * ── Ce que ce script NE touche PAS, et pourquoi ────────────────────────────────────────────────
 *
 * • **Le journal d'audit (M04).** Ses lignes sont chaînées par hachage : en retirer une casse la
 *   chaîne de façon irréparable et rend l'intégrité invérifiable à jamais (EF-04-02). Les entrées
 *   des comptes supprimés restent donc, avec leurs identifiants devenus orphelins. C'est voulu :
 *   un journal d'audit qui oublie n'est plus un journal d'audit.
 *
 * • **Les comptes ADMIN.** Les écrans E1 à E7 restent à construire ; sans administrateur, ils
 *   deviennent intestables et le porteur perd l'accès à sa propre plateforme.
 *
 * • **Les paramètres métier PM-xx.** Ils ne dépendent d'aucun compte.
 *
 * ── Emploi ─────────────────────────────────────────────────────────────────────────────────────
 *
 *   npx ts-node scripts/menage-comptes-demo.ts            → INVENTAIRE seul, ne supprime rien
 *   npx ts-node scripts/menage-comptes-demo.ts --appliquer → supprime pour de bon
 *
 * ⚠️ La base Neon est UNIQUE : elle sert le développement ET le site en ligne. Ce script agit donc
 * sur la production. L'inventaire est imprimé avant toute écriture, et rien n'est supprimé sans
 * `--appliquer`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Les deux comptes à préserver, par nom d'utilisateur. Tout le reste des démos s'en va. */
const A_GARDER = ["patient.demo"];

/** Le vrai Armel : celui de Moungali, 214 avis, deux offres. Le doublon n'a ni district ni avis. */
const ARMEL_A_GARDER = "8e3b1ec6-2b67-4fb8-8b89-719ac53b5c4d";

async function main(): Promise<void> {
  const appliquer = process.argv.includes("--appliquer");

  const comptes = await prisma.account.findMany({
    select: {
      id: true,
      username: true,
      phone: true,
      type: true,
      status: true,
      adminRole: { select: { role: true } },
      professionalProfile: { select: { firstName: true, lastName: true, district: true } },
      patientProfile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const garder: typeof comptes = [];
  const supprimer: typeof comptes = [];

  for (const c of comptes) {
    const estAdmin = c.type === "ADMIN" || c.adminRole !== null;
    const estGarde = A_GARDER.includes(c.username ?? "") || c.id === ARMEL_A_GARDER;
    if (estAdmin || estGarde) garder.push(c);
    else supprimer.push(c);
  }

  const decrire = (c: (typeof comptes)[number]): string => {
    const p = c.professionalProfile ?? c.patientProfile;
    const nom = p ? `${p.firstName} ${p.lastName}` : "—";
    const lieu = c.professionalProfile?.district ? ` · ${c.professionalProfile.district}` : "";
    const role = c.adminRole ? ` [${c.adminRole.role}]` : "";
    return `${(c.username ?? c.phone).padEnd(18)} ${c.type.padEnd(16)} ${nom}${lieu}${role}`;
  };

  console.log("\n══ CONSERVÉS ══");
  for (const c of garder) console.log("  ✓ " + decrire(c));

  console.log("\n══ À SUPPRIMER ══");
  for (const c of supprimer) console.log("  ✗ " + decrire(c));

  // Ce que la suppression emporte avec elle — compté AVANT, pour que le porteur le voie.
  const ids = supprimer.map((c) => c.id);
  const [offres, dossiers, sessionsPro, sessionsPatient, poignees, notes, structures] = await Promise.all([
    prisma.careOffer.count({ where: { professionalId: { in: ids } } }),
    prisma.verificationCase.count({ where: { professionalId: { in: ids } } }),
    prisma.careSession.count({ where: { professionalId: { in: ids } } }),
    prisma.careSession.count({ where: { patientAccountId: { in: ids } } }),
    prisma.handshake.count({ where: { OR: [{ professionalId: { in: ids } }, { patientAccountId: { in: ids } }] } }),
    prisma.sessionRating.count({ where: { session: { professionalId: { in: ids } } } }),
    prisma.facilityMember.count({ where: { accountId: { in: ids } } }),
  ]);

  console.log("\n══ EMPORTÉ PAR LA CASCADE ══");
  console.log(`  offres de consultation .......... ${offres}`);
  console.log(`  dossiers de vérification ........ ${dossiers}  (avec leurs contrats signés)`);
  console.log(`  consultations (côté soignant) ... ${sessionsPro}`);
  console.log(`  consultations (côté patient) .... ${sessionsPatient}`);
  console.log(`  poignées de main ................ ${poignees}`);
  console.log(`  notes laissées .................. ${notes}`);
  console.log(`  rattachements à une structure ... ${structures}`);
  console.log("\n  Le journal d'audit n'est PAS touché : sa chaîne de hachage ne survivrait pas.");

  if (!appliquer) {
    console.log("\n▶ INVENTAIRE SEUL — rien n'a été supprimé.");
    console.log("  Pour supprimer : npx ts-node scripts/menage-comptes-demo.ts --appliquer\n");
    return;
  }

  console.log("\n▶ SUPPRESSION EN COURS…\n");
  // Ordre : les enfants d'abord, la base Prisma ne cascade pas partout.
  // ── L'ordre de suppression ────────────────────────────────────────────────────────────────────
  //
  // Il n'est pas devinable : TOUTES les clés étrangères de ce schéma sont en RESTRICT, aucune ne
  // cascade. Il faut donc descendre jusqu'aux feuilles et remonter. L'ordre ci-dessous a été établi
  // en interrogeant `information_schema` de PostgreSQL, pas à tâtons.
  //
  // ⚠️ Délai porté à 2 minutes : la limite Prisma par défaut est de 5 s, et la base Neon est à
  // Francfort — une vingtaine de suppressions à la suite la dépassent largement. La première
  // tentative a expiré à 5,2 s et tout a été annulé : bon comportement, mauvais réglage.
  await prisma.$transaction(async (tx) => {
    const sessionsDuLot = { session: { OR: [{ professionalId: { in: ids } }, { patientAccountId: { in: ids } }] } };

    // 1. Les feuilles d'une consultation. (Réactions et masquages tombent en cascade avec le message.)
    await tx.sessionRating.deleteMany({ where: sessionsDuLot });
    await tx.sessionRecordAccess.deleteMany({ where: sessionsDuLot });
    await tx.sessionMessage.deleteMany({ where: sessionsDuLot });
    await tx.preConsultation.deleteMany({ where: sessionsDuLot });

    // 2. La consultation, puis la poignée de main dont elle dépend.
    await tx.careSession.deleteMany({ where: { OR: [{ professionalId: { in: ids } }, { patientAccountId: { in: ids } }] } });
    await tx.handshake.deleteMany({ where: { OR: [{ professionalId: { in: ids } }, { patientAccountId: { in: ids } }] } });

    // 3. Le dossier de vérification, de ses feuilles vers lui : versions → contrat → pièces → décisions.
    const dossiers = await tx.verificationCase.findMany({
      where: { professionalId: { in: ids } },
      select: { id: true, agreement: { select: { caseId: true } } },
    });
    const idsDossiers = dossiers.map((d) => d.id);
    await tx.agreementVersion.deleteMany({ where: { agreement: { caseId: { in: idsDossiers } } } });
    await tx.digitalAgreement.deleteMany({ where: { caseId: { in: idsDossiers } } });
    await tx.supportingDocument.deleteMany({ where: { caseId: { in: idsDossiers } } });
    await tx.verificationDecision.deleteMany({ where: { caseId: { in: idsDossiers } } });
    await tx.verificationCase.deleteMany({ where: { id: { in: idsDossiers } } });

    // 4. Ce qui pend au compte sans le bloquer, mais qui n'a plus de sens sans lui.
    await tx.careOffer.deleteMany({ where: { professionalId: { in: ids } } });
    await tx.presenceStatus.deleteMany({ where: { accountId: { in: ids } } });
    await tx.professionalStats.deleteMany({ where: { professionalId: { in: ids } } });
    await tx.availabilityAlert.deleteMany({ where: { OR: [{ patientId: { in: ids } }, { professionalId: { in: ids } }] } });
    await tx.notification.deleteMany({ where: { accountId: { in: ids } } });
    await tx.notificationPreference.deleteMany({ where: { accountId: { in: ids } } });

    // 5. Les huit tables que PostgreSQL exige de vider avant de toucher au compte.
    await tx.adminRoleAssignment.deleteMany({ where: { accountId: { in: ids } } });
    await tx.consentRecord.deleteMany({ where: { accountId: { in: ids } } });
    await tx.facilityMember.deleteMany({ where: { accountId: { in: ids } } });
    await tx.facilityMemberProfile.deleteMany({ where: { accountId: { in: ids } } });
    await tx.loginSession.deleteMany({ where: { accountId: { in: ids } } });
    await tx.patientProfile.deleteMany({ where: { accountId: { in: ids } } });
    await tx.professionalProfile.deleteMany({ where: { accountId: { in: ids } } });
    await tx.totpSecret.deleteMany({ where: { accountId: { in: ids } } });

    // 6. Le compte lui-même.
    await tx.account.deleteMany({ where: { id: { in: ids } } });
  }, { timeout: 120_000, maxWait: 30_000 });

  const restants = await prisma.account.count();
  console.log(`✔ Terminé. ${ids.length} compte(s) supprimé(s). Il reste ${restants} compte(s).\n`);
}

main()
  .catch((e) => {
    console.error("\n✗ ÉCHEC — rien n'a été supprimé (transaction annulée) :\n", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
