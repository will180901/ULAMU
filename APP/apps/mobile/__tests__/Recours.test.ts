/**
 * @format
 * Le recours d'un compte exclu — chantier 63, 07/09/2026 (CU-16-04, loi n° 29-2019).
 *
 * ── Le défaut réparé ──────────────────────────────────────────────────────────────────────────
 *
 * Un compte suspendu reçoit *« Contactez le support pour connaître le motif et les voies de
 * recours »*, et un compte clôturé lit *« contactez le support »* à la connexion. Mais la garde
 * refuse **chacune** de leurs requêtes, la seule voie de support exigeait une session, et l'adresse
 * des mentions légales n'existe pas.
 *
 * ⚠️ Une personne exclue était invitée **par écrit** à exercer un recours qu'aucun chemin ne lui
 * permettait d'exercer.
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 *   1. **la porte s'ouvre au bon moment** — sur un refus qui vient du COMPTE (403), jamais sur un
 *      mot de passe faux (401) ni sur un réseau coupé ;
 *   2. **la demande part SANS jeton** — la personne n'en a pas, c'est tout le problème ;
 *   3. **le code demandé porte l'usage dédié** — partagé avec « mot de passe oublié », une demande
 *      de support mangerait le code de réinitialisation (quota PM-19 compté par usage).
 */
import {describe, expect, it} from '@jest/globals';
import {ApiClient, ApiError} from '../src/lib/api-client';
import {SUPPORT_ROUTES} from '../src/lib/contracts';
import {proposerLeRecours} from '../src/lib/recours';

/** Le chemin tel que le serveur le sert (`@Public() @Post("support-requests/public")`). */
const CHEMIN_PUBLIC = '/v1/support-requests/public';

type Appel = {url: string; init: RequestInit};

function client(appels: Appel[], corps: unknown) {
  return new ApiClient({
    baseUrl: 'https://api.test',
    // Un jeton EXISTE dans ce double : on veut prouver que le client ne l'envoie pas quand même.
    getToken: () => 'un-jeton-qui-ne-doit-pas-partir',
    fetchImpl: (async (url: unknown, init: unknown) => {
      appels.push({url: String(url), init: init as RequestInit});
      return {ok: true, status: 200, text: async () => JSON.stringify(corps)} as Response;
    }) as unknown as typeof fetch,
  });
}

describe('Quand proposer le recours', () => {
  /*
    Le signal est le STATUT, jamais le message français : une reformulation le ferait dériver en
    silence, et ce serait le recours qui disparaîtrait sans que rien ne le signale.
  */
  it('sur un compte suspendu ou clôturé — le serveur répond 403', () => {
    expect(proposerLeRecours(new ApiError(403, 'FORBIDDEN', 'Compte suspendu (RM-01-05)'))).toBe(true);
    expect(proposerLeRecours(new ApiError(403, 'FORBIDDEN', 'Compte clôturé — contactez le support (PM-21)'))).toBe(true);
  });

  it('PAS sur un mot de passe faux — celui-là se retape', () => {
    expect(proposerLeRecours(new ApiError(401, 'UNAUTHORIZED', 'Identifiants incorrects'))).toBe(false);
  });

  it('PAS sur un réseau coupé ni sur une limite de débit', () => {
    expect(proposerLeRecours(new ApiError(0, 'NETWORK', 'Connexion impossible'))).toBe(false);
    expect(proposerLeRecours(new ApiError(429, 'RATE_LIMITED', 'Trop de tentatives'))).toBe(false);
    expect(proposerLeRecours(new Error('autre chose'))).toBe(false);
    expect(proposerLeRecours(null)).toBe(false);
  });
});

describe('Écrire sans session', () => {
  it('appelle exactement la route publique servie par l’API', () => {
    expect(SUPPORT_ROUTES.public).toBe(CHEMIN_PUBLIC);
  });

  /*
    ⚠️ SANS jeton — et le double en fournit un exprès. La personne qui emprunte ce chemin n'a pas de
    session : en envoyer un serait au mieux inutile, au pire le signe qu'on a délivré un jeton à un
    compte suspendu.
  */
  it('envoie l’adresse, le code et la demande — jamais de jeton', async () => {
    const appels: Appel[] = [];
    const res = await client(appels, {requestId: 'req-7'}).createSupportRequestWithoutSession({
      email: 'titulaire@exemple.cg',
      otpCode: '123456',
      subject: 'OTHER',
      body: 'Mon compte est suspendu et je ne comprends pas pourquoi.',
    });

    expect(res).toEqual({requestId: 'req-7'});
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_PUBLIC}`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'titulaire@exemple.cg',
      otpCode: '123456',
      subject: 'OTHER',
      body: 'Mon compte est suspendu et je ne comprends pas pourquoi.',
    });
  });

  /*
    L'usage DÉDIÉ est ce qui empêche une demande de support de manger le code de réinitialisation que
    la personne venait de demander — `consumeOtpOrThrow` cherche le dernier code non consommé POUR
    CET USAGE, et le quota PM-19 est compté par usage.
  */
  it('demande un code avec l’usage dédié au support', async () => {
    const appels: Appel[] = [];
    await client(appels, {expiresInSeconds: 300}).requestOtp({
      email: 'titulaire@exemple.cg',
      purpose: 'SUPPORT_ACCESS',
    });

    expect(JSON.parse(String(appels[0].init.body))).toEqual({
      email: 'titulaire@exemple.cg',
      purpose: 'SUPPORT_ACCESS',
    });
  });
});
