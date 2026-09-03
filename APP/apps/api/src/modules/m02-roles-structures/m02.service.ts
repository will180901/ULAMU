/**
 * M02 — Rôles & Espaces Structures.
 * Spec : docs/cahier_des_charges/02_modules/M02_roles_espaces_structures.md
 * Invariants : un seul titulaire actif par structure (RM-02-01) ; toute action tracée
 * au nom du membre ET de la structure (RM-02-02, C5) ; un compte = une structure (RM-02-05) ;
 * pas de cumul de casquettes au MVP (RM-02-06, Q-008).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminRole } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { OutboxService, type TxClient } from "../../common/outbox.service";
import { isAcceptableUsername, normalizeUsername } from "../m01-accounts/m01.policies";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { SMS_GATEWAY, SmsGateway } from "../../common/sms/sms.service";
import { normalizePhone } from "../m01-accounts/m01.policies";
import { M01Service } from "../m01-accounts/m01.service";

@Injectable()
export class M02Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    private readonly m01: M01Service,
    @Inject(SMS_GATEWAY) private readonly sms: SmsGateway,
  ) {}

  /*
    ── La moitié « structures » de M02 est RETIRÉE le 03/09/2026 (dette n°17) ───────────────────

    Neuf méthodes vivaient ici : créer une structure, inviter un membre, accepter une invitation,
    lire sa structure, changer les droits d'un membre, le suspendre, ouvrir et confirmer un
    transfert de titularité. ~435 lignes, et **plus aucun compte ne pouvait les appeler** : elles
    exigent le type `FACILITY_MEMBER`, fermé à la création depuis D-051 (02/09/2026).

    ── Ce qui a autorisé le retrait, et qui n'était pas une déduction ────────────────────────────

    « Plus aucun compte ne peut être créé » ne dit rien de ceux qui EXISTENT : fermer la porte
    d'entrée n'expulse personne. Un compte antérieur au 02/09 se connecterait encore — la connexion
    ne regarde pas le type — et atteindrait ces routes.

    L'inventaire de la base de production, en lecture seule (`scripts/inventaire-structures.ts`),
    a répondu le 03/09 : **zéro compte `FACILITY_MEMBER`**, zéro adhésion, zéro invitation, zéro
    transfert en cours. Le code était donc bien inatteignable, pas seulement « censé » l'être.

    ── Ce que l'inventaire a AUSSI trouvé, et qui reste ──────────────────────────────────────────

    Trois structures, trois dossiers de vérification qui en désignent une, et un
    `FacilityMemberProfile` — **celui-ci porte le nom du super-administrateur** (les comptes
    d'administration y écrivent leur identité, voir le chantier 33). Les TABLES et les TYPES
    restent donc : ils décrivent des données réelles. C'est le code mort qui part, pas la mémoire.

    Voir la dette n°15 (les tables) et la n°13 (l'énumération Prisma) au §9 du plan.
  */
  // ── Sous-rôles admin (EF-02-08) — SUPER_ADMIN uniquement (garde au contrôleur) ──

  /**
   * Tous les comptes d'administration, avec leur sous-rôle courant.
   *
   * ⚠️ Cette route manquait. On pouvait CRÉER un administrateur et lui attribuer ou révoquer un
   * sous-rôle **par identifiant de compte**, mais rien ne permettait de savoir QUI sont les
   * administrateurs. Un Super Admin ne pouvait donc ni vérifier qu'une révocation avait pris effet,
   * ni retrouver l'identifiant sur lequel agir — sans ouvrir la base. Attribuer un sous-rôle exigeait
   * en pratique de modifier le seed et de rejouer la base entière.
   *
   * Les comptes ADMIN **sans** attribution sont inclus volontairement : ce sont précisément ceux qui
   * attendent un rôle, et les masquer les rendrait introuvables.
   */
  async listAdmins(): Promise<
    Array<{
      accountId: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string;
      role: string | null;
      assignedBy: string | null;
      assignedAt: string | null;
      /**
       * Le compte a-t-il un second facteur ACTIF — application d'authentification, ou code par email ?
       *
       * Ajouté le 02/09/2026 (chantier 32), **en contrepartie de D-053**. Depuis que le TOTP est
       * optionnel pour tous, la console d'administration n'est plus protégée que par un mot de passe
       * pour qui ne l'active pas. On ne remet pas l'obligation — **on rend l'état visible**.
       *
       * Sans cette information, elle existait en base (`totpSecret`, `emailTwoFactorEnabled`) et
       * personne ne pouvait la lire : chacun connaissait son propre réglage, nul ne connaissait celui
       * des autres. Un super-administrateur ne pouvait donc pas savoir si son équipe était protégée.
       */
      secondFacteur: { totp: boolean; email: boolean };
    }>
  > {
    const comptes = await this.prisma.account.findMany({
      where: { type: "ADMIN" },
      select: {
        id: true,
        username: true,
        phone: true,
        emailTwoFactorEnabled: true,
        /*
          ── Les TROIS profils, et pas seulement celui du patient (corrigé le 02/09/2026) ─────────

          Cette lecture ne regardait que `patientProfile`. Or **les deux seuls chemins qui créent un
          administrateur écrivent son nom dans `facilityMemberProfile`** : le bootstrap du seed
          (`prisma/seed.ts`) et la route `createAdmin` de ce même fichier, vingt lignes plus bas.

          Conséquence : E4 affichait « admin » — le repli sur le nom d'utilisateur — au lieu de
          « Super Admin », pour TOUS les comptes d'administration. Rien ne plantait, et c'est
          précisément ce qui l'a fait durer : un nom de repli ressemble à un nom.

          On aurait pu se contenter d'échanger un tiroir contre l'autre. On reprend plutôt l'ordre
          exact de `M01Service.me()` — patient, puis professionnel, puis structure — parce qu'un
          compte hérité peut porter son nom ailleurs, et qu'avoir DEUX règles pour résoudre un même
          nom est la dette qui a produit ce défaut.
        */
        patientProfile: { select: { firstName: true, lastName: true } },
        professionalProfile: { select: { firstName: true, lastName: true } },
        facilityMemberProfile: { select: { firstName: true, lastName: true } },
        /* `totpSecret` porte un drapeau `enabled` : une configuration ENTAMÉE mais jamais confirmée
           laisse une ligne avec `enabled: false`. Compter la ligne plutôt que le drapeau annoncerait
           protégé un compte qui a scanné le QR sans jamais valider. */
        totpSecret: { select: { enabled: true } },
      },
      orderBy: { username: "asc" },
    });
    if (comptes.length === 0) return [];

    const attributions = await this.prisma.adminRoleAssignment.findMany({
      where: { accountId: { in: comptes.map((c) => c.id) } },
    });
    const parCompte = new Map(attributions.map((a) => [a.accountId, a]));

    return comptes.map((c) => {
      const a = parCompte.get(c.id);
      return {
        accountId: c.id,
        username: c.username,
        /* Même ordre que `M01Service.me()` — une seule règle pour résoudre un nom, à deux endroits. */
        firstName: c.patientProfile?.firstName ?? c.professionalProfile?.firstName ?? c.facilityMemberProfile?.firstName ?? null,
        lastName: c.patientProfile?.lastName ?? c.professionalProfile?.lastName ?? c.facilityMemberProfile?.lastName ?? null,
        phone: c.phone,
        role: a?.role ?? null,
        assignedBy: a?.assignedBy ?? null,
        assignedAt: a?.assignedAt.toISOString() ?? null,
        secondFacteur: { totp: c.totpSecret?.enabled === true, email: c.emailTwoFactorEnabled },
      };
    });
  }

  async createAdmin(
    actorId: string,
    dto: { phone: string; username: string; password: string; firstName: string; lastName: string; role: "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP" },
  ): Promise<{ accountId: string }> {
    const phone = this.normalizeOrThrow(dto.phone);
    const existing = await this.prisma.account.findUnique({ where: { phone } });
    if (existing) throw new ConflictException("Ce numéro est déjà enregistré (RM-01-01)");
    const username = normalizeUsername(dto.username);
    if (!isAcceptableUsername(username)) throw new BadRequestException("Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)");
    const usernameTaken = await this.prisma.account.findUnique({ where: { username }, select: { id: true } });
    if (usernameTaken) throw new ConflictException("Ce nom d'utilisateur est déjà pris");
    const { hashPassword } = await import("../../common/crypto/password");
    const passwordHash = await hashPassword(dto.password);
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          phone,
          username,
          passwordHash,
          type: "ADMIN",
          facilityMemberProfile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
          adminRole: { create: { role: dto.role, assignedBy: actorId } },
        },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.created",
        resource: `account:${account.id}`,
        context: { role: dto.role },
      });
      return { accountId: account.id };
    });
  }

  async assignAdminRole(
    actorId: string,
    targetAccountId: string,
    role: "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP",
    reason?: string,
  ): Promise<{ accountId: string; role: string }> {
    const target = await this.prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!target || target.type !== "ADMIN") throw new NotFoundException("Compte admin introuvable");
    await this.prisma.$transaction(async (tx) => {
      // Changer de rôle, c'est aussi QUITTER l'ancien : la garde vaut ici autant qu'à la révocation.
      await this.assertLaisseUnTitulaire(tx, targetAccountId, role);
      await tx.adminRoleAssignment.upsert({
        where: { accountId: targetAccountId },
        update: { role, assignedBy: actorId, assignedAt: new Date() },
        create: { accountId: targetAccountId, role, assignedBy: actorId },
      });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.role_assigned",
        resource: `account:${targetAccountId}`,
        context: { role, reason: reason ?? null },
      });
    });
    return { accountId: targetAccountId, role };
  }

  async revokeAdminRole(actorId: string, targetAccountId: string): Promise<void> {
    if (actorId === targetAccountId) {
      throw new ForbiddenException("Un SUPER_ADMIN ne révoque pas son propre rôle (continuité d'administration)");
    }
    const assignment = await this.prisma.adminRoleAssignment.findUnique({ where: { accountId: targetAccountId } });
    if (!assignment) throw new NotFoundException("Aucun sous-rôle attribué à ce compte");
    await this.prisma.$transaction(async (tx) => {
      await this.assertLaisseUnTitulaire(tx, targetAccountId, null);
      await tx.adminRoleAssignment.delete({ where: { accountId: targetAccountId } });
      // Les sessions de l'admin révoqué tombent immédiatement (effet < 1 min).
      await tx.loginSession.updateMany({ where: { accountId: targetAccountId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.emit(tx, {
        actorId,
        actorType: "admin",
        action: "m02.admin.role_revoked",
        resource: `account:${targetAccountId}`,
      });
    });
  }

  // ── Aides internes ─────────────────────────────────────────────────────────

  /** Intitulés d'écran des quatre sous-rôles — un message d'erreur doit parler la langue de E4. */
  private static readonly INTITULE_ROLE: Record<AdminRole, string> = {
    SUPER_ADMIN: "super-administrateur",
    ADMIN_VERIFICATION: "administrateur Vérification",
    ADMIN_FINANCE: "administrateur Finance",
    ADMIN_MAP: "administrateur Couverture territoriale",
  };

  /**
   * Un sous-rôle ne perd jamais son DERNIER titulaire (dette 8ter, soldée le 01/09/2026).
   *
   * ── Ce qui manquait ─────────────────────────────────────────────────────────────────────────
   *
   * Le serveur refusait déjà qu'un SUPER_ADMIN se révoque lui-même, mais rien n'empêchait de
   * retirer le **dernier** administrateur Vérification ou Finance : le domaine se retrouvait sans
   * personne, et seul un SUPER_ADMIN pouvait le réparer. La maquette E4 annonçait ce garde-fou
   * (« une case grisée signale le dernier porteur d'un sous-rôle ») ; la phrase avait été retirée
   * de l'écran faute de mécanisme derrière.
   *
   * ── Et un cas plus grave, trouvé en l'écrivant ──────────────────────────────────────────────
   *
   * La révocation n'était pas le seul chemin. `assignAdminRole` fait un **upsert** : donner un
   * autre rôle au dernier titulaire le fait quitter le sien tout aussi sûrement — et c'est
   * exactement ce que propose le bouton « Changer le rôle » de E4. Pire, un SUPER_ADMIN unique
   * pouvait s'attribuer à LUI-MÊME un rôle moindre : la garde d'auto-révocation ne voyait rien
   * passer, et comme seul un SUPER_ADMIN peut attribuer des rôles, plus personne n'aurait jamais
   * pu en attribuer. L'administration de la plateforme devenait irréparable sans écrire
   * directement en base.
   *
   * La garde couvre donc les deux routes et les quatre rôles.
   *
   * ⚠️ Limite connue : deux révocations simultanées des deux derniers titulaires d'un même rôle
   * pourraient chacune voir un survivant. Le cas demande deux SUPER_ADMIN agissant à la même
   * seconde sur le même rôle ; il n'est pas traité ici, qui coûterait un verrou sérialisable sur
   * une table de quatre lignes.
   *
   * @param nouveauRole le rôle qu'on s'apprête à poser, ou `null` pour une révocation.
   */
  private async assertLaisseUnTitulaire(
    tx: TxClient,
    targetAccountId: string,
    nouveauRole: AdminRole | null,
  ): Promise<void> {
    const actuel = await tx.adminRoleAssignment.findUnique({
      where: { accountId: targetAccountId },
      select: { role: true },
    });
    // Aucun rôle actuel : rien à perdre. Même rôle : on ne quitte rien.
    if (!actuel || actuel.role === nouveauRole) return;

    const autres = await tx.adminRoleAssignment.count({
      where: { role: actuel.role, accountId: { not: targetAccountId } },
    });
    if (autres > 0) return;

    const intitule = M02Service.INTITULE_ROLE[actuel.role];
    const consequence =
      actuel.role === "SUPER_ADMIN"
        ? " Sans lui, plus personne ne pourrait attribuer de rôle : l'administration deviendrait irréparable."
        : "";
    throw new ConflictException(
      `Ce compte est le dernier ${intitule}.${consequence} Nommez d'abord quelqu'un d'autre à ce sous-rôle, puis revenez retirer celui-ci.`,
    );
  }


  private normalizeOrThrow(raw: string): string {
    const phone = normalizePhone(raw); // réutilise la règle M01 (RM-01-01)
    if (!phone) throw new BadRequestException("Numéro de téléphone congolais invalide");
    return phone;
  }
}
