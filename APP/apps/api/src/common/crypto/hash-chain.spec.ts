import { GENESIS_HASH, canonicalJson, computeEventHash, findChainBreak, StoredEvent } from "./hash-chain";

function buildChain(actions: string[]): StoredEvent[] {
  let prev = GENESIS_HASH;
  return actions.map((action, i) => {
    const payload = {
      actorId: "admin-1",
      actorType: "admin",
      action,
      resource: `res:${i}`,
      context: { index: i },
      createdAtIso: `2026-06-11T10:0${i}:00.000Z`,
    };
    const hash = computeEventHash(prev, payload);
    const event: StoredEvent = { ...payload, prevHash: prev, hash };
    prev = hash;
    return event;
  });
}

describe("Chaîne d'audit (EF-04-02)", () => {
  it("une chaîne intacte est valide", () => {
    expect(findChainBreak(buildChain(["a", "b", "c", "d"]))).toBe(-1);
  });

  it("toute altération de contenu est détectée", () => {
    const chain = buildChain(["a", "b", "c"]);
    (chain[1] as StoredEvent).action = "b-falsifié";
    expect(findChainBreak(chain)).toBe(1);
  });

  it("toute suppression d'un maillon est détectée", () => {
    const chain = buildChain(["a", "b", "c"]);
    chain.splice(1, 1);
    expect(findChainBreak(chain)).toBe(1);
  });

  it("la sérialisation canonique ignore l'ordre des clés", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, null] } })).toBe(canonicalJson({ a: { c: [3, null], d: 2 }, b: 1 }));
  });
});
