/**
 * OTA (#12) — sert le manifeste de mise à jour JS de l'app mobile + les bundles publiés.
 * Routes PUBLIQUES (AuthGuard global → @Public). Les fichiers vivent dans apps/api/ota/ (versionnés au dépôt) :
 *  - manifest.json : { version, url }  (version 0 = aucune MAJ → l'app garde son bundle embarqué) ;
 *  - bundles publiés : ota/bundle-vN.zip, exposés via GET /ota/android/bundle/:file (anti-traversal).
 * Publier une MAJ = ajouter le zip + bumper la version dans manifest.json + push (Render redéploie).
 */
import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { Public } from "../../common/auth/auth.guard";

const OTA_DIR = join(process.cwd(), "ota");

@Controller("ota/android")
export class OtaController {
  /** Manifeste de mise à jour JS (consulté par l'app au démarrage). */
  @Public()
  @Get("manifest")
  manifest(): { version: number; url: string } {
    const file = join(OTA_DIR, "manifest.json");
    if (!existsSync(file)) {
      return { version: 0, url: "" };
    }
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      return { version: Number(parsed.version) || 0, url: typeof parsed.url === "string" ? parsed.url : "" };
    } catch {
      return { version: 0, url: "" };
    }
  }

  /** Sert un bundle OTA publié (zip). Anti-traversal : on reste sous OTA_DIR. */
  @Public()
  @Get("bundle/:file")
  bundle(@Param("file") file: string, @Res() res: Response): void {
    const safe = normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = join(OTA_DIR, safe);
    if (!full.startsWith(OTA_DIR + sep) || !existsSync(full)) {
      throw new NotFoundException("Bundle introuvable");
    }
    res.sendFile(full);
  }
}
