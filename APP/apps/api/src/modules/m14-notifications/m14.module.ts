/**
 * M14 — Notifications & Rappels (MVP Chantier 2).
 * Spec : docs/cahier_des_charges/02_modules/M14_notifications_rappels.md
 * Consommateur C4 : s'abonne aux événements "notify.request" de l'outbox (EF-14-01) —
 * le RELAIS (drain) est déjà pollé par M04 (ADR-11) : AUCUN second poller ici.
 * Hors périmètre Chantier 2 : rappels de médicaments EF-14-05 (câblés au Chantier 4
 * avec M09), SMS de notification (V1, D-026), FCM réel (ADR-08 — DevPushGateway en dev).
 * Exporte NotificationsService — M16/cron appellera retryFailedCritical() (EF-14-08)
 * et purgeExpired() (PM-37) plus tard.
 */
import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M14Controller } from "./m14.controller";
import { DevicesService } from "./m14.devices.service";
import { DevPushGateway, PUSH_GATEWAY } from "./m14.push.gateway";
import { RemindersController } from "./m14.reminders.controller";
import { RemindersService } from "./m14.reminders.service";
import { NotificationsService } from "./m14.service";

@Module({
  controllers: [M14Controller, RemindersController],
  providers: [
    NotificationsService,
    RemindersService,
    DevicesService,
    DevPushGateway,
    // Passerelle locale au module — FCM réel derrière la même interface plus tard (ADR-08).
    { provide: PUSH_GATEWAY, useExisting: DevPushGateway },
  ],
  exports: [NotificationsService],
})
export class M14NotificationsModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    // EF-14-01 : réception des demandes C4. deliver() absorbe les anomalies « métier »
    // (compte inconnu, modèle inconnu) — seules les pannes techniques remontent,
    // et l'outbox rejouera (zéro perte, ADR-11 ; pas de pilule empoisonnée).
    this.outbox.on("notify.request", async (payload) => {
      await this.notifications.deliver(payload);
    });
  }
}
