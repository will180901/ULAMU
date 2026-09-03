/**
 * M01 — Comptes & Authentification.
 * Spec : docs/cahier_des_charges/02_modules/M01_comptes_authentification.md
 * Invariants : téléphone = identifiant racine unique (RM-01-01) ; mots de passe hachés (RM-01-02) ;
 * OTP par passerelle directe (RM-01-03) ; événements sensibles audités (RM-01-04).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { OtpPurpose, Prisma } from "@prisma/client";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { AuditEmitter } from "../../common/audit.emitter";
import { hashSessionToken } from "../../common/auth/auth.guard";
import { hashPassword, verifyPassword } from "../../common/crypto/password";
import { openSecret, sealSecret } from "../../common/crypto/secretbox";
import { generateTotpSecret, provisioningUri, verifyTotp } from "../../common/crypto/totp";
import { EMAIL_GATEWAY, EmailGateway, avisSecuriteTemplate, otpEmailTemplate } from "../../common/email/email.service";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import { SMS_GATEWAY, SmsGateway } from "../../common/sms/sms.service";
import { StorageService } from "../../common/storage.service";
import {
  canSendOtp,
  doitTracerConnexionSansSecondFacteur,
  isAcceptablePassword,
  isAcceptableUsername,
  isAdult,
  isValidEmail,
  lockoutUntil,
  normalizeEmail,
  normalizePhone,
  normalizeUsername,
} from "./m01.policies";

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

const OTP_MAX_VERIFY_ATTEMPTS = 3;

/** « bou***@gmail.com » — assez pour reconnaître sa propre adresse, pas assez pour la lire par-dessus l'épaule. */
function masquerEmail(email: string): string {
  const [nom, domaine] = email.split("@");
  return `${nom.slice(0, 3)}${"*".repeat(Math.max(1, nom.length - 3))}@${domaine}`;
}

/** « +242 06 ** ** 4 21 » — mêmes raisons, on ne montre que la fin. */
function masquerTelephone(phone: string): string {
  return `${"*".repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}`;
}

/** Cible d'un OTP : SOIT un téléphone (SMS — changement de numéro, action sensible), SOIT un email
 * (inscription, réinitialisation mot de passe — 2026-07). Jamais les deux à la fois. */
type OtpTarget = { phone: string } | { email: string };

