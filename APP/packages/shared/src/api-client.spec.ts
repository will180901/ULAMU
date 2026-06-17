import { AUTH_ROUTES } from "@ulamu/contracts";
import { ApiClient, ApiError, codeFromStatus, firstMessage } from "./api-client";

/** Fabrique une fausse `Response` minimale (ce que le client lit : status, ok, text()). */
function fakeResponse(status: number, body?: unknown): Response {
  const text = body === undefined ? "" : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text } as unknown as Response;
}

describe("ApiClient", () => {
  it("POST requestOtp : bonne URL, bon corps, réponse typée", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse(200, { expiresInSeconds: 300 }));
    const client = new ApiClient({ baseUrl: "https://api.ulamu.cg/", fetchImpl: fetchImpl as unknown as typeof fetch });

    const res = await client.requestOtp({ phone: "+242061234567", purpose: "REGISTRATION" });

    expect(res.expiresInSeconds).toBe(300);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.ulamu.cg${AUTH_ROUTES.requestOtp}`); // slash final retiré
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ phone: "+242061234567", purpose: "REGISTRATION" });
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("injecte le Bearer quand auth=true et qu'un jeton existe", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse(200, { ok: true }));
    const client = new ApiClient({
      baseUrl: "https://api.ulamu.cg",
      getToken: () => "tok-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.request("GET", "/v1/accounts/me/sessions", undefined, true);
    expect(fetchImpl.mock.calls[0][1].headers["Authorization"]).toBe("Bearer tok-123");
  });

  it("n'injecte pas de Bearer pour une route publique (auth=false)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse(200, {}));
    const client = new ApiClient({ baseUrl: "https://api.ulamu.cg", getToken: () => "tok", fetchImpl: fetchImpl as unknown as typeof fetch });
    await client.login({ phone: "+242061234567", password: "motdepasse1", client: "mobile" });
    expect(fetchImpl.mock.calls[0][1].headers["Authorization"]).toBeUndefined();
  });

  it("mappe une erreur HTTP en ApiError typée (409 → CONFLICT, message du corps)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse(409, { statusCode: 409, message: "Numéro déjà utilisé" }));
    const client = new ApiClient({ baseUrl: "https://api.ulamu.cg", fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.requestOtp({ phone: "+242061234567", purpose: "REGISTRATION" })).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Numéro déjà utilisé",
    });
  });

  it("transforme une coupure réseau en ApiError NETWORK (jamais une exception brute)", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new ApiClient({ baseUrl: "https://api.ulamu.cg", fetchImpl: fetchImpl as unknown as typeof fetch });
    const err = await client.login({ phone: "+242061234567", password: "x", client: "mobile" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NETWORK");
  });

  it("gère un 204 sans corps (retourne undefined)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse(204));
    const client = new ApiClient({ baseUrl: "https://api.ulamu.cg", fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.request("DELETE", "/v1/accounts/me/sessions/abc", undefined, true)).resolves.toBeUndefined();
  });
});

describe("helpers d'erreur", () => {
  it("codeFromStatus", () => {
    expect(codeFromStatus(400)).toBe("BAD_REQUEST");
    expect(codeFromStatus(401)).toBe("UNAUTHORIZED");
    expect(codeFromStatus(403)).toBe("FORBIDDEN");
    expect(codeFromStatus(404)).toBe("NOT_FOUND");
    expect(codeFromStatus(409)).toBe("CONFLICT");
    expect(codeFromStatus(429)).toBe("RATE_LIMITED");
    expect(codeFromStatus(500)).toBe("UNKNOWN");
  });
  it("firstMessage prend le 1er élément d'une liste de validation", () => {
    expect(firstMessage({ statusCode: 400, message: ["Téléphone invalide", "Mot de passe court"] }, "x")).toBe("Téléphone invalide");
    expect(firstMessage({ statusCode: 400, message: "Erreur" }, "x")).toBe("Erreur");
    expect(firstMessage(undefined, "repli")).toBe("repli");
  });
});
