/**
 * Chaîne d'empreintes du journal d'audit (EF-04-02, invariant n° 4 de la liste rouge).
 * hash(n) = sha256(prevHash | canonical(event))  — toute altération casse la chaîne.
 */
import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface ChainablePayload {
  actorId: string | null;
  actorType: string | null;
  action: string;
  resource: string | null;
  context: unknown;
  createdAtIso: string;
}

/** Sérialisation canonique : clés triées récursivement — indépendante de l'ordre d'insertion. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function computeEventHash(prevHash: string, payload: ChainablePayload): string {
  return createHash("sha256").update(prevHash).update("|").update(canonicalJson(payload)).digest("hex");
}

export interface StoredEvent extends ChainablePayload {
  prevHash: string;
  hash: string;
}

/** Vérifie l'intégrité d'une suite d'événements ordonnée. Retourne l'index du premier maillon cassé, ou -1. */
export function findChainBreak(events: StoredEvent[], expectedPrevOfFirst = GENESIS_HASH): number {
  let prev = expectedPrevOfFirst;
  for (let i = 0; i < events.length; i++) {
    const e = events[i] as StoredEvent;
    if (e.prevHash !== prev) return i;
    const recomputed = computeEventHash(e.prevHash, {
      actorId: e.actorId,
      actorType: e.actorType,
      action: e.action,
      resource: e.resource,
      context: e.context,
      createdAtIso: e.createdAtIso,
    });
    if (recomputed !== e.hash) return i;
    prev = e.hash;
  }
  return -1;
}