@Injectable()
export class M01Service {
  private readonly logger = new Logger("M01");

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    @Inject(SMS_GATEWAY) private readonly sms: SmsGateway,
    @Inject(EMAIL_GATEWAY) private readonly email: EmailGateway,
    private readonly storage: StorageService,
  ) {}

  // ── OTP (EF-01-01/04/07 ; PM-17/19) ────────────────────────────────────────

  async requestOtp(rawTarget: { phone?: string; email?: string }, purpose: OtpPurpose): Promise<{ expiresInSeconds: number; debugCode?: string }> {
    const target: OtpTarget = rawTarget.email
      ? { email: this.normalizeEmailOrThrow(rawTarget.email) }
      : { phone: this.normalizeOrThrow(rawTarget.phone ?? "") };
    // Quota PM-19 compté PAR USAGE et non plus globalement par cible : sinon trois inscriptions ratées
    // empêchaient de réinitialiser son mot de passe dans l'heure, et surtout la 2FA à la connexion
    // (LOGIN_2FA) aurait plafonné l'utilisateur à 3 connexions/heure. LOGIN_2FA a de plus un quota plus
    // large : c'est un geste quotidien normal, pas une opération exceptionnelle comme une inscription.
    const maxPerHour = await this.params.getInt("PM-19");
    const quota = purpose === "LOGIN_2FA" ? maxPerHour * 4 : maxPerHour;
    const recent = await this.prisma.otpCode.findMany({
      where: { ...target, purpose, createdAt: { gte: new Date(Date.now() - 3600_000) } },
      select: { createdAt: true },
    });
    if (!canSendOtp(recent.map((r) => r.createdAt.getTime()), quota, Date.now())) {
      throw new ForbiddenException("Trop de demandes de code — réessayez plus tard (PM-19)");
    }
    const ttl = await this.params.getInt("PM-17");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const created = await this.prisma.otpCode.create({
      data: { ...target, purpose, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + ttl * 1000) },
    });
    const minutes = Math.round(ttl / 60);
    try {
      if ("email" in target) {
        // Jamais de lien cliquable dans l'email ULAMU (même règle que le SMS — menace T-13).
        await this.email.send(target.email, "Votre code de vérification ULAMU", otpEmailTemplate(code, minutes));
      } else {
        await this.sms.send(target.phone, `ULAMU : votre code est ${code}. Valable ${minutes} min. Ne le partagez jamais.`);
      }
    } catch (err) {
      // L'envoi a échoué (adresse refusée par le fournisseur, panne réseau…). Le code venait d'être
      // enregistré : le laisser consommerait le quota PM-19 alors que l'utilisateur n'a RIEN reçu —
      // trois essais et il serait bloqué une heure pour rien. On le retire, puis on renvoie une erreur
      // explicite plutôt que le 500 brut qui remontait jusqu'ici.
      await this.prisma.otpCode.delete({ where: { id: created.id } }).catch(() => undefined);
      this.logger.error(`Envoi du code impossible (${"email" in target ? target.email : target.phone}) : ${String(err)}`);
      throw new ServiceUnavailableException("Impossible d'envoyer le code de vérification à cette adresse — vérifiez-la ou réessayez plus tard");
    }
    // MODE TEST (OTP_ECHO=true) : pas de vrai envoi en pilote → on renvoie le code à l'app pour qu'elle l'affiche.
    // Le `NODE_ENV !== "production"` n'est PAS redondant avec la variable : c'est un garde-fou dur. La
    // demande de code est une route publique et la réinitialisation ne réclame que ce code — une seule
    // variable restée à "true" en production suffisait donc à livrer le mot de passe de n'importe quel
    // compte à qui connaît son adresse email. La configuration ne peut plus rouvrir ce trou à elle seule.
    const echo = process.env.OTP_ECHO === "true" && process.env.NODE_ENV !== "production";
    return { expiresInSeconds: ttl, ...(echo ? { debugCode: code } : {}) };
  }

  private async consumeOtpOrThrow(tx: Prisma.TransactionClient, target: OtpTarget, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await tx.otpCode.findFirst({
      where: { ...target, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new UnauthorizedException("Aucun code en attente — redemandez un code");
    if (otp.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("Code expiré (PM-17) — redemandez un code");
    if (otp.attempts >= OTP_MAX_VERIFY_ATTEMPTS) throw new UnauthorizedException("Trop d'essais — redemandez un code");
    if (otp.codeHash !== hashOtp(code)) {
      // D-048 (correctif transversal) : l'incrément doit SURVIVRE au rollback de la transaction
      // appelante (sinon le compteur anti-brute-force est inopérant — failles M07.claim/M03.sign/
      // M13.withdrawal). On écrit via le client RACINE (this.prisma), hors de `tx` : la mise à
      // jour est committée immédiatement et indépendamment, puis on jette.
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Code incorrect");
    }
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  }

  // ── Inscriptions (EF-01-01/02/08 ; CU-01-01/02) ────────────────────────────

  /**
   * Refuse une inscription sans acceptation explicite des CGU et de la politique de confidentialité
   * (EF-01-08, loi n° 29-2019).
   *
   * ⚠️ Jusqu'au 2026-08-05, les enregistrements de `Consentement` étaient créés
   * **inconditionnellement** par les trois inscriptions, sans qu'aucun champ n'indique que
   * l'utilisateur avait accepté quoi que ce soit — et l'app web ne le lui demandait même jamais. Le
   * modèle de données qualifie pourtant cette entité de « preuve légale, immuable ». Une preuve
   * fabriquée automatiquement, identique que la case ait été cochée ou non, ne prouve rien.
   *
   * La validation HTTP (`@Equals(true)` sur les DTO) couvre déjà l'entrée par l'API. Ce garde-fou
   * couvre les appels DIRECTS au service — tests, seed, futurs scripts d'import : le jour où l'un
   * d'eux oubliera le champ, il échouera bruyamment au lieu de fabriquer un faux consentement.
   */
  private ensureTermsAccepted(accepted: boolean): void {
    if (accepted !== true) {
      throw new BadRequestException(
        "Vous devez accepter les conditions générales et la politique de confidentialité pour créer un compte.",
      );
    }
  }

  async registerPatient(dto: {
    phone: string;
    email: string;
    username: string;
    otpCode: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    sex: "M" | "F";
    district: string;
    acceptTerms: boolean;
    client: string;
    deviceLabel?: string;
  }): Promise<{ accountId: string; sessionToken: string }> {
    this.ensureTermsAccepted(dto.acceptTerms);
    const phone = this.normalizeOrThrow(dto.phone);
    await this.ensurePhoneFree(phone);
    const email = this.normalizeEmailOrThrow(dto.email);
    await this.ensureEmailFree(email);
    const username = normalizeUsername(dto.username);
    if (!isAcceptableUsername(username)) throw new BadRequestException("Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)");
    await this.ensureUsernameFree(username);
    this.ensurePasswordOk(dto.password);
    const minYears = await this.params.getInt("PM-16");
    const birth = new Date(dto.birthDate);
    if (Number.isNaN(birth.getTime()) || !isAdult(birth, minYears, new Date())) {
      throw new BadRequestException(`Âge minimum : ${minYears} ans (PM-16) — Carnet familial pour les mineurs (D-033)`);
    }
    const passwordHash = await hashPassword(dto.password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.consumeOtpOrThrow(tx, { email }, OtpPurpose.REGISTRATION, dto.otpCode);
        const account = await tx.account.create({
          data: {
            phone,
            email,
            username,
            passwordHash,
            type: "PATIENT",
            patientProfile: {
              create: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                birthDate: birth,
                sex: dto.sex,
                district: dto.district,
              },
            },
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
        const token = await this.openSession(tx, account.id, dto.client, dto.deviceLabel);
        await this.outbox.emit(tx, { type: "m01.account.patient_created", payload: { accountId: account.id } });
        await this.audit.emit(tx, {
          actorId: account.id,
          actorType: "patient",
          action: "m01.account.created",
          resource: `account:${account.id}`,
          context: { type: "PATIENT" },
        });
        return { accountId: account.id, sessionToken: token };
      });
    } catch (e) {
      // Course concurrente sur une contrainte UNIQUE (username, email ou phone) — P2002.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = String((e.meta as { target?: unknown } | undefined)?.target ?? "");
        if (target.includes("username")) throw new ConflictException("Ce nom d'utilisateur est déjà pris");
        if (target.includes("email")) throw new ConflictException("Cette adresse email est déjà enregistrée");
        throw new ConflictException("Ce numéro est déjà enregistré — connectez-vous ou récupérez votre accès (RM-01-01)");
      }
      throw e;
    }
  }

  async registerProfessional(dto: {
    phone: string;
    email: string;
    username: string;
    otpCode: string;
    password: string;
    firstName: string;
    lastName: string;
    category: "GENERAL_PRACTITIONER" | "SPECIALIST" | "DENTIST" | "MIDWIFE" | "NURSE" | "COMMUNITY_HEALTH_WORKER";
    specialty?: string;
    acceptTerms: boolean;
    client: string;
    deviceLabel?: string;
  }): Promise<{ accountId: string; sessionToken: string }> {
    this.ensureTermsAccepted(dto.acceptTerms);
    const phone = this.normalizeOrThrow(dto.phone);
    await this.ensurePhoneFree(phone);
    const email = this.normalizeEmailOrThrow(dto.email);
    await this.ensureEmailFree(email);
    const username = normalizeUsername(dto.username);
    if (!isAcceptableUsername(username)) throw new BadRequestException("Nom d'utilisateur invalide (3 à 30 caractères : lettres, chiffres, . _ -)");
    await this.ensureUsernameFree(username);
    this.ensurePasswordOk(dto.password);
    const passwordHash = await hashPassword(dto.password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.consumeOtpOrThrow(tx, { email }, OtpPurpose.REGISTRATION, dto.otpCode);
        const account = await tx.account.create({
          data: {
            phone,
            email,
            username,
            passwordHash,
            type: "PROFESSIONAL",
            professionalProfile: {
              create: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                category: dto.category,
                specialty: dto.specialty ?? null,
              },
            },
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
        const token = await this.openSession(tx, account.id, dto.client, dto.deviceLabel);
        // → M03 ouvre le dossier de vérification (CU-01-02) ; invisible dans l'annuaire d'ici là (C6).
        await this.outbox.emit(tx, { type: "m01.account.professional_created", payload: { accountId: account.id } });
        await this.audit.emit(tx, {
          actorId: account.id,
          actorType: "professional",
          action: "m01.account.created",
          resource: `account:${account.id}`,
          context: { type: "PROFESSIONAL", category: dto.category },
        });
        return { accountId: account.id, sessionToken: token };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = String((e.meta as { target?: unknown } | undefined)?.target ?? "");
        if (target.includes("username")) throw new ConflictException("Ce nom d'utilisateur est déjà pris");
        if (target.includes("email")) throw new ConflictException("Cette adresse email est déjà enregistrée");
        throw new ConflictException("Ce numéro est déjà enregistré — connectez-vous ou récupérez votre accès (RM-01-01)");
      }
      throw e;
    }
  }

  // ── Connexion (EF-01-03/06/10 ; CU-01-03/08) ───────────────────────────────

  async login(dto: {
    username: string;
    password: string;
    client: string;
    deviceLabel?: string;
    totpCode?: string;
    /** Code reçu par email quand la 2FA email est active (mobile) — cf. emailTwoFactorEnabled. */
    otpCode?: string;
  }): Promise<{
    totpRequired: boolean;
    otpRequired?: boolean;
    /** Mode test (OTP_ECHO) uniquement — jamais renseigné en production réelle. */
    debugCode?: string;
    sessionToken?: string;
    accountId?: string;
    accountType?: string;
  }> {
    // Identifiant de connexion = username OU email (2026-07). Le téléphone reste la racine (PM-18, OTP, audit).
    const account = dto.username.includes("@")
      ? await this.prisma.account.findUnique({ where: { email: normalizeEmail(dto.username) }, include: { totpSecret: true } })
      : await this.prisma.account.findUnique({ where: { username: normalizeUsername(dto.username) }, include: { totpSecret: true } });

    // Blocage PM-18 — indexé par le téléphone du compte (clé racine).
    if (account) {
      const [maxFail, windowS, blockS] = (await this.params.getIntList("PM-18")) as [number, number, number];
      const fails = await this.prisma.loginAttempt.findMany({
        where: { phone: account.phone, success: false, createdAt: { gte: new Date(Date.now() - (windowS + blockS) * 1000) } },
        select: { createdAt: true },
      });
      const blockedUntil = lockoutUntil(
        fails.map((f) => f.createdAt.getTime()),
        { maxFailures: maxFail, windowSeconds: windowS, blockSeconds: blockS },
        Date.now(),
      );
      if (blockedUntil) {
        await this.auditSystem("m01.login.blocked", `phone:${account.phone}`, { untilIso: new Date(blockedUntil).toISOString() });
        /**
         * Le message DIT la durée restante, et ne cite plus le code du paramètre.
         *
         * « Compte temporairement bloqué après échecs répétés (PM-18) » posait deux problèmes :
         * « PM-18 » ne veut rien dire pour la personne qui le lit — c'est une référence interne qui
         * n'aurait jamais dû sortir de la documentation — et surtout, sans durée, on ne sait pas
         * s'il faut patienter une minute ou revenir demain. Le serveur connaît pourtant
         * `blockedUntil` : le taire était une rétention d'information gratuite, qui pousse à
         * réessayer en boucle et donc à prolonger le blocage.
         */
        const minutes = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
        throw new ForbiddenException(
          `Compte temporairement bloqué après plusieurs tentatives incorrectes. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        );
      }
    }

    // Vérification du mot de passe — coût scrypt constant même si le compte n'existe pas (anti-timing/énumération).
    const passwordOk = account ? await verifyPassword(dto.password, account.passwordHash) : await this.timingSafeMiss(dto.password);
    if (!account || !passwordOk) {
      await this.prisma.loginAttempt.create({ data: { phone: account?.phone ?? `unknown:${dto.username}`, success: false, client: dto.client } });
      throw new UnauthorizedException("Identifiants incorrects"); // message identique (anti-énumération)
    }
    if (account.status === "SUSPENDED") throw new ForbiddenException("Compte suspendu (RM-01-05)");
    if (account.status === "CLOSED") throw new ForbiddenException("Compte clôturé — contactez le support (PM-21)");
    // D-012 : le web est l'app soignant/administration, le mobile est l'app patient. Sans ce refus, un patient
    // obtenait une session web valide puis restait coincé (aucune capacité → garde de route qui rejette,
    // puis redirection en boucle vers ce même tableau de bord), sans comprendre pourquoi. Vérifié APRÈS le
    // mot de passe : refuser avant révélerait l'existence du compte et son type (anti-énumération).
    if (dto.client === "web" && account.type === "PATIENT") {
      await this.prisma.loginAttempt.create({ data: { phone: account.phone, success: false, client: dto.client } });
      throw new ForbiddenException("Compte patient — connectez-vous depuis l'application mobile ULAMU");
    }

    // TOTP (EF-01-10) : second facteur si activé. On signale via { totpRequired } (réponse 200), pas une exception.
    if (account.totpSecret?.enabled) {
      if (!dto.totpCode) {
        return { totpRequired: true };
      }
      const ok = await this.checkTotpOrBackup(account.id, account.totpSecret.encryptedSecret, dto.totpCode);
      if (!ok) {
        await this.prisma.loginAttempt.create({ data: { phone: account.phone, success: false, client: dto.client } });
        throw new UnauthorizedException("Code TOTP invalide");
      }
    }

    // 2FA par email — la double authentification du MOBILE (le TOTP y est absent, il reste au web).
    // Même principe de signalement que le TOTP : { otpRequired } en 200, pas une exception. Le code
    // n'est envoyé qu'ICI, une fois le mot de passe validé : l'envoyer avant permettrait à n'importe
    // qui de faire spammer la boîte mail d'un tiers en connaissant juste son identifiant.
    if (account.emailTwoFactorEnabled && account.email) {
      if (!dto.otpCode) {
        const sent = await this.requestOtp({ email: account.email }, "LOGIN_2FA");
        // Même mode test que l'inscription et la réinitialisation (OTP_ECHO) : sans cette reprise, la
        // 2FA était le seul parcours où le code n'était pas affiché en démo, donc le seul intestable
        // sans accès à la boîte mail. Le garde-fou reste celui de requestOtp : rien n'est renvoyé hors
        // mode test.
        return { totpRequired: false, otpRequired: true, ...(sent.debugCode ? { debugCode: sent.debugCode } : {}) };
      }
      await this.prisma.$transaction(async (tx) => {
        await this.consumeOtpOrThrow(tx, { email: account.email as string }, "LOGIN_2FA", dto.otpCode as string);
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.loginAttempt.create({ data: { phone: account.phone, success: true, client: dto.client } });
      const token = await this.openSession(tx, account.id, dto.client, dto.deviceLabel);

      /*
        ── Une connexion d'administration sans second facteur laisse une trace (chantier 32) ──────

        Contrepartie de D-053. Depuis que le TOTP est optionnel pour tous, un compte d'administration
        peut entrer avec son seul mot de passe. La décision est assumée ; **ce qui ne l'est pas,
        c'est qu'un tel accès soit indistinguable des autres après coup.**

        On n'empêche rien et on ne ralentit personne : on inscrit. Le jour où quelque chose cloche,
        la question « par où est-ce entré » a une réponse — et le journal est en insertion seule,
        donc cette réponse ne s'efface pas.

        Trois précisions qui comptent :

        • **Seulement les comptes ADMIN.** Un patient ou un soignant sans second facteur n'ouvre pas
          la console d'administration : tracer sa connexion produirait du bruit, et le bruit fait
          qu'on cesse de lire un journal.
        • **Aucune donnée personnelle**, pas même l'identifiant de session : l'`accountId`, le canal,
          et rien d'autre. Un journal en insertion seule doit contenir le minimum, puisque ce qui y
          entre n'en sort plus (RM-04-03).
        • **Dans la MÊME transaction que l'ouverture de session.** Si l'écriture échoue, la connexion
          échoue avec elle. Un accès qui réussirait sans laisser sa trace serait exactement ce qu'on
          cherche à empêcher.
      */
      if (doitTracerConnexionSansSecondFacteur(account.type, account.totpSecret?.enabled === true, account.emailTwoFactorEnabled)) {
        await this.audit.emit(tx, {
          actorId: account.id,
          actorType: "admin",
          action: "m01.admin.login_without_second_factor",
          resource: `account:${account.id}`,
          context: { client: dto.client },
        });
      }

      return { totpRequired: false, otpRequired: false, sessionToken: token, accountId: account.id, accountType: account.type };
    });
  }

  // ── 2FA par email (mobile) ─────────────────────────────────────────────────

  /** Envoie un code pour ACTIVER la 2FA email — prouve que l'utilisateur relève bien l'adresse du compte. */
  async requestEmailTwoFactorOtp(accountId: string): Promise<{ expiresInSeconds: number; debugCode?: string }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, select: { email: true } });
    if (!account?.email) {
      throw new BadRequestException("Aucune adresse email sur ce compte — ajoutez-en une d'abord");
    }
    return this.requestOtp({ email: account.email }, "LOGIN_2FA");
  }

  /** Active la 2FA email après vérification du code reçu. */
  async enableEmailTwoFactor(accountId: string, otpCode: string): Promise<{ enabled: true }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, select: { email: true } });
    if (!account?.email) throw new BadRequestException("Aucune adresse email sur ce compte");
    await this.prisma.$transaction(async (tx) => {
      await this.consumeOtpOrThrow(tx, { email: account.email as string }, "LOGIN_2FA", otpCode);
      await tx.account.update({ where: { id: accountId }, data: { emailTwoFactorEnabled: true } });
    });
    await this.auditSystem("m01.2fa_email.enabled", `account:${accountId}`, {});
    return { enabled: true };
  }

  /** Désactive la 2FA email — mot de passe exigé (on retire une protection, RM-01-03). */
  async disableEmailTwoFactor(accountId: string, password: string): Promise<{ enabled: false }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new UnauthorizedException("Compte introuvable");
    if (!(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException("Mot de passe incorrect");
    }
    await this.prisma.account.update({ where: { id: accountId }, data: { emailTwoFactorEnabled: false } });
    await this.auditSystem("m01.2fa_email.disabled", `account:${accountId}`, {});
    return { enabled: false };
  }

  /** Disponibilité d'un nom d'utilisateur (D-049) — format invalide = indisponible. */
  async isUsernameAvailable(raw: string): Promise<{ available: boolean }> {
    const username = normalizeUsername(raw);
    if (!isAcceptableUsername(username)) return { available: false };
    const taken = await this.prisma.account.findUnique({ where: { username }, select: { id: true } });
    return { available: !taken };
  }

  /**
   * Disponibilité de l'EMAIL et du TÉLÉPHONE, interrogée pendant la saisie de l'inscription.
   *
   * Compromis assumé : ces deux routes forment un oracle d'existence de compte, et sur une plateforme
   * de SANTÉ apprendre qu'une adresse ou un numéro a un compte ULAMU est en soi une information
   * sensible — c'est en tension avec le soin pris ailleurs contre l'énumération (messages d'erreur
   * identiques, temps de réponse égalisé). Retenu quand même parce que l'inscription révèle DÉJÀ la
   * même chose (`ensurePhoneFree`/`ensureEmailFree` s'exécutent avant que le code OTP ne soit
   * consommé, donc sans rien prouver), et parce que sans elles l'utilisateur remplit trois écrans et
   * reçoit un email pour se heurter à un mur au dernier moment. Le débit est limité côté contrôleur.
   *
   * Une adresse/un numéro mal formé renvoie `available: false` : le champ n'est pas encore utilisable,
   * ce qui est exactement ce que l'écran doit refléter (et évite une erreur à chaque lettre tapée).
   */
  async isEmailAvailable(raw: string): Promise<{ available: boolean }> {
    const email = normalizeEmail(raw ?? "");
    if (!isValidEmail(email)) return { available: false };
    const taken = await this.prisma.account.findUnique({ where: { email }, select: { id: true } });
    return { available: !taken };
  }

  async isPhoneAvailable(raw: string): Promise<{ available: boolean }> {
    const phone = normalizePhone(raw ?? "");
    if (!phone) return { available: false };
    const taken = await this.prisma.account.findUnique({ where: { phone }, select: { id: true } });
    return { available: !taken };
  }

  // ── Sessions (EF-01-05 ; CU-01-06) ─────────────────────────────────────────

  private async openSession(tx: Prisma.TransactionClient, accountId: string, client: string, deviceLabel?: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await tx.loginSession.create({
      data: { accountId, tokenHash: hashSessionToken(token), client, deviceLabel: deviceLabel ?? null },
    });
    return token;
  }

  async listSessions(
    accountId: string,
    currentSessionId?: string,
  ): Promise<Array<{ id: string; client: string; deviceLabel: string | null; lastActiveAt: Date; current: boolean }>> {
    const sessions = await this.prisma.loginSession.findMany({
      where: { accountId, revokedAt: null },
      orderBy: { lastActiveAt: "desc" },
    });
    // CU-01-06 : marque la session du token courant — l'UI masque alors son bouton de révocation
    // (on ne se déconnecte pas soi-même par mégarde) et affiche « cet appareil ».
    return sessions.map((s) => ({ id: s.id, client: s.client, deviceLabel: s.deviceLabel, lastActiveAt: s.lastActiveAt, current: s.id === currentSessionId }));
  }

  /**
   * Identité du compte connecté — header d'accueil & « Mon Espace » (amont EF-16-02).
   * Renvoie le profil patient (JAMAIS le hash ni le secret TOTP). `totpEnabled` pilote
   * l'invitation à activer la 2FA côté mobile.
   */
  async getMe(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        patientProfile: true,
        professionalProfile: true,
        facilityMemberProfile: true,
        adminRole: true,
        // Les codes de secours viennent avec : « Mes paramètres » doit dire combien il en reste et de
        // quand ils datent. Dix lignes au maximum par compte — pas de quoi peser sur la requête.
        totpSecret: { include: { backupCodes: true } },
      },
    });
    if (!account || account.status !== "ACTIVE") {
      throw new UnauthorizedException("Compte introuvable ou inactif");
    }
    // Une seule forme plate (pas d'union) : plus simple à consommer côté client, champs spécifiques
    // à un type de compte (patient/professionnel/structure) simplement à null quand non applicables.
    const patient = account.patientProfile;
    const pro = account.professionalProfile;
    const facility = account.facilityMemberProfile;
    const codesSecours = account.totpSecret?.backupCodes ?? [];
    return {
      accountId: account.id,
      accountType: account.type,
      username: account.username,
      phone: account.phone,
      firstName: patient?.firstName ?? pro?.firstName ?? facility?.firstName ?? null,
      lastName: patient?.lastName ?? pro?.lastName ?? facility?.lastName ?? null,
      birthDate: patient ? patient.birthDate.toISOString().slice(0, 10) : null,
      sex: patient?.sex ?? null,
      district: patient?.district ?? pro?.district ?? null,
      avatarKey: patient?.avatarKey ?? pro?.avatarKey ?? facility?.avatarKey ?? null,
      category: pro?.category ?? null,
      specialty: pro?.specialty ?? null,
      biography: pro?.biography ?? null,
      adminRole: account.adminRole?.role ?? null,
      totpEnabled: account.totpSecret?.enabled ?? false,
      totpEnabledAt: account.totpSecret?.enabledAt?.toISOString() ?? null,
      /** Codes de secours restants — un compte à 0 est à un incident d'être enfermé dehors. */
      backupCodesRemaining: codesSecours.filter((c) => c.consumedAt === null).length,
      backupCodesTotal: codesSecours.length,
      backupCodesGeneratedAt: codesSecours[0]?.createdAt.toISOString() ?? null,
      /** 2FA par email — celle du mobile (le TOTP ci-dessus est réservé au web). */
      emailTwoFactorEnabled: account.emailTwoFactorEnabled,
      email: account.email,
    };
  }

  /**
   * Photo de profil (CU-01 — n'affecte QUE son propre compte). Remplace l'ancienne image (supprimée
   * du stockage), enregistre la nouvelle et renvoie le profil à jour. Réservé aux comptes patients.
   */
  /**
   * Photo de profil — patients, soignants ET membres de structure (2026-08).
   *
   * Elle était refusée à tout le monde sauf aux patients, alors que « Mes paramètres » la présente
   * au soignant comme « visible par les patients sur votre vitrine publique » : c'est là qu'elle a
   * le plus de valeur, puisqu'elle sert à reconnaître le praticien avant une consultation.
   */
  async setAvatar(accountId: string, imageBase64: string, mime: string) {
    const account = await this.requireAccount(accountId);
    // Lu AVANT d'écrire le fichier : pour un compte sans profil, cela jette ici, et on n'a pas laissé
    // une image orpheline dans le stockage.
    const ancienneCle = await this.cleAvatar(accountId, account.type);
    const key = await this.storage.save("av", imageBase64, mime);
    await this.ecrireAvatar(accountId, account.type, key);
    await this.storage.remove(ancienneCle); // best-effort : on ne garde pas l'ancienne
    return this.getMe(accountId);
  }

  /**
   * Le profil qui porte la photo dépend du type de compte : trois tables distinctes, une seule
   * colonne. Les comptes ADMIN n'ont aucun profil — donc aucune photo à stocker nulle part.
   *
   * Les trois branches sont écrites en clair plutôt que déduites d'une variable : les trois délégués
   * Prisma sont des types différents, et TypeScript refuse d'appeler `.update` sur leur union.
   */
  private async cleAvatar(accountId: string, type: string): Promise<string | null> {
    const where = { accountId };
    const select = { avatarKey: true };
    if (type === "PATIENT") return (await this.prisma.patientProfile.findUnique({ where, select }))?.avatarKey ?? null;
    if (type === "PROFESSIONAL") return (await this.prisma.professionalProfile.findUnique({ where, select }))?.avatarKey ?? null;
    /* Le type sort du produit le 02/09/2026 (D-051), mais des comptes HÉRITÉS peuvent porter un
       profil de structure. Retirer la branche leur ferait perdre leur photo sur une donnée qui
       existe : un nettoyage s'arrête là où la donnée existante commence. */
    if (type === "FACILITY_MEMBER") return (await this.prisma.facilityMemberProfile.findUnique({ where, select }))?.avatarKey ?? null;
    throw new ForbiddenException("Ce type de compte n'a pas de photo de profil");
  }

  private async ecrireAvatar(accountId: string, type: string, avatarKey: string | null): Promise<void> {
    const where = { accountId };
    const data = { avatarKey };
    if (type === "PATIENT") await this.prisma.patientProfile.update({ where, data });
    else if (type === "PROFESSIONAL") await this.prisma.professionalProfile.update({ where, data });
    else if (type === "FACILITY_MEMBER") await this.prisma.facilityMemberProfile.update({ where, data });
    else throw new ForbiddenException("Ce type de compte n'a pas de photo de profil");
  }

  /** Retire la photo de profil (revient aux initiales). */
  async removeAvatar(accountId: string) {
    const account = await this.requireAccount(accountId);
    const cle = await this.cleAvatar(accountId, account.type);
    if (cle) {
      await this.ecrireAvatar(accountId, account.type, null);
      await this.storage.remove(cle);
    }
    return this.getMe(accountId);
  }

  /**
   * Mise à jour du profil patient (CRUD compte) — n'affecte QUE son propre compte.
   * Champs optionnels ; birthDate re-vérifié contre PM-16. Tracé C5 (RM-01-04).
   */
  async updateMyProfile(
    accountId: string,
    dto: { firstName?: string; lastName?: string; birthDate?: string; sex?: "M" | "F"; district?: string },
  ) {
    const account = await this.requireAccount(accountId);
    if (account.type !== "PATIENT") {
      throw new ForbiddenException("Seuls les comptes patients modifient ce profil ici");
    }
    const data: Prisma.PatientProfileUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.sex !== undefined) data.sex = dto.sex;
    if (dto.district !== undefined) data.district = dto.district.trim();
    if (dto.birthDate !== undefined) {
      const minYears = await this.params.getInt("PM-16");
      const birth = new Date(dto.birthDate);
      if (Number.isNaN(birth.getTime()) || !isAdult(birth, minYears, new Date())) {
        throw new BadRequestException(`Âge minimum : ${minYears} ans (PM-16)`);
      }
      data.birthDate = birth;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.patientProfile.update({ where: { accountId }, data });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.profile.updated", resource: `account:${accountId}` });
    });
    return this.getMe(accountId);
  }

  async revokeSession(accountId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.loginSession.findUnique({ where: { id: sessionId } });
    if (!session || session.accountId !== accountId) throw new ForbiddenException("Session inconnue");
    await this.prisma.$transaction(async (tx) => {
      await tx.loginSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.session.revoked", resource: `session:${sessionId}` });
    });
  }

  // ── Récupération de mot de passe (EF-01-04 ; CU-01-04) ─────────────────────

  async resetPassword(dto: { email: string; otpCode: string; newPassword: string }): Promise<void> {
    const email = this.normalizeEmailOrThrow(dto.email);
    this.ensurePasswordOk(dto.newPassword);
    const account = await this.prisma.account.findUnique({ where: { email } });
    if (!account) throw new UnauthorizedException("Aucun code en attente — redemandez un code"); // anti-énumération
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await this.consumeOtpOrThrow(tx, { email }, OtpPurpose.PASSWORD_RESET, dto.otpCode);
      await tx.account.update({ where: { id: account.id }, data: { passwordHash } });
      // Toutes les sessions existantes sont révoquées (CU-01-04).
      await tx.loginSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.emit(tx, { actorId: account.id, action: "m01.password.reset", resource: `account:${account.id}` });
    });
  }

  /** Réinitialisation web par TOTP (jamais de SMS pour la récupération côté web — règle à respecter). */
  async resetPasswordByTotp(dto: { username: string; code: string; newPassword: string }): Promise<void> {
    this.ensurePasswordOk(dto.newPassword);
    const username = normalizeUsername(dto.username);
    const account = await this.prisma.account.findUnique({ where: { username }, include: { totpSecret: true } });
    if (!account || !account.totpSecret?.enabled) throw new UnauthorizedException("Compte introuvable ou TOTP non activé");
    if (!(await this.checkTotpOrBackup(account.id, account.totpSecret.encryptedSecret, dto.code))) {
      throw new UnauthorizedException("Code invalide");
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: account.id }, data: { passwordHash } });
      await tx.loginSession.updateMany({ where: { accountId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.emit(tx, { actorId: account.id, action: "m01.password.reset.totp", resource: `account:${account.id}` });
    });
  }

  // ── Changement de numéro (EF-01-07 ; CU-01-05) ─────────────────────────────

  async startPhoneChange(accountId: string, rawNewPhone: string): Promise<void> {
    const account = await this.requireAccount(accountId);
    const newPhone = this.normalizeOrThrow(rawNewPhone);
    await this.ensurePhoneFree(newPhone);
    await this.requestOtp({ phone: account.phone }, OtpPurpose.PHONE_CHANGE_OLD);
    await this.requestOtp({ phone: newPhone }, OtpPurpose.PHONE_CHANGE_NEW);
  }

  async confirmPhoneChange(accountId: string, rawNewPhone: string, oldPhoneCode: string, newPhoneCode: string): Promise<void> {
    const account = await this.requireAccount(accountId);
    const newPhone = this.normalizeOrThrow(rawNewPhone);
    await this.ensurePhoneFree(newPhone);
    const oldPhone = account.phone;
    await this.prisma.$transaction(async (tx) => {
      // OTP sur l'ANCIEN ET le NOUVEAU numéro (EF-01-07 — parade T-01).
      await this.consumeOtpOrThrow(tx, { phone: oldPhone }, OtpPurpose.PHONE_CHANGE_OLD, oldPhoneCode);
      await this.consumeOtpOrThrow(tx, { phone: newPhone }, OtpPurpose.PHONE_CHANGE_NEW, newPhoneCode);
      await tx.account.update({ where: { id: accountId }, data: { phone: newPhone } });
      await this.audit.emit(tx, {
        actorId: accountId,
        action: "m01.phone.changed",
        resource: `account:${accountId}`,
        context: { from: oldPhone, to: newPhone },
      });
    });
    await this.sms.send(oldPhone, "ULAMU : votre numéro a été remplacé sur votre compte. Si ce n'est pas vous, contactez le support immédiatement.");
    await this.sms.send(newPhone, "ULAMU : ce numéro est désormais l'identifiant de votre compte.");
  }

  // ── Clôture (EF-01-09 ; CU-01-07) ──────────────────────────────────────────

  /**
   * Les trois conditions de clôture — « Mes paramètres » les affiche, le serveur les fait respecter.
   *
   * Les afficher sans les vérifier reviendrait à poser une barrière sur le seul chemin que personne
   * de mal intentionné n'emprunte : un appel direct à l'API contournerait l'écran. Elles sont donc
   * lues ici et rejouées dans `closeAccount`.
   *
   * Ce que chacune protège :
   *   consultation en cours  un patient attend une réponse à l'autre bout ;
   *   gains non retirés      de l'argent dû resterait sur un compte fermé, sans destinataire ;
   *   réservation active     une pharmacie garde un médicament de côté pour quelqu'un.
   */
  async closePrerequisites(accountId: string): Promise<Array<{ key: string; label: string; ok: boolean }>> {
    const [consultations, gains, retraitsEnCours, reservations] = await Promise.all([
      this.prisma.careSession.count({
        where: { status: { in: ["PREPARING", "ACTIVE"] }, OR: [{ patientAccountId: accountId }, { professionalId: accountId }] },
      }),
      // Seulement le compte de gains PERSONNEL : celui d'une officine appartient à la structure, pas
      // à l'employé qui s'en va.
      this.prisma.earningsAccount.findUnique({
        where: { holderType_holderId: { holderType: "PROFESSIONAL", holderId: accountId } },
        select: { id: true, availableXaf: true },
      }),
      this.prisma.withdrawal.count({ where: { requestedBy: accountId, status: "PENDING" } }),
      this.prisma.disclosure.count({ where: { patientAccountId: accountId, status: "ACTIVE" } }),
    ]);
    const solde = gains?.availableXaf ?? 0;
    return [
      {
        key: "consultations",
        label: consultations === 0 ? "Aucune consultation en cours" : `${consultations} consultation(s) encore ouverte(s)`,
        ok: consultations === 0,
      },
      {
        key: "gains",
        label:
          solde === 0 && retraitsEnCours === 0
            ? "Aucun gain en attente de retrait"
            : solde > 0
              ? `${solde.toLocaleString("fr-FR")} FCFA encore disponibles à retirer`
              : `${retraitsEnCours} retrait(s) en cours de traitement`,
        ok: solde === 0 && retraitsEnCours === 0,
      },
      {
        key: "reservations",
        label:
          reservations === 0
            ? "Aucune réservation active en pharmacie"
            : `${reservations} réservation(s) encore active(s) en pharmacie`,
        ok: reservations === 0,
      },
    ];
  }

  /**
   * Code de confirmation de clôture.
   *
   * Il partait systématiquement par SMS. Or la passerelle SMS de ce déploiement est une passerelle de
   * développement (plafond Twilio en essai, cf. décision produit) : le code n'arrivait donc nulle
   * part, et la clôture — un droit de l'utilisateur, pas une option — était impossible à terminer.
   * Il part maintenant par email dès que le compte en a une, et retombe sur le SMS sinon. La réponse
   * dit par où, pour que l'écran n'ait pas à le deviner.
   */
  async requestCloseOtp(accountId: string): Promise<{ channel: "email" | "sms"; hint: string }> {
    const account = await this.requireAccount(accountId);
    if (account.email) {
      await this.requestOtp({ email: account.email }, OtpPurpose.SENSITIVE_ACTION);
      return { channel: "email", hint: masquerEmail(account.email) };
    }
    await this.requestOtp({ phone: account.phone }, OtpPurpose.SENSITIVE_ACTION);
    return { channel: "sms", hint: masquerTelephone(account.phone) };
  }

  async closeAccount(accountId: string, password: string, otpCode: string): Promise<void> {
    const account = await this.requireAccount(accountId);
    if (!(await verifyPassword(password, account.passwordHash))) throw new UnauthorizedException("Mot de passe incorrect");
    // Relus au dernier moment : entre l'affichage de l'écran et le clic, une consultation a pu démarrer.
    const bloquants = (await this.closePrerequisites(accountId)).filter((p) => !p.ok);
    if (bloquants.length > 0) {
      throw new ConflictException(`Clôture impossible : ${bloquants.map((p) => p.label).join(" ; ")}`);
    }
    await this.prisma.$transaction(async (tx) => {
      // Même cible qu'à l'envoi, sans quoi le code reçu par email serait cherché côté téléphone.
      const cible = account.email ? { email: account.email } : { phone: account.phone };
      await this.consumeOtpOrThrow(tx, cible, OtpPurpose.SENSITIVE_ACTION, otpCode);
      await tx.account.update({ where: { id: accountId }, data: { status: "CLOSED", closedAt: new Date() } });
      await tx.loginSession.updateMany({ where: { accountId, revokedAt: null }, data: { revokedAt: new Date() } });
      // Le Carnet est conservé selon M07/PM-31 — rien n'est supprimé ici.
      await this.outbox.emit(tx, { type: "m01.account.closed", payload: { accountId } });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.account.closed", resource: `account:${accountId}` });
    });
  }

  // ── TOTP (EF-01-10 ; CU-01-08) — OPTIONNEL pour tous les types de compte depuis D-053 ──────────────

  async setupTotp(accountId: string): Promise<{ secret: string; provisioningUri: string }> {
    const account = await this.requireAccount(accountId);
    const existing = await this.prisma.totpSecret.findUnique({ where: { accountId } });
    if (existing?.enabled) throw new ConflictException("TOTP déjà activé");
    const secret = generateTotpSecret();
    await this.prisma.totpSecret.upsert({
      where: { accountId },
      update: { encryptedSecret: sealSecret(secret), enabled: false, enabledAt: null },
      create: { accountId, encryptedSecret: sealSecret(secret) },
    });
    return { secret, provisioningUri: provisioningUri(secret, account.phone) };
  }

  async confirmTotp(accountId: string, code: string): Promise<{ backupCodes: string[] }> {
    const row = await this.prisma.totpSecret.findUnique({ where: { accountId } });
    if (!row) throw new BadRequestException("Aucune association TOTP en cours");
    if (row.enabled) throw new ConflictException("TOTP déjà activé");
    // Même isolement qu'à la connexion : si le secret est illisible, l'utilisateur doit lire une
    // consigne actionnable — recommencer l'association — et non un 500. Ici le repli par code de
    // secours n'existe pas : ils ne sont créés que quelques lignes plus bas, à la confirmation.
    let valide = false;
    try {
      valide = verifyTotp(openSecret(row.encryptedSecret), code);
    } catch (e) {
      this.logger.error(`Secret TOTP illisible à la confirmation (compte ${accountId}) : ${(e as Error).message}`);
    }
    if (!valide) throw new UnauthorizedException("Code invalide — rescannez le QR");
    const backupCodes = Array.from({ length: 10 }, () => randomBytes(5).toString("hex"));
    await this.prisma.$transaction(async (tx) => {
      await tx.totpSecret.update({ where: { accountId }, data: { enabled: true, enabledAt: new Date() } });
      await tx.totpBackupCode.deleteMany({ where: { accountId } });
      await tx.totpBackupCode.createMany({ data: backupCodes.map((c) => ({ accountId, codeHash: hashOtp(c) })) });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.totp.enabled", resource: `account:${accountId}` });
    });
    return { backupCodes }; // affichés une seule fois (CU-01-08)
  }

  async disableTotp(accountId: string, password: string, code: string): Promise<void> {
    const account = await this.requireAccount(accountId);
    /* 02/09/2026 (D-053) — un `if (account.type === "ADMIN") throw` vivait ici : RM-01-06 interdisait
       à un administrateur de désactiver son TOTP. Le porteur a tranché l'inverse le 02/09 — le TOTP
       est optionnel pour TOUS les types de compte, et chacun le désactive comme il l'entend.

       Ce qui reste exigé ne change pas, et c'est l'essentiel : le mot de passe ET un code valide
       (application d'authentification ou code de secours). Désactiver un second facteur est
       précisément le geste qu'un voleur de session voudrait faire — il demande donc de prouver deux
       fois qu'on est bien le titulaire. */
    if (!(await verifyPassword(password, account.passwordHash))) throw new UnauthorizedException("Mot de passe incorrect");
    const row = await this.prisma.totpSecret.findUnique({ where: { accountId } });
    if (!row?.enabled) throw new BadRequestException("TOTP non activé");
    if (!(await this.checkTotpOrBackup(accountId, row.encryptedSecret, code))) throw new UnauthorizedException("Code invalide");
    await this.prisma.$transaction(async (tx) => {
      await tx.totpBackupCode.deleteMany({ where: { accountId } });
      await tx.totpSecret.delete({ where: { accountId } });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.totp.disabled", resource: `account:${accountId}` });
    });
  }

  /**
   * Vérifie un second facteur : le code de l'application d'authentification, sinon un code de
   * secours.
   *
   * ⚠️ Le déchiffrement est isolé, et ce n'est pas une précaution théorique. `openSecret` LÈVE
   * quand `SECRETBOX_KEY` n'est plus celle qui a scellé le secret — clé tournée, ou secret créé
   * dans un autre environnement (c'est le cas d'un compte créé par le seed en local puis servi par
   * l'API déployée). L'exception n'était pas rattrapée : elle remontait au client en **500**, et
   * l'écran affichait « Internal server error » là où il fallait lire « code invalide ».
   *
   * Plus grave que le message : le code de secours n'était **jamais atteint**, puisqu'il n'est
   * cherché qu'après cette ligne. Or un code de secours existe précisément pour quand le second
   * facteur habituel ne répond plus. Le faire dépendre du secret qu'il doit suppléer le rendait
   * inutile au moment exact où il devenait nécessaire — un compte devenait alors définitivement
   * inaccessible.
   */
  private async checkTotpOrBackup(accountId: string, encryptedSecret: string, code: string): Promise<boolean> {
    try {
      if (verifyTotp(openSecret(encryptedSecret), code)) return true;
    } catch (e) {
      // Journalisé, jamais silencieux : un secret illisible est un incident d'exploitation, pas un
      // mauvais code saisi. Sans cette trace, la panne resterait invisible côté serveur alors que
      // des comptes se verraient refuser l'entrée.
      this.logger.error(
        `Secret TOTP illisible (compte ${accountId}) — SECRETBOX_KEY a-t-elle changé depuis la création du secret ? ${(e as Error).message}`,
      );
    }
    // Code de secours à usage unique (CU-01-08). Atteint MÊME quand le déchiffrement a échoué.
    const backup = await this.prisma.totpBackupCode.findFirst({ where: { accountId, codeHash: hashOtp(code), consumedAt: null } });
    if (!backup) return false;
    await this.prisma.totpBackupCode.update({ where: { id: backup.id }, data: { consumedAt: new Date() } });
    return true;
  }

  /**
   * Les consentements donnés à l'inscription.
   *
   * `ConsentRecord` est rempli depuis toujours — le modèle le qualifie de « preuve légale, immuable »
   * (EF-01-08, loi n° 29-2019) — mais AUCUN endpoint ne le relisait. « Mes paramètres » affichait donc
   * les textes des CGU sans pouvoir dire à quelle version l'utilisateur avait consenti, ni quand.
   * Une preuve qu'on ne peut pas produire ne prouve rien.
   */
  async myConsents(accountId: string): Promise<Array<{ documentType: string; documentVersion: string; acceptedAt: string }>> {
    const lignes = await this.prisma.consentRecord.findMany({
      where: { accountId },
      orderBy: { acceptedAt: "desc" },
    });
    return lignes.map((c) => ({
      documentType: c.documentType,
      documentVersion: c.documentVersion,
      acceptedAt: c.acceptedAt.toISOString(),
    }));
  }

  // ── « Mes paramètres » (B3) — gestes du compte depuis une session ouverte ──────────

  /**
   * Changement de mot de passe par un utilisateur DÉJÀ connecté.
   *
   * Distinct de `resetPassword`, qui sert à celui qui a perdu son accès et prouve son identité par un
   * code reçu. Ici l'accès est là ; ce qu'on vérifie, c'est que la personne devant le clavier est bien
   * le titulaire — sur un poste partagé de CSI, une session laissée ouverte ne doit pas suffire.
   *
   * La session courante SURVIT, toutes les autres tombent : autrement l'utilisateur se déconnecterait
   * lui-même en changeant son mot de passe, ce qui le pousserait à ne jamais le faire.
   */
  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
  ): Promise<{ otherSessionsClosed: number }> {
    const account = await this.requireAccount(accountId);
    if (!(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }
    this.ensurePasswordOk(newPassword);
    // Sans cette vérification, resaisir le même mot de passe répondrait « c'est fait » et fermerait les
    // autres appareils sans rien avoir changé — le pire des deux mondes.
    if (await verifyPassword(newPassword, account.passwordHash)) {
      throw new BadRequestException("Le nouveau mot de passe doit être différent de l'actuel");
    }
    const passwordHash = await hashPassword(newPassword);
    let fermees = 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: accountId }, data: { passwordHash } });
      const r = await tx.loginSession.updateMany({
        where: { accountId, revokedAt: null, id: { not: currentSessionId } },
        data: { revokedAt: new Date() },
      });
      fermees = r.count;
      await this.audit.emit(tx, { actorId: accountId, action: "m01.password.changed", resource: `account:${accountId}` });
    });
    // Prévenir l'adresse du compte : si ce n'est pas lui, c'est le seul signal qu'il recevra. Après le
    // commit et sans jeter — une panne du fournisseur d'email n'a pas à faire échouer un changement déjà
    // enregistré, sinon l'utilisateur croit que rien n'a bougé et resaisit son ancien mot de passe.
    if (account.email) {
      await this.email
        .send(
          account.email,
          "Votre mot de passe ULAMU a été modifié",
          avisSecuriteTemplate(
            "Votre mot de passe a été modifié",
            "Le mot de passe de votre compte ULAMU vient d'être changé depuis un appareil connecté. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support : votre compte est peut-être compromis.",
          ),
        )
        .catch((err) => this.logger.error(`Avis de changement de mot de passe non envoyé (compte ${accountId}) : ${String(err)}`));
    }
    return { otherSessionsClosed: fermees };
  }

  /**
   * Nouveau lot de codes de secours.
   *
   * Ils n'étaient créés qu'une fois, à l'activation de la double authentification. Celui qui en avait
   * consommé neuf sur dix n'avait aucun moyen d'en refaire : il attendait, sans le savoir, d'être
   * enfermé dehors. Le lot précédent est intégralement détruit — dix codes qui traînent sur un papier
   * oublié restent dix clés valides.
   */
  async regenerateBackupCodes(accountId: string, password: string, code: string): Promise<{ backupCodes: string[] }> {
    const account = await this.requireAccount(accountId);
    if (!(await verifyPassword(password, account.passwordHash))) throw new UnauthorizedException("Mot de passe incorrect");
    const row = await this.prisma.totpSecret.findUnique({ where: { accountId } });
    if (!row?.enabled) throw new BadRequestException("Aucune double authentification active — les codes de secours n'existent qu'avec elle");
    // Accepte un code de l'application OU un code de secours encore valide : celui qui régénère est
    // souvent précisément celui qui n'a plus que ça.
    if (!(await this.checkTotpOrBackup(accountId, row.encryptedSecret, code))) throw new UnauthorizedException("Code invalide");
    const backupCodes = Array.from({ length: 10 }, () => randomBytes(5).toString("hex"));
    await this.prisma.$transaction(async (tx) => {
      await tx.totpBackupCode.deleteMany({ where: { accountId } });
      await tx.totpBackupCode.createMany({ data: backupCodes.map((c) => ({ accountId, codeHash: hashOtp(c) })) });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.totp.backup_codes.regenerated", resource: `account:${accountId}` });
    });
    return { backupCodes }; // affichés une seule fois (CU-01-08)
  }

  /**
   * Ré-association de l'appareil d'authentification — téléphone perdu, changé, réinitialisé.
   *
   * `setupTotp` refusait tant que la double authentification était active, et `disableTotp` la réserve
   * aux non-admins tout en exigeant un code : la seule sortie était d'appeler le support. Ici on ne
   * désactive rien, on RÉARME — nouveau secret, ancien lot de codes détruit — et l'écran enchaîne sur
   * `confirmTotp` exactement comme à la première configuration.
   *
   * Entre cet appel et la confirmation, le compte n'a plus de second facteur. C'est assumé et borné :
   * il a fallu le mot de passe ET un facteur valide pour arriver ici, et côté admin le garde
   * `ADMIN_REQUIRE_TOTP` continue de bloquer toute action sensible tant que la confirmation n'est pas
   * faite. Garder l'ancien secret actif pendant ce temps rendrait le geste inutile.
   */
  async resetTotp(accountId: string, password: string, code: string): Promise<{ secret: string; provisioningUri: string }> {
    const account = await this.requireAccount(accountId);
    if (!(await verifyPassword(password, account.passwordHash))) throw new UnauthorizedException("Mot de passe incorrect");
    const row = await this.prisma.totpSecret.findUnique({ where: { accountId } });
    if (!row?.enabled) throw new BadRequestException("Aucune double authentification active — utilisez la configuration initiale");
    if (!(await this.checkTotpOrBackup(accountId, row.encryptedSecret, code))) throw new UnauthorizedException("Code invalide");
    const secret = generateTotpSecret();
    await this.prisma.$transaction(async (tx) => {
      await tx.totpSecret.update({ where: { accountId }, data: { encryptedSecret: sealSecret(secret), enabled: false, enabledAt: null } });
      // Les anciens codes de secours ouvraient l'ancien appareil : ils ne valent plus rien.
      await tx.totpBackupCode.deleteMany({ where: { accountId } });
      await this.audit.emit(tx, { actorId: accountId, action: "m01.totp.reset", resource: `account:${accountId}` });
    });
    return { secret, provisioningUri: provisioningUri(secret, account.phone) };
  }

  /**
   * Première adresse email d'un compte, ou remplacement de celle en place.
   *
   * Il n'existait aucun moyen d'en ajouter une : `PATCH accounts/me` ne touche que les profils patients
   * et n'a pas de champ email. L'API allait jusqu'à répondre « Aucune adresse email sur ce compte —
   * ajoutez-en une d'abord » sans offrir nulle part le geste correspondant. Les comptes créés par le
   * seed, dont l'administrateur, restaient donc sans canal de récupération.
   *
   * Quand le compte a DÉJÀ une adresse, il faut prouver les deux (EF-01-07, parade T-01) : sans la
   * preuve sur l'ancienne, une session volée suffirait à détourner le canal de récupération, puis à
   * réinitialiser le mot de passe en toute légalité apparente.
   */
  async startEmailChange(accountId: string, rawNewEmail: string): Promise<{ requiresOldEmailCode: boolean; oldEmailHint: string | null }> {
    const account = await this.requireAccount(accountId);
    const newEmail = this.normalizeEmailOrThrow(rawNewEmail);
    if (account.email === newEmail) throw new ConflictException("C'est déjà l'adresse de ce compte");
    await this.ensureEmailFree(newEmail);
    // La NOUVELLE d'abord : si l'adresse est refusée par le fournisseur, on n'a pas déjà dérangé
    // l'ancienne avec un code qui ne servira à rien.
    await this.requestOtp({ email: newEmail }, OtpPurpose.EMAIL_CHANGE_NEW);
    if (!account.email) return { requiresOldEmailCode: false, oldEmailHint: null };
    await this.requestOtp({ email: account.email }, OtpPurpose.EMAIL_CHANGE_OLD);
    return { requiresOldEmailCode: true, oldEmailHint: masquerEmail(account.email) };
  }

  async confirmEmailChange(accountId: string, rawNewEmail: string, newEmailCode: string, oldEmailCode?: string): Promise<{ email: string }> {
    const account = await this.requireAccount(accountId);
    const newEmail = this.normalizeEmailOrThrow(rawNewEmail);
    await this.ensureEmailFree(newEmail); // relu ici : quelqu'un a pu la prendre entre les deux appels
    const ancienne = account.email;
    if (ancienne && !oldEmailCode) throw new BadRequestException("Code reçu à l'ancienne adresse requis");
    await this.prisma.$transaction(async (tx) => {
      await this.consumeOtpOrThrow(tx, { email: newEmail }, OtpPurpose.EMAIL_CHANGE_NEW, newEmailCode);
      if (ancienne) await this.consumeOtpOrThrow(tx, { email: ancienne }, OtpPurpose.EMAIL_CHANGE_OLD, oldEmailCode as string);
      await tx.account.update({ where: { id: accountId }, data: { email: newEmail } });
      await this.audit.emit(tx, {
        actorId: accountId,
        action: ancienne ? "m01.email.changed" : "m01.email.added",
        resource: `account:${accountId}`,
        context: ancienne ? { from: ancienne, to: newEmail } : { to: newEmail },
      });
    });
    if (ancienne) {
      await this.email
        .send(
          ancienne,
          "L'adresse email de votre compte ULAMU a changé",
          avisSecuriteTemplate(
            "Cette adresse n'est plus celle de votre compte",
            "Une autre adresse email vient de remplacer celle-ci sur votre compte ULAMU. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support : vous ne recevrez plus les codes de récupération.",
          ),
        )
        .catch((err) => this.logger.error(`Avis de changement d'adresse non envoyé (compte ${accountId}) : ${String(err)}`));
    }
    return { email: newEmail };
  }

  // ── OTP d'action sensible — exposé aux autres modules (signature M03, transferts M02) ──

  /** Envoie un OTP « action sensible » sur le téléphone du compte (signature de contrat, transfert…). */
  async requestSensitiveActionOtp(accountId: string): Promise<{ expiresInSeconds: number }> {
    const account = await this.requireAccount(accountId);
    return this.requestOtp({ phone: account.phone }, OtpPurpose.SENSITIVE_ACTION);
  }

  /** Consomme un OTP « action sensible » dans la transaction appelante. Jette si invalide. */
  async verifySensitiveActionOtp(tx: Prisma.TransactionClient, accountId: string, code: string): Promise<void> {
    const account = await this.requireAccount(accountId);
    await this.consumeOtpOrThrow(tx, { phone: account.phone }, OtpPurpose.SENSITIVE_ACTION, code);
  }

  /** Vérifie le mot de passe d'un compte (signature de contrat CU-03-03). */
  async verifyAccountPassword(accountId: string, password: string): Promise<boolean> {
    const account = await this.requireAccount(accountId);
    return verifyPassword(password, account.passwordHash);
  }

  // ── Aides internes ─────────────────────────────────────────────────────────

  private normalizeOrThrow(raw: string): string {
    const phone = normalizePhone(raw);
    if (!phone) throw new BadRequestException("Numéro de téléphone congolais invalide");
    return phone;
  }

  private normalizeEmailOrThrow(raw: string): string {
    if (!isValidEmail(raw)) throw new BadRequestException("Adresse email invalide");
    return normalizeEmail(raw);
  }

  private ensurePasswordOk(pw: string): void {
    if (!isAcceptablePassword(pw)) {
      throw new BadRequestException("Mot de passe trop faible : 8 caractères minimum, lettres et chiffres");
    }
  }

  private async ensurePhoneFree(phone: string): Promise<void> {
    const existing = await this.prisma.account.findUnique({ where: { phone } });
    if (existing) throw new ConflictException("Ce numéro est déjà enregistré — connectez-vous ou récupérez votre accès (RM-01-01)");
  }

  private async ensureEmailFree(email: string): Promise<void> {
    const existing = await this.prisma.account.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException("Cette adresse email est déjà enregistrée");
  }

  private async ensureUsernameFree(username: string): Promise<void> {
    const existing = await this.prisma.account.findUnique({ where: { username }, select: { id: true } });
    if (existing) throw new ConflictException("Ce nom d'utilisateur est déjà pris");
  }

  /** Vérification de mot de passe factice à coût scrypt constant — égalise le temps quand le compte n'existe pas (anti-timing/énumération, §E.2). */
  private dummyHashPromise: Promise<string> | null = null;
  private async timingSafeMiss(password: string): Promise<false> {
    if (!this.dummyHashPromise) this.dummyHashPromise = hashPassword("ulamu-timing-equalizer-Zz0");
    await verifyPassword(password, await this.dummyHashPromise);
    return false;
  }

  private async requireAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.status !== "ACTIVE") throw new UnauthorizedException("Compte introuvable ou inactif");
    return account;
  }

  private async auditSystem(action: string, resource: string, context: Record<string, unknown>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.audit.emit(tx, { actorType: "system", action, resource, context });
    });
  }
}
