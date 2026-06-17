/**
 * M14 — routes du centre de notifications (EF-14-04/07).
 * Toutes authentifiées par l'AuthGuard global (RM-02-03) — aucune route publique,
 * aucune route admin : chacun ne voit et ne gère que SES notifications.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { Actor } from "../../common/auth/actor.decorator";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { DeleteNotificationsDto, ListNotificationsQueryDto, RegisterDeviceDto, UpdatePreferenceDto } from "./m14.dto";
import { DevicesService } from "./m14.devices.service";
import { NotificationsService } from "./m14.service";

@Controller("v1/notifications")
export class M14Controller {
  constructor(
    private readonly service: NotificationsService,
    private readonly devices: DevicesService,
  ) {}

  // ── Centre in-app (EF-14-07) ───────────────────────────────────────────────

  /** Historique paginé, du plus récent au plus ancien — rétention PM-37 en filtre. */
  @Get("me")
  listMine(@Actor() actor: AuthenticatedActor, @Query() q: ListNotificationsQueryDto) {
    return this.service.listMine(actor.accountId, q.cursor, q.limit);
  }

  /** Badge non-lu (EF-14-07). */
  @Get("me/unread-count")
  unreadCount(@Actor() actor: AuthenticatedActor) {
    return this.service.unreadCount(actor.accountId);
  }

  /** Marque comme lue — idempotent et conditionnel (D-046). */
  @Post("me/:id/read")
  @HttpCode(200)
  markRead(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.service.markRead(actor.accountId, id);
  }

  /** Suppression groupée (route fixe AVANT la route :id pour éviter toute ambiguïté de routage). */
  @Delete("me")
  @HttpCode(200)
  deleteMany(@Actor() actor: AuthenticatedActor, @Body() dto: DeleteNotificationsDto) {
    return this.service.deleteManyMine(actor.accountId, dto.ids);
  }

  /** Suppression d'une notification (la sienne uniquement). */
  @Delete("me/:id")
  @HttpCode(200)
  deleteOne(@Actor() actor: AuthenticatedActor, @Param("id") id: string) {
    return this.service.deleteMine(actor.accountId, id);
  }

  // ── Préférences (EF-14-04 ; CU-14-03) ──────────────────────────────────────

  /** Les 5 catégories, défaut activé — "critical" non ajustable (RM-14-02). */
  @Get("me/preferences")
  getPreferences(@Actor() actor: AuthenticatedActor) {
    return this.service.getPreferences(actor.accountId);
  }

  /** Active/désactive une catégorie — refus explicite pour "critical" (RM-14-02). */
  @Put("me/preferences")
  setPreference(@Actor() actor: AuthenticatedActor, @Body() dto: UpdatePreferenceDto) {
    return this.service.setPreference(actor, dto.category, dto.enabled);
  }

  // ── Appareils push (EF-14-02) ──────────────────────────────────────────────

  /** Enregistre le jeton push de cet appareil (FCM/APNs) pour recevoir les notifications. */
  @Post("devices")
  @HttpCode(200)
  registerDevice(@Actor() actor: AuthenticatedActor, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(actor, dto.token, dto.platform);
  }

  /** Retire le jeton push de cet appareil. */
  @Delete("devices/:token")
  unregisterDevice(@Actor() actor: AuthenticatedActor, @Param("token") token: string) {
    return this.devices.unregister(actor, token);
  }
}
