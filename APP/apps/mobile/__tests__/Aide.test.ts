/**
 * @format
 * Écrire à l'administration depuis l'application — chantier 61, 07/09/2026 (M16, CU-16-04).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * Les deux routes existent depuis le 01/09 et le web les appelle ; cette application, non — **un
 * patient n'avait aucun moyen d'écrire à qui que ce soit.** Et il n'y avait rien à trouver en
 * sortant de l'application : `support@ulamu.cg` porte un domaine qui n'appartient pas au projet,
 * pourtant inscrit dans les mentions légales acceptées à l'inscription.
 *
 * Quatre choses sont figées ici :
 *
 *   1. **les deux chemins exacts** — écrire, et RELIRE. Le second fait toute la différence avec
 *      l'adresse morte : un formulaire qui envoie sans rien rendre est pire, car on ne sait même
 *      pas qu'on n'a pas eu de réponse ;
 *   2. **le jeton part** — la route exige une session, et c'est voulu ;
 *   3. **la borne du serveur est connue AVANT d'écrire** — pas apprise par un refus ;
 *   4. **le sujet « titulaire de structure injoignable » n'est pas offert** — plus personne ne peut
 *      avoir ce problème depuis D-051, et une case qui mène à une file morte est une promesse de
 *      réponse qu'on ne tiendra pas.
 */
import {describe, expect, it} from '@jest/globals';
import {ApiClient} from '../src/lib/api-client';
import {SUPPORT_BODY_MAX, SUPPORT_BODY_MIN, SUPPORT_ROUTES, SupportRequestView} from '../src/lib/contracts';
import {demandeEnvoyable, libelleSujet, SUJETS_OFFERTS} from '../src/lib/support';

/** Les chemins tels que le serveur les sert (`@Post("support-requests")`, `@Get(".../mine")`). */
const CHEMIN_ECRIRE = '/v1/support-requests';
const CHEMIN_RELIRE = '/v1/support-requests/mine';

type Appel = {url: string; init: RequestInit};

function client(appels: Appel[], corps: unknown) {
  return new ApiClient({
    baseUrl: 'https://api.test',
    getToken: () => 'jeton-de-session',
    fetchImpl: (async (url: unknown, init: unknown) => {
      appels.push({url: String(url), init: init as RequestInit});
      return {ok: true, status: 200, text: async () => JSON.stringify(corps)} as Response;
    }) as unknown as typeof fetch,
  });
}

const REPONDUE: SupportRequestView = {
  id: 'req-1',
  subject: 'PHONE_CHANGE',
  body: 'J’ai perdu mon téléphone et je ne peux plus recevoir le code.',
  status: 'ANSWERED',
  createdAt: '2026-09-01T08:00:00.000Z',
  answer: 'Passez au guichet avec votre pièce d’identité.',
  answeredAt: '2026-09-02T09:30:00.000Z',
};

describe('Écrire à l’administration — les deux chemins', () => {
  it('appelle exactement les routes servies par l’API', () => {
    expect(SUPPORT_ROUTES.create).toBe(CHEMIN_ECRIRE);
    expect(SUPPORT_ROUTES.mine).toBe(CHEMIN_RELIRE);
  });

  it('POST authentifié, avec le sujet et le texte', async () => {
    const appels: Appel[] = [];
    const res = await client(appels, {requestId: 'req-9'}).createSupportRequest({
      subject: 'PHONE_CHANGE',
      body: 'J’ai perdu mon téléphone et je ne peux plus recevoir le code.',
    });

    expect(res).toEqual({requestId: 'req-9'});
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_ECRIRE}`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-session');
    expect(JSON.parse(String(init.body))).toEqual({
      subject: 'PHONE_CHANGE',
      body: 'J’ai perdu mon téléphone et je ne peux plus recevoir le code.',
    });
  });

  /*
    LE chemin qui distingue ce formulaire de l'adresse morte qu'il remplace. Sans lui, on envoie
    dans le vide — et on ne sait même pas qu'on n'a pas eu de réponse.
  */
  it('relit ses demandes ET leurs réponses, avec le jeton', async () => {
    const appels: Appel[] = [];
    const res = await client(appels, [REPONDUE]).mySupportRequests();

    expect(res).toEqual([REPONDUE]);
    expect(res[0].answer).toBe('Passez au guichet avec votre pièce d’identité.');
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_RELIRE}`);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-session');
    // Jamais de corps sur un GET — l'API le refuserait.
    expect(init.body).toBeUndefined();
  });
});

describe('Ce que l’écran sait avant d’envoyer', () => {
  it('connaît les bornes du serveur (@MinLength(10) @MaxLength(2000))', () => {
    expect(SUPPORT_BODY_MIN).toBe(10);
    expect(SUPPORT_BODY_MAX).toBe(2000);
  });

  it('refuse un texte trop court, sans aller le faire refuser par le réseau', () => {
    expect(demandeEnvoyable('trop court')).toBe(true); // 10 caractères pile
    expect(demandeEnvoyable('court')).toBe(false);
    expect(demandeEnvoyable('   ')).toBe(false);
    // Les espaces autour ne comptent pas : le serveur reçoit le texte élagué.
    expect(demandeEnvoyable('   court   ')).toBe(false);
  });

  it('refuse au-delà du plafond', () => {
    expect(demandeEnvoyable('a'.repeat(SUPPORT_BODY_MAX))).toBe(true);
    expect(demandeEnvoyable('a'.repeat(SUPPORT_BODY_MAX + 1))).toBe(false);
  });
});

describe('Les sujets offerts', () => {
  /*
    ULAMU compte trois acteurs depuis D-051 : personne n'administre plus de structure, donc personne
    ne peut avoir ce problème — et la procédure guidée qui le traitait a été retirée le même jour.
    Offrir la case déposerait une demande qu'aucun administrateur ne saurait traiter.
  */
  it('n’offre PAS « titulaire de structure injoignable »', () => {
    expect(SUJETS_OFFERTS.map(s => s.cle)).not.toContain('OWNER_UNREACHABLE');
  });

  it('offre les trois autres, « Autre » en dernier', () => {
    expect(SUJETS_OFFERTS.map(s => s.cle)).toEqual(['PHONE_CHANGE', 'RECORD_TRANSFER', 'OTHER']);
  });

  /*
    On cesse de l'offrir, on ne l'efface pas : des demandes déposées avant le 02/09 le portent, et
    elles s'affichent dans « Mes demandes ». Sans libellé, elles montreraient un code technique.
  */
  it('sait quand même nommer un sujet qu’on n’offre plus', () => {
    expect(libelleSujet('OWNER_UNREACHABLE')).toBe('Ma structure · titulaire injoignable');
    expect(libelleSujet('PHONE_CHANGE')).toBe('J’ai perdu mon numéro');
  });
});
