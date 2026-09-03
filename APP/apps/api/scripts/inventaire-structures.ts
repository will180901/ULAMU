/**
 * Inventaire de la moitié « structures » — STRICTEMENT EN LECTURE. Chantier 39, 03/09/2026.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────────────────────────
 *
 * La dette n°17 demande de retirer la gestion des structures de M02 : neuf routes, ~450 lignes,
 * qu'aucun compte n'est censé pouvoir appeler depuis D-051 (le type `FACILITY_MEMBER` est fermé à
 * la création).
 *
 * **« Censé » ne suffit pas.** Fermer la porte d'entrée n'expulse pas ceux qui sont déjà dedans :
 * un compte `FACILITY_MEMBER` créé AVANT le 02/09 peut toujours se connecter — la connexion ne
 * regarde pas le type — et donc appeler `GET /v1/facilities/me`, `PATCH .../members/:id`, ou lire
 * les gains d'une structure. Retirer ce code sans le savoir, ce serait casser un accès réel.
 *
 * La dette n°13 le disait déjà, et dans cet ordre : **inventorier d'abord, décider ensuite.**
 *
 * ── Ce que ce script fait, et ce qu'il ne fait pas ────────────────────────────────────────────
 *
 * Il ne fait que des `count` et des `findMany` en lecture. **Aucune écriture, aucune suppression,
 * aucun `deleteMany`, aucune migration.** Il ne démarre pas NestJS — donc pas de `SchedulerService`
 * ni de `@Cron` qui écrirait en base.
 *
 * ⚠️ Il interroge la base de PRODUCTION, celle du site en ligne : c'est le seul endroit où la
 * réponse existe. C'est précisément pour cela qu'il est en lecture seule.
 *
 *   npx ts-node scripts/inventaire-structures.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function titre(t: string): void {
  console.log(`\n${t}\n${"─".repeat(t.length)}`);
}

async function main(): Promise<void> {
  console.log("INVENTAIRE DE LA MOITIÉ « STRUCTURES » — lecture seule, aucune écriture.");

  // ── 1. Les comptes qui pourraient encore atteindre ces routes ───────────────────────────────
  titre("1. Comptes de type FACILITY_MEMBER");
  const membres = await prisma.account.findMany({
    where: { type: "FACILITY_MEMBER" },
    select: { id: true, username: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`   ${membres.length} compte(s)`);
  for (const m of membres) {
    console.log(`   · ${m.username} — ${m.status} — créé le ${m.createdAt.toISOString().slice(0, 10)}`);
  }

  // ── 2. Les données de structure elles-mêmes ─────────────────────────────────────────────────
  titre("2. Tables de structure");
  const facilities = await prisma.facility.count();
  const membresActifs = await prisma.facilityMember.count({ where: { active: true } });
  const membresTotal = await prisma.facilityMember.count();
  const invitations = await prisma.facilityInvitation.count();
  const transferts = await prisma.ownershipTransferIntent.count();
  const profils = await prisma.facilityMemberProfile.count();
  console.log(`   Facility ................. ${facilities}`);
  console.log(`   FacilityMember (actifs) .. ${membresActifs} sur ${membresTotal}`);
  console.log(`   FacilityInvitation ....... ${invitations}`);
  console.log(`   OwnershipTransferIntent .. ${transferts}`);
  console.log(`   FacilityMemberProfile .... ${profils}   ⚠️ porte AUSSI le nom des administrateurs`);

  // ── 3. Ce que d'autres modules portent encore comme « FACILITY » ────────────────────────────
  titre("3. Références FACILITY hors de M02");
  const gainsStructure = await prisma.earningsAccount.count({ where: { holderType: "FACILITY" } });
  const dossiersStructure = await prisma.verificationCase.count({ where: { facilityId: { not: null } } });
  const signalementsStructure = await prisma.userReport.count({ where: { targetType: "FACILITY" } });
  console.log(`   EarningsAccount holderType=FACILITY ... ${gainsStructure}   (M13)`);
  console.log(`   VerificationCase avec facilityId ...... ${dossiersStructure}   (M03)`);
  console.log(`   UserReport targetType=FACILITY ........ ${signalementsStructure}   (M04)`);

  // ── 4. La conclusion, écrite plutôt que déduite à l'œil ─────────────────────────────────────
  titre("4. Conclusion");
  const vivants = membres.filter((m) => m.status === "ACTIVE").length;
  const total = facilities + membresTotal + invitations + transferts + gainsStructure + dossiersStructure + signalementsStructure;

  if (vivants === 0 && total === 0) {
    console.log("   ✅ AUCUNE donnée de structure, AUCUN compte actif de ce type.");
    console.log("   Les neuf routes de M02 sont inatteignables ET sans données : retrait sûr.");
  } else if (vivants === 0) {
    console.log(`   ⚠️ Aucun compte FACILITY_MEMBER actif, mais ${total} ligne(s) de données subsistent.`);
    console.log("   Les ROUTES peuvent partir (personne ne peut les appeler).");
    console.log("   Les TABLES et les types doivent rester : ils décrivent des données existantes.");
  } else {
    console.log(`   🔴 ${vivants} compte(s) FACILITY_MEMBER ACTIF(S).`);
    console.log("   Ces comptes peuvent encore se connecter et appeler ces routes.");
    console.log("   NE PAS retirer les routes sans avoir d'abord suspendu ou requalifié ces comptes.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
