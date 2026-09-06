/**
 * M14 — Notifications & Rappels : livraison C4, centre in-app, préférences, rétention.
 * Spec : docs/cahier_des_charges/02_modules/M14_notifications_rappels.md
 * Invariants : service aveugle au métier (RM-14-01) ; les critiques ne se désactivent
 * JAMAIS (RM-14-02) ; jamais de contenu médical dans title/body (RM-14-03, EF-14-06) ;
 * une demande C4 n'échoue JAMAIS pour une raison « métier » (accountId inconnu, modèle
 * inconnu) — sinon l'outbox la rejouerait à l'infini (pilule empoisonnée interdite).
 */
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationStatus, Prisma } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { OutboxService } from "../../common/outbox.service";
import { ParamsService } from "../../common/params.service";
import { PrismaService } from "../../common/prisma.service";
import {
  auditActorTypeFor,
  clampNotificationPageSize,
  effectivePriority,
  isCriticalNotification,
  isPreferenceAdjustable,
  MAX_CRITICAL_PUSH_ATTEMPTS,
  NotificationPriority,
  pushAllowed,
  purgeBefore,
  renderNotification,
} from "./m14.policies";
import {
  CATEGORIES_WITH_TEMPLATES,
  CATEGORY_LABELS,
  NotificationCategory,
  TemplatePayload,
} from "./m14.templates";
import { PUSH_GATEWAY, PushGateway } from "./m14.push.gateway";

