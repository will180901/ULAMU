/**
 * Tests des règles M04 — EF-04-02 (chaînage), EF-04-06 (issues), PM-23 (délai cible),
 * RM-04-04 (anonymat du signaleur), EF-04-04 (pagination).
 */
import { ChainablePayload, findChainBreak, GENESIS_HASH, StoredEvent } from "../../common/crypto/hash-chain";
import {
  AUDIT_QUERY_DEFAULT_PAGE_SIZE,
  AUDIT_QUERY_MAX_PAGE_SIZE,
  auditActorType,
  chainEvent,
  clampAuditPageSize,
  isReportOverdue,
  mapDecisionToStatus,
  redactReportForAdmin,
} from "./m04.policies";

describe("Issue d'un signalement (EF-04-06, CU-04-04)", () => {
  it.each([
    ["DISMISSED", "DISMISSED"],
    ["WARNING", "ACTION_TAKEN"],
    ["ESCALATED_M16", "ACTION_TAKEN"],
    ["ESCALATED_M03", "ACTION_TAKEN"],
  ] as const)("%s → statut %s", (decision, status) => {
    expect(mapDecisionToStatus(decision)).toBe(status);
  });
});

describe("Délai cible de traitement (PM-23, CU-04-04)", () => {
  const now = Date.parse("2026-06-12T12:00:00Z");
  const SLA_HOURS = 48; // valeur seedée de PM-23 — passée en paramètre, jamais en dur dans le service
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);

  it("47 h → dans les délais", () => {
    expect(isReportOverdue(hoursAgo(47), now, SLA_HOURS)).toBe(false);
  });
  it("exactement 48 h → encore dans les délais (dépassement strict)", () => {
    expect(isReportOverdue(hoursAgo(48), now, SLA_HOURS)).toBe(false);
  });
  it("49 h → dépassé (alerte au Super Admin, CU-04-04)", () => {
    expect(isReportOverdue(hoursAgo(49), now, SLA_HOURS)).toBe(true);
  });
});

describe("Anonymat du signaleur (RM-04-04, EF-04-07)", () => {
  it("redactReportForAdmin retire reporterId et conserve tout le reste", () => {
    const redacted = redactReportForAdmin({
      id: "r-1",
      reporterId: "compte-secret",
      targetType: "PROFILE",
      targetId: "t-1",
      reasonCode: "SPAM",
      reasonText: null,
      status: "OPEN",
    });
    expect("reporterId" in redacted).toBe(false);
    expect(redacted).toEqual({
      id: "r-1",
      targetType: "PROFILE",
      targetId: "t-1",
      reasonCode: "SPAM",
      reasonText: null,
      status: "OPEN",
    });
  });
});

describe("Chaînage du journal de bout en bout (EF-04-02 — logique d'append)", () => {
  const payloadAt = (i: number): ChainablePayload => ({
    actorId: i % 2 === 0 ? `account-${i}` : null,
    actorType: "admin",
    action: `m04.test.event_${i}`,
    resource: `res:${i}`,
    context: { index: i, nested: { ok: true } },
    createdAtIso: new Date(Date.parse("2026-06-12T08:00:00Z") + i * 1000).toISOString(),
  });

  /** Reproduit AuditChainService.append sur un journal en mémoire (mêmes primitives). */
  function appendInMemory(journal: StoredEvent[], payload: ChainablePayload): void {
    const last = journal.length > 0 ? journal[journal.length - 1] : undefined;
    const { prevHash, hash } = chainEvent(last ? last.hash : null, payload);
    journal.push({ ...payload, prevHash, hash });
  }

  function buildJournal(size: number): StoredEvent[] {
    const journal: StoredEvent[] = [];
    for (let i = 0; i < size; i++) appendInMemory(journal, payloadAt(i));
    return journal;
  }

  it("le premier maillon part de GENESIS_HASH", () => {
    const journal = buildJournal(1);
    expect(journal[0].prevHash).toBe(GENESIS_HASH);
  });

  it("appends séquentiels → chaîne intacte (findChainBreak === -1)", () => {
    expect(findChainBreak(buildJournal(8))).toBe(-1);
  });

  it("altération du contexte d'un maillon → rupture détectée à son index (RM-04-01)", () => {
    const journal = buildJournal(8);
    journal[3].context = { index: 3, nested: { ok: false } }; // falsification
    expect(findChainBreak(journal)).toBe(3);
  });

  it("altération de l'horodatage → rupture détectée (l'horodatage est haché)", () => {
    const journal = buildJournal(5);
    journal[2].createdAtIso = "2026-06-12T09:59:59.000Z";
    expect(findChainBreak(journal)).toBe(2);
  });

  it("suppression d'un maillon → rupture détectée (RM-04-01 : ni suppression, ni modification)", () => {
    const journal = buildJournal(8);
    journal.splice(2, 1);
    expect(findChainBreak(journal)).toBe(2);
  });

  it("vérification d'un segment (fromSeq) : prevHash attendu = empreinte du maillon précédent", () => {
    const journal = buildJournal(8);
    const segment = journal.slice(4);
    expect(findChainBreak(segment, journal[3].hash)).toBe(-1);
    // mauvais point de départ → rupture immédiate
    expect(findChainBreak(segment, GENESIS_HASH)).toBe(0);
  });
});

describe("Pagination de la consultation (EF-04-04)", () => {
  it("borne haute : jamais plus que AUDIT_QUERY_MAX_PAGE_SIZE (200)", () => {
    expect(clampAuditPageSize(10_000)).toBe(AUDIT_QUERY_MAX_PAGE_SIZE);
  });
  it("défaut quand absent", () => {
    expect(clampAuditPageSize(undefined)).toBe(AUDIT_QUERY_DEFAULT_PAGE_SIZE);
  });
  it("plancher à 1", () => {
    expect(clampAuditPageSize(0)).toBe(1);
  });
});

describe("Type d'acteur C5 (AccountType → actorType)", () => {
  it.each([
    ["PATIENT", "patient"],
    ["PROFESSIONAL", "professional"],
    ["FACILITY_MEMBER", "facility_member"],
    ["ADMIN", "admin"],
    ["AUTRE_CHOSE", "system"],
  ] as const)("%s → %s", (accountType, actorType) => {
    expect(auditActorType(accountType)).toBe(actorType);
  });
});
