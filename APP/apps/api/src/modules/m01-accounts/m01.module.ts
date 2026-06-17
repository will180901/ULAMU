import { Module } from "@nestjs/common";
import { M01Controller } from "./m01.controller";
import { M01Service } from "./m01.service";

/** M01 — Comptes & Authentification (MVP Chantier 1). */
@Module({
  controllers: [M01Controller],
  providers: [M01Service],
  exports: [M01Service],
})
export class M01AccountsModule {}
