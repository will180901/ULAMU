import { authReducer, AuthSession, AuthState, initialAuthState, isAuthenticated } from "./auth";

const session: AuthSession = { accountId: "acc-1", accountType: "PATIENT", sessionToken: "tok-xyz" };

describe("authReducer (machine d'états pure)", () => {
  it("RESTORED depuis le chargement : session → authentifié, null → anonyme", () => {
    expect(authReducer(initialAuthState, { type: "RESTORED", session })).toEqual({ status: "authenticated", session });
    expect(authReducer(initialAuthState, { type: "RESTORED", session: null })).toEqual({ status: "anonymous" });
  });

  it("AUTH_START depuis anonyme → authenticating ; ne perturbe pas un état déjà authentifié", () => {
    expect(authReducer({ status: "anonymous" }, { type: "AUTH_START" })).toEqual({ status: "authenticating" });
    const authed: AuthState = { status: "authenticated", session };
    expect(authReducer(authed, { type: "AUTH_START" })).toBe(authed);
  });

  it("AUTH_SUCCESS → authentifié ; AUTH_FAILURE et LOGOUT → anonyme", () => {
    expect(authReducer({ status: "authenticating" }, { type: "AUTH_SUCCESS", session })).toEqual({ status: "authenticated", session });
    expect(authReducer({ status: "authenticating" }, { type: "AUTH_FAILURE" })).toEqual({ status: "anonymous" });
    expect(authReducer({ status: "authenticated", session }, { type: "LOGOUT" })).toEqual({ status: "anonymous" });
  });

  it("isAuthenticated : garde de type fiable", () => {
    expect(isAuthenticated({ status: "authenticated", session })).toBe(true);
    expect(isAuthenticated({ status: "anonymous" })).toBe(false);
    expect(isAuthenticated(initialAuthState)).toBe(false);
  });
});
