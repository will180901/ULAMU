import { Module } from "@nestjs/common";
import { OtaController } from "./ota.controller";

/** OTA (#12) — manifeste + bundles de mise à jour JS de l'app mobile. */
@Module({ controllers: [OtaController] })
export class OtaModule {}