/** Lot TECHNIQUE de renvoi des critiques en échec (EF-14-08) — pas un paramètre métier. */
const RETRY_BATCH_SIZE = 100;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly params: ParamsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditEmitter,
    @Inject(PUSH_GATEWAY) private readonly push: PushGateway,
  ) {}

  // ── Livraison d'une demande C4 (EF-14-01/02 ; CU-14-01) ────────────────────

  /**
   * Consommation d'un `notify.request` (C4) : { accountId, template, priority?, ...données }.
   * - accountId absent/inconnu → journalisé puis ACCEPTÉ (pas de rejeu infini de l'outbox) ;
   * - modèle inconnu → gabarit générique "system" (EF-14-03), jamais d'échec ;
   * - centre in-app : la création EST la livraison → IN_APP née SENT (EF-14-07) ;
   * - push : si préférence de la catégorie active OU notification critique (RM-14-02) ;
   * - critiques : auditées C5 dans la transaction (spec §6).
   * Seules les erreurs TECHNIQUES (base indisponible…) remontent — l'outbox rejouera.
   */
  async deliver(payload: Record<string, unknown>): Promise<void> {
    const accountId = typeof payload.accountId === "string" ? payload.accountId : undefined;
    const templateKey = typeof payload.template === "string" && payload.template !== "" ? payload.template : "unknown";

    if (!accountId) {
      this.logger.warn(`notify.request sans accountId (template=${templateKey}) — demande acceptée puis ignorée`);
      return;
    }
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, select: { id: true } });
    if (!account) {
      this.logger.warn(`notify.request vers un compte inconnu ${accountId} (template=${templateKey}) — ignoré`);
      return;
    }

    const rendered = renderNotification(templateKey, payload as TemplatePayload);
    const priority = effectivePriority(payload.priority, rendered.category);

    // EF-14-04 : préférence par catégorie, ACTIVE par défaut (aucune ligne = activé).
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { accountId_category: { accountId, category: rendered.category } },
    });
    const prefEnabled = pref?.enabled ?? true;
    const critical = isCriticalNotification(rendered.category, priority);
    // CU-14-03 : une catégorie désactivée n'alimente NI le push NI le centre/badge in-app —
    // sauf les critiques, livrées partout quoi qu'il arrive (RM-14-02).
    const wantInApp = critical || prefEnabled;
    const wantPush = pushAllowed(rendered.category, priority, prefEnabled);
    if (!wantInApp && !wantPush) {
      this.logger.debug(`notify ${templateKey} → ${accountId} : catégorie ${rendered.category} désactivée, rien à livrer`);
      return;
    }

    const pushId = await this.prisma.$transaction(async (tx) => {
      let inAppId: string | null = null;
      if (wantInApp) {
        // EF-14-07 : le centre in-app EST la livraison — QUEUED→SENT immédiat.
        const inApp = await tx.notification.create({
          data: {
            accountId,
            template: templateKey,
            payload: payload as Prisma.InputJsonValue,
            category: rendered.category,
            channel: "IN_APP",
            priority,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
        inAppId = inApp.id;
      }
      let created: string | null = null;
      if (wantPush) {
        // EF-14-02 : seconde notification, canal PUSH — envoyée hors transaction (pas d'E/S sous tx).
        const pushRow = await tx.notification.create({
          data: {
            accountId,
            template: templateKey,
            payload: payload as Prisma.InputJsonValue,
            category: rendered.category,
            channel: "PUSH",
            priority,
            status: NotificationStatus.QUEUED,
          },
        });
        created = pushRow.id;
      }
      // Spec §6 : M14 émet l'audit des critiques (C5) — dans la transaction.
      if (critical) {
        await this.audit.emit(tx, {
          actorType: "system",
          action: "m14.critical.delivered",
          resource: inAppId ? `notification:${inAppId}` : `account:${accountId}`,
          context: { template: templateKey, accountId, push: wantPush },
        });
      }
      return created;
    });

    if (pushId) {
      // JAMAIS jeter après le commit (D-047) : un échec ici rejouerait toute la demande C4
      // (in-app dupliquée). La récupération passe par retryFailedCritical / le balayage QUEUED.
      try {
        await this.attemptPush(pushId, accountId, rendered.category, priority, rendered.title, rendered.body);
      } catch (err) {
        this.logger.warn(`attemptPush ${pushId} a échoué hors transaction (sera rattrapé par le balayage) : ${(err as Error).message}`);
      }
    }
  }

  /**
   * Tentative d'envoi push + transitions CONDITIONNELLES (updateMany+count, D-046) :
   * succès → QUEUED→SENT ; échec → QUEUED→FAILED + attempts++ (EF-14-08).
   * Échec persistant d'une critique (attempts ≥ borne) → événement `m14.delivery.failed`
   * vers le module demandeur (EF-14-08) + audit C5.
   */
  private async attemptPush(
    notificationId: string,
    accountId: string,
    category: NotificationCategory,
    priority: NotificationPriority,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      await this.push.send({ accountId, title, body, category, priority });
      await this.prisma.notification.updateMany({
        where: { id: notificationId, status: NotificationStatus.QUEUED },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Envoi push ${notificationId} en échec : ${(err as Error).message}`);
      await this.prisma.notification.updateMany({
        where: { id: notificationId, status: NotificationStatus.QUEUED },
        data: { status: NotificationStatus.FAILED, attempts: { increment: 1 } },
      });
      if (!isCriticalNotification(category, priority)) return;
      const row = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        select: { attempts: true, template: true },
      });
      if (row && row.attempts >= MAX_CRITICAL_PUSH_ATTEMPTS) {
        // EF-14-08 : échec persistant → événement vers le module demandeur + trace C5,
        // émis ENSEMBLE dans une transaction (atomicité des deux événements).
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.emit(tx, {
            type: "m14.delivery.failed",
            payload: { notificationId, accountId, template: row.template, attempts: row.attempts },
          });
          await this.audit.emit(tx, {
            actorType: "system",
            action: "m14.critical.delivery_failed",
            resource: `notification:${notificationId}`,
            context: { template: row.template, accountId, attempts: row.attempts },
          });
          await this.alerterAbandon(tx, row.template);
        });
      }
    }
  }

  /**
   * ── Un abandon doit réveiller un humain (chantier 55, 06/09/2026) ──────────────────────────
   *
   * EF-14-08 s'appelle « livraison **garantie** des critiques ». Passé cinq tentatives, le serveur
   * renonçait, émettait `m14.delivery.failed` — **et rien ne s'y abonnait** — puis écrivait une
   * ligne d'audit. Or personne ne lit un journal d'audit spontanément : c'est à cela que servent
   * les alertes. La garantie s'arrêtait donc en silence.
   *
   * ⚠️ **Ce que l'abandon coûte vraiment, et il faut être juste** : la notification EXISTE toujours
   * dans le centre in-app du destinataire — celui-ci naît `SENT`, la création EST la livraison
   * (EF-14-07). Ce qui est perdu, c'est **l'interruption** : le téléphone ne sonne pas. Pour une
   * critique — « un patient vous attend », « votre séance commence » — c'est précisément l'objet.
   *
   * ⚠️ Et l'échec est rarement individuel : des identifiants FCM expirés, un quota dépassé, et
   * **tous** les push critiques tombent en même temps, pour tout le monde. C'est exactement ce
   * qu'une alerte doit attraper.
   *
   * On prévient donc le super-administrateur, comme M04 le fait pour une rupture de chaîne. Par
   * le centre in-app : alerter par push que le push est en panne ne servirait à rien.
   *
   * 📌 **Aujourd'hui ce chemin ne peut pas se déclencher** : `DevPushGateway` réussit toujours
   * (ADR-08 — le vrai FCM viendra plus tard). Il est écrit maintenant parce que le jour où FCM
   * sera branché sera précisément celui où les push commenceront à échouer, et où personne ne
   * pensera à vérifier.
   */
  private async alerterAbandon(tx: Prisma.TransactionClient, template: string): Promise<void> {
    const superAdmins = await tx.adminRoleAssignment.findMany({ where: { role: "SUPER_ADMIN" } });
    for (const admin of superAdmins) {
      await this.outbox.emit(tx, {
        type: "notify.request",
        payload: { accountId: admin.accountId, template: "m14.delivery.abandoned", modele: template },
      });
    }
  }

  /**
   * EF-14-08 — livraison garantie des critiques : repasse en renvoi les push critiques
   * FAILED encore rejouables (attempts < 5). Méthode PUBLIQUE volontairement non câblée
   * à un poller : M16/cron l'appellera plus tard (un seul drain dans le processus — M04).
   */
  async retryFailedCritical(): Promise<{ retried: number; delivered: number }> {
    // Inclut les push critiques FAILED rejouables ET les QUEUED « rassis » (crash entre le
    // commit de la ligne et sa transition SENT/FAILED) — sinon un push critique resterait
    // QUEUED à jamais et la garantie EF-14-08 tomberait sur ce chemin (D-047).
    const staleQueuedBefore = new Date(Date.now() - 60_000); // 1 min : marge technique
    const candidates = await this.prisma.notification.findMany({
      where: {
        channel: "PUSH",
        attempts: { lt: MAX_CRITICAL_PUSH_ATTEMPTS },
        OR: [{ category: "critical" }, { priority: "critical" }],
        AND: [
          {
            OR: [
              { status: NotificationStatus.FAILED },
              { status: NotificationStatus.QUEUED, sentAt: null, createdAt: { lt: staleQueuedBefore } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: RETRY_BATCH_SIZE,
    });
    let retried = 0;
    let delivered = 0;
    for (const n of candidates) {
      // Réservation CONDITIONNELLE sur l'état lu (anti-TOCTOU, D-046) — un seul renvoi à la fois.
      // Pour un FAILED : repasse en QUEUED. Pour un QUEUED rassis : on le re-tente tel quel.
      const claimed = await this.prisma.notification.updateMany({
        where: { id: n.id, status: n.status, attempts: { lt: MAX_CRITICAL_PUSH_ATTEMPTS } },
        data: { status: NotificationStatus.QUEUED },
      });
      if (claimed.count === 0) continue;
      retried += 1;
      const rendered = renderNotification(n.template, (n.payload ?? {}) as TemplatePayload);
      await this.attemptPush(
        n.id,
        n.accountId,
        rendered.category,
        effectivePriority(n.priority, rendered.category),
        rendered.title,
        rendered.body,
      );
      const after = await this.prisma.notification.findUnique({ where: { id: n.id }, select: { status: true } });
      if (after?.status === NotificationStatus.SENT) delivered += 1;
    }
    return { retried, delivered };
  }

  // ── Centre in-app (EF-14-07 ; CU-14-03) ─────────────────────────────────────

  /**
   * Historique du centre in-app : tri du plus récent au plus ancien, pagination par
   * curseur, rétention PM-37 appliquée en FILTRE de lecture (createdAt ≥ now − PM-37 j).
   * Seules les notifications IN_APP sont listées — les lignes PUSH ne sont que le suivi
   * de livraison (EF-14-08), pas des éléments du centre.
   */
  async listMine(
    accountId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    items: Array<{
      id: string;
      template: string;
      category: string;
      priority: string;
      title: string;
      body: string;
      readAt: string | null;
      createdAt: string;
    }>;
    nextCursor: string | null;
  }> {
    const retentionDays = await this.params.getInt("PM-37");
    const since = purgeBefore(retentionDays, new Date());
    const take = clampNotificationPageSize(limit);

    if (cursor) {
      const anchor = await this.prisma.notification.findFirst({
        where: { id: cursor, accountId, channel: "IN_APP" },
        select: { id: true },
      });
      if (!anchor) throw new BadRequestException("Curseur de pagination invalide");
    }

    const rows = await this.prisma.notification.findMany({
      where: { accountId, channel: "IN_APP", createdAt: { gte: since } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: take + 1, // +1 : détecte s'il reste une page
    });

    const page = rows.slice(0, take);
    const items = page.map((n) => {
      // Rendu au moment de la lecture — le catalogue (EF-14-03) reste la seule source du texte.
      const rendered = renderNotification(n.template, (n.payload ?? {}) as TemplatePayload);
      return {
        id: n.id,
        template: n.template,
        category: n.category, // EF-14-07 : regroupement par catégorie côté client
        priority: n.priority,
        title: rendered.title,
        body: rendered.body,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      };
    });
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
  }

  /**
   * Marque une notification comme lue — IDEMPOTENT et CONDITIONNEL (updateMany+count,
   * D-046) : déjà lue → succès sans effet ; inexistante ou pas à soi → 404 (français).
   */
  async markRead(accountId: string, notificationId: string): Promise<{ id: string; read: boolean }> {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, accountId, channel: "IN_APP", readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    if (res.count === 0) {
      const exists = await this.prisma.notification.findFirst({
        where: { id: notificationId, accountId, channel: "IN_APP" },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("Notification introuvable");
      // Déjà lue → idempotence (EF-14-07) : on confirme sans rien réécrire.
    }
    return { id: notificationId, read: true };
  }

  /**
   * Marque comme lues TOUTES les notifications in-app encore non lues — chantier 37, 03/09/2026.
   *
   * ── Pourquoi cette route existe ────────────────────────────────────────────────────────────
   *
   * Le centre in-app savait marquer UNE notification. Un soignant qui revient de congés en a
   * trente : sans cette route, le web aurait dû envoyer trente requêtes — trente occasions d'échec
   * partiel, et un badge qui descend par à-coups. Elle reflète `deleteManyMine`, qui existait déjà
   * pour la suppression groupée ; la lecture groupée manquait, sans raison.
   *
   * ── La fenêtre de rétention est celle du badge, volontairement ────────────────────────────
   *
   * On ne marque que ce qui entre dans PM-37 — c'est-à-dire **exactement ce que l'utilisateur peut
   * voir** dans sa liste et compter dans son badge. Marquer au-delà changerait des lignes qu'il n'a
   * jamais pu lire : « tout marquer comme lu » ne doit rien promettre de plus que « tout » à l'écran.
   *
   * Idempotent : rien à marquer renvoie `{ read: 0 }` et non une erreur — le geste a bien eu lieu.
   */
  async markAllRead(accountId: string): Promise<{ read: number }> {
    const retentionDays = await this.params.getInt("PM-37");
    const since = purgeBefore(retentionDays, new Date());
    const res = await this.prisma.notification.updateMany({
      where: { accountId, channel: "IN_APP", readAt: null, createdAt: { gte: since } },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return { read: res.count };
  }

  /** Suppression d'UNE notification in-app de l'utilisateur (cloisonné par accountId, RM-02-03). */
  async deleteMine(accountId: string, notificationId: string): Promise<{ id: string; deleted: boolean }> {
    const res = await this.prisma.notification.deleteMany({
      where: { id: notificationId, accountId, channel: "IN_APP" },
    });
    if (res.count === 0) throw new NotFoundException("Notification introuvable");
    return { id: notificationId, deleted: true };
  }

  /** Suppression groupée des notifications in-app de l'utilisateur (jamais celles d'un autre compte). */
  async deleteManyMine(accountId: string, ids: string[]): Promise<{ deleted: number }> {
    const res = await this.prisma.notification.deleteMany({
      where: { id: { in: ids }, accountId, channel: "IN_APP" },
    });
    return { deleted: res.count };
  }

  /** Badge non-lu (EF-14-07) — même fenêtre de rétention PM-37 que l'historique. */
  async unreadCount(accountId: string): Promise<{ unread: number }> {
    const retentionDays = await this.params.getInt("PM-37");
    const since = purgeBefore(retentionDays, new Date());
    const unread = await this.prisma.notification.count({
      where: { accountId, channel: "IN_APP", readAt: null, createdAt: { gte: since } },
    });
    return { unread };
  }

  // ── Préférences (EF-14-04 ; CU-14-03) ───────────────────────────────────────

  /**
   * Les catégories réglables, ACTIVES par défaut (aucune ligne = activé). "critical" est
   * toujours renvoyée active et non ajustable (RM-14-02) — même si une ligne parasite
   * prétendait le contraire, la sortie force enabled=true.
   *
   * ── Deux changements du 03/09/2026 (dette n°18) ─────────────────────────────────────────────
   *
   * **1. La réponse porte le texte.** `label` et `help` viennent de `CATEGORY_LABELS`, à côté du
   * catalogue qu'ils décrivent. Ils étaient auparavant écrits à la main dans le web ET dans le
   * mobile, et les deux avaient déjà divergé : « Service » d'un côté, « Système & compte » de
   * l'autre. Deux utilisateurs de la même plateforme ne lisaient pas le même nom pour le même
   * réglage.
   *
   * **2. On ne sert plus les 5 catégories, mais celles qui portent un modèle.** `reminder` est
   * déclarée depuis le début et **aucune notification ne l'a jamais portée** : son interrupteur ne
   * coupait rien. Le web l'avait retirée à la main au chantier 29, le mobile l'affichait encore.
   * `CATEGORIES_WITH_TEMPLATES` la retire des deux à la fois, en la COMPTANT — et la ramènera
   * d'elle-même le jour où un premier rappel sera écrit.
   *
   * ⚠️ `NOTIFICATION_CATEGORIES` reste le contrat de la BASE et de `setPreference` : on ne retire
   * pas une valeur qu'une ligne existante peut porter. C'est l'offre qui se restreint, pas le type.
   */
  async getPreferences(accountId: string): Promise<{
    preferences: Array<{ category: string; label: string; help: string; enabled: boolean; adjustable: boolean }>;
  }> {
    const rows = await this.prisma.notificationPreference.findMany({ where: { accountId } });
    const byCategory = new Map(rows.map((r) => [r.category, r.enabled]));
    return {
      preferences: CATEGORIES_WITH_TEMPLATES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category].label,
        help: CATEGORY_LABELS[category].help,
        enabled: category === "critical" ? true : (byCategory.get(category) ?? true),
        adjustable: isPreferenceAdjustable(category),
      })),
    };
  }

  /**
   * Active/désactive une catégorie (EF-14-04). Refus EXPLICITE pour "critical"
   * (RM-14-02) — expliqué honnêtement, comme dans l'interface (CU-14-03).
   */
  async setPreference(
    actor: AuthenticatedActor,
    category: NotificationCategory,
    enabled: boolean,
  ): Promise<{ category: string; enabled: boolean }> {
    if (!isPreferenceAdjustable(category)) {
      throw new BadRequestException(
        "Les notifications critiques (sécurité du compte, paiements, urgences) ne peuvent pas être désactivées (RM-14-02)",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationPreference.upsert({
        where: { accountId_category: { accountId: actor.accountId, category } },
        create: { accountId: actor.accountId, category, enabled },
        update: { enabled },
      });
      // C5 : trace du changement de préférence — dans la transaction.
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: auditActorTypeFor(actor.accountType),
        action: "m14.preference.updated",
        resource: `account:${actor.accountId}`,
        context: { category, enabled },
      });
    });
    return { category, enabled };
  }

  // ── Purge de rétention (PM-37) ──────────────────────────────────────────────

  /**
   * Supprime TOUTES les notifications (tous canaux) antérieures à la fenêtre PM-37.
   * Méthode PUBLIQUE volontairement non câblée : l'appel planifié viendra de M16/cron
   * (Chantier suivant) — PAS de nouveau poller ici (un seul drain par processus, M04).
   */
  async purgeExpired(now: Date = new Date()): Promise<{ deleted: number }> {
    const retentionDays = await this.params.getInt("PM-37");
    const cutoff = purgeBefore(retentionDays, now);
    const res = await this.prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: res.count };
  }
}
