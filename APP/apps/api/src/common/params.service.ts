/**
 * Référentiel des paramètres métier PM-xx — la SEULE source des chiffres du métier (RT §3).
 * Valeurs en base (PlatformParameter, seedées), cache mémoire 60 s.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

const CACHE_TTL_MS = 60_000;

@Injectable()
export class ParamsService {
  private cache = new Map<string, { value: string; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const row = await this.prisma.platformParameter.findUnique({ where: { key } });
    if (!row) throw new Error(`Paramètre métier absent : ${key} — seed manquant ?`);
    this.cache.set(key, { value: row.value, at: Date.now() });
    return row.value;
  }

  async getInt(key: string): Promise<number> {
    const v = Number(await this.get(key));
    if (!Number.isFinite(v)) throw new Error(`Paramètre ${key} non numérique`);
    return v;
  }

  /** Pour les paramètres composés type "5,900,900" (PM-18) ou "10,60" (PM-09). */
  async getIntList(key: string): Promise<number[]> {
    return (await this.get(key)).split(",").map((s) => {
      const n = Number(s.trim());
      if (!Number.isFinite(n)) throw new Error(`Paramètre ${key} : segment non numérique`);
      return n;
    });
  }

  /** Tests/outils : invalide le cache. */
  clearCache(): void {
    this.cache.clear();
  }
}
