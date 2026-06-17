/**
 * M05 — Annuaire des Professionnels (MVP Chantier 3).
 * Spec : docs/cahier_des_charges/02_modules/M05_annuaire_professionnels.md
 *
 * La vitrine de l'offre de soin : profils publics vérifiés (RM-05-01), offres (PM-09/PM-06/PM-25),
 * présence temps réel (PM-26, RM-05-04), classement documenté JAMAIS vendu (RM-05-02), cloche (CU-05-05).
 *
 * Importe M03 (VerificationStatusService, C6) : la PUBLICATION d'offre exige « peut exercer »
 * (Badge Vérifié + contrat signé, D-029) — la vitrine, elle, lit la base directement (lecture seule).
 * Exporte OffersService et PresenceService → M06 (départ de la poignée de main, signatures imposées).
 *
 * NOTE : aucun second poller outbox ici — le relais est DÉJÀ assuré par M04 (ADR-11).
 */
import { Module, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../../common/outbox.service";
import { M03VerificationContractsModule } from "../m03-verification-contracts/m03.module";
import { M05Controller } from "./m05.controller";
import { DirectoryService } from "./m05.directory.service";
import { OffersService } from "./m05.offers.service";
import { PresenceService } from "./m05.presence.service";
import { StatsService } from "./m05.stats.service";

@Module({
  imports: [M03VerificationContractsModule],
  controllers: [M05Controller],
  providers: [OffersService, PresenceService, DirectoryService, StatsService],
  exports: [OffersService, PresenceService],
})
export class M05DirectoryModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly stats: StatsService,
  ) {}

  onModuleInit(): void {
    // EF-05-01 (spec §7 « Consomme ») : indicateurs alimentés par les événements de session M06.
    // Handlers BEST-EFFORT : ils ne jettent jamais (le drain commun ne doit pas se bloquer
    // sur un indicateur) ; un rejeu peut sur-compter à la marge — assumé (voir StatsService).
    this.outbox.on("m06.handshake.initiated", (p) => this.stats.onHandshakeInitiated(p));
    this.outbox.on("m06.handshake.confirmed", (p) => this.stats.onHandshakeConfirmed(p));
    this.outbox.on("m06.session.rated", (p) => this.stats.onSessionRated(p));
    this.outbox.on("m06.session.refunded", (p) => this.stats.onSessionRefunded(p));
  }
}
