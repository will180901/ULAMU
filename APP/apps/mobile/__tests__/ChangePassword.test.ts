/**
 * @format
 * Changer son mot de passe depuis l'application — chantier 58, 06/09/2026 (CU-01-04).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * `POST /v1/accounts/me/password` existait depuis le premier jour et le WEB l'appelait ; cette
 * application, non. Un patient qui soupçonnait son mot de passe connu n'avait qu'un détour : se
 * déconnecter, puis « mot de passe oublié », et attendre un code par email.
 *
 * ⚠️ C'est l'inverse du bon geste : se déconnecter volontairement quand on craint que quelqu'un
 * d'autre soit dans son compte, c'est lâcher le seul accès dont on est sûr.
 *
 * Trois choses sont figées ici, et chacune casserait le geste en silence :
 *
 *   1. **le chemin exact servi par l'API** — il est écrit en clair, jamais relu depuis la constante
 *      qu'il est censé vérifier (un test qui compare une valeur à elle-même ne prouve rien) ;
 *   2. **le jeton de session part** — sans lui la requête revient en 401, et le client se
 *      déconnecte : l'utilisateur serait mis dehors en tentant de se protéger ;
 *   3. **le mot de passe ne se retrouve ni dans l'URL ni dans un `GET`** — il ne voyage que dans le
 *      corps d'un POST.
 */
import {describe, expect, it, jest} from '@jest/globals';
import {ApiClient, ApiError} from '../src/lib/api-client';
import {ACCOUNT_ROUTES} from '../src/lib/contracts';

/** Le chemin tel que le serveur le sert (`@Post("accounts/me/password")` derrière le préfixe `v1`). */
const CHEMIN_SERVI = '/v1/accounts/me/password';

type Appel = {url: string; init: RequestInit};

function client(reponse: {status: number; corps: unknown}, appels: Appel[]) {
  const fetchImpl = jest.fn(async (url: unknown, init: unknown) => {
    appels.push({url: String(url), init: init as RequestInit});
    return {
      ok: reponse.status < 400,
      status: reponse.status,
      text: async () => JSON.stringify(reponse.corps),
    } as Response;
  });
  return new ApiClient({
    baseUrl: 'https://api.test',
    getToken: () => 'jeton-de-session',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

describe('changePassword — le chemin et la preuve', () => {
  it('appelle exactement la route servie par l’API', () => {
    expect(ACCOUNT_ROUTES.password).toBe(CHEMIN_SERVI);
  });

  it('POST, jeton de session, et les deux mots de passe dans le CORPS', async () => {
    const appels: Appel[] = [];
    const api = client({status: 200, corps: {otherSessionsClosed: 3}}, appels);

    const res = await api.changePassword({currentPassword: 'ancien-mdp1', newPassword: 'nouveau-mdp1'});

    expect(res).toEqual({otherSessionsClosed: 3});
    expect(appels).toHaveLength(1);
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_SERVI}`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-session');
    expect(JSON.parse(String(init.body))).toEqual({currentPassword: 'ancien-mdp1', newPassword: 'nouveau-mdp1'});
    // Un mot de passe dans l'URL finirait dans les journaux du serveur et l'historique du téléphone.
    expect(url).not.toContain('ancien-mdp1');
    expect(url).not.toContain('nouveau-mdp1');
  });

  /*
    Le serveur répond 403 — et non 401 — quand le mot de passe ACTUEL est faux (chantier 58, côté
    API). C'est ce qui permet à l'application d'AFFICHER l'erreur au lieu de déconnecter : un 401 sur
    une requête authentifiée déclenche `onUnauthorized`, qui efface la session.
  */
  it('un mot de passe actuel faux remonte comme une erreur affichable, sans déconnecter', async () => {
    const appels: Appel[] = [];
    const deconnexions = jest.fn();
    const api = new ApiClient({
      baseUrl: 'https://api.test',
      getToken: () => 'jeton-de-session',
      onUnauthorized: deconnexions,
      fetchImpl: (async (url: unknown, init: unknown) => {
        appels.push({url: String(url), init: init as RequestInit});
        return {
          ok: false,
          status: 403,
          text: async () => JSON.stringify({statusCode: 403, message: 'Mot de passe actuel incorrect'}),
        } as Response;
      }) as unknown as typeof fetch,
    });

    await expect(api.changePassword({currentPassword: 'faux', newPassword: 'nouveau-mdp1'})).rejects.toBeInstanceOf(ApiError);
    await expect(api.changePassword({currentPassword: 'faux', newPassword: 'nouveau-mdp1'})).rejects.toThrow(
      'Mot de passe actuel incorrect',
    );
    expect(deconnexions).not.toHaveBeenCalled();
  });
});
