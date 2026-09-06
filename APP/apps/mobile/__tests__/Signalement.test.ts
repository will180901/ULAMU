/**
 * @format
 * Signaler depuis l'application patient — chantier 59, 06/09/2026 (M04, EF-04-05 ; CU-04-03).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * `POST /v1/reports` existe depuis le premier jour et le web l'appelle depuis le chantier 41 ;
 * cette application, non. ⚠️ **Un patient n'avait aucun bouton pour signaler quoi que ce soit** —
 * pas une fonctionnalité manquante parmi d'autres, mais la voie de recours : toute la modération
 * était construite derrière, sans porte d'entrée côté patient.
 *
 * Trois choses sont figées ici, et chacune casserait le geste sans qu'aucun écran ne le montre :
 *
 *   1. **le chemin, la méthode et le jeton** — écrits en clair, jamais relus depuis la constante
 *      qu'ils sont censés vérifier (un test qui compare une valeur à elle-même ne prouve rien) ;
 *   2. **la liste des motifs est exactement celle du serveur** — un code inconnu part en 400, et un
 *      code oublié disparaît simplement de l'écran, sans erreur nulle part ;
 *   3. **on ne signale que les messages de l'autre** — se signaler soi-même n'a aucun sens.
 */
import {describe, expect, it} from '@jest/globals';
import {ApiClient} from '../src/lib/api-client';
import {MessageView, REPORT_REASON_CODES, REPORT_ROUTES, REPORT_TEXT_MAX} from '../src/lib/contracts';
import {MOTIFS_AFFICHES, peutSignalerMessage} from '../src/lib/signalement';

/** Le chemin tel que le serveur le sert (`@Post("reports")` derrière le préfixe `v1`). */
const CHEMIN_SERVI = '/v1/reports';

/**
 * Les six motifs du serveur, recopiés à la main depuis `m04.policies.ts` (`REPORT_REASON_CODES`).
 *
 * Recopier est ici le POINT du test : comparer notre liste à elle-même ne prouverait rien. Le jour
 * où le serveur en ajoute un septième, ce tableau devient faux — et c'est exactement le signal
 * qu'on veut, puisqu'un motif servi mais jamais offert n'est proposé à personne.
 */
const MOTIFS_DU_SERVEUR = [
  'INAPPROPRIATE_BEHAVIOR',
  'MISLEADING_INFORMATION',
  'SUSPECTED_FAKE_PROFILE',
  'HARASSMENT',
  'SPAM',
  'OTHER',
];

type Appel = {url: string; init: RequestInit};

function client(appels: Appel[], corps: unknown = {reportId: 'rep-1'}) {
  return new ApiClient({
    baseUrl: 'https://api.test',
    getToken: () => 'jeton-de-session',
    fetchImpl: (async (url: unknown, init: unknown) => {
      appels.push({url: String(url), init: init as RequestInit});
      return {ok: true, status: 200, text: async () => JSON.stringify(corps)} as Response;
    }) as unknown as typeof fetch,
  });
}

/** Un message minimal — seuls `senderId` et `deletedAt` décident du droit de signaler. */
function message(senderId: string, deletedAt: string | null = null): MessageView {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    senderId,
    kind: 'TEXT',
    body: 'bonjour',
    fileKey: null,
    mediaKeys: [],
    clientMsgId: 'c-1',
    createdAt: '2026-09-06T10:00:00.000Z',
    editedAt: null,
    deletedAt,
    replyTo: null,
    status: 'read',
    reactions: [],
  };
}

describe('createReport — le chemin et la preuve', () => {
  it('appelle exactement la route servie par l’API', () => {
    expect(REPORT_ROUTES.create).toBe(CHEMIN_SERVI);
  });

  it('POST authentifié, avec le type de cible, la cible et le code du motif', async () => {
    const appels: Appel[] = [];
    const res = await client(appels).createReport({
      targetType: 'PROFILE',
      targetId: 'acc-du-soignant',
      reasonCode: 'HARASSMENT',
      reasonText: 'messages répétés la nuit',
    });

    expect(res).toEqual({reportId: 'rep-1'});
    expect(appels).toHaveLength(1);
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_SERVI}`);
    expect(init.method).toBe('POST');
    // Sans le jeton, le serveur ne sait pas QUI signale — et la route exige une session.
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-session');
    expect(JSON.parse(String(init.body))).toEqual({
      targetType: 'PROFILE',
      targetId: 'acc-du-soignant',
      reasonCode: 'HARASSMENT',
      reasonText: 'messages répétés la nuit',
    });
  });

  /*
    Un `reasonText` vide n'est pas « pas de texte » : il serait stocké tel quel et l'équipe de
    modération lirait un champ présent et muet, au lieu de voir qu'il n'y a rien à lire.
  */
  it('n’envoie PAS de texte libre quand il n’y en a pas', async () => {
    const appels: Appel[] = [];
    await client(appels).createReport({
      targetType: 'SESSION_MESSAGE',
      targetId: 'msg-1',
      reasonCode: 'SPAM',
    });
    expect(JSON.parse(String(appels[0].init.body))).toEqual({
      targetType: 'SESSION_MESSAGE',
      targetId: 'msg-1',
      reasonCode: 'SPAM',
    });
    expect(Object.keys(JSON.parse(String(appels[0].init.body)))).not.toContain('reasonText');
  });
});

describe('Les motifs — liste fermée, partagée avec le serveur', () => {
  it('déclare exactement les six codes du serveur', () => {
    expect([...REPORT_REASON_CODES].sort()).toEqual([...MOTIFS_DU_SERVEUR].sort());
  });

  /*
    L'ordre d'AFFICHAGE diffère de l'ordre de déclaration (on lit du plus grave au plus anodin), mais
    aucun motif ne doit se perdre en route : un motif servi et jamais offert n'est proposé à personne.
  */
  it('les affiche tous, aucun oublié ni inventé', () => {
    expect([...MOTIFS_AFFICHES].sort()).toEqual([...REPORT_REASON_CODES].sort());
    expect(MOTIFS_AFFICHES).toHaveLength(6);
  });

  it('ouvre sur le plus grave et ferme sur « Autre »', () => {
    expect(MOTIFS_AFFICHES[0]).toBe('HARASSMENT');
    expect(MOTIFS_AFFICHES[MOTIFS_AFFICHES.length - 1]).toBe('OTHER');
  });

  it('annonce le même plafond de texte que le serveur (@MaxLength(1000))', () => {
    expect(REPORT_TEXT_MAX).toBe(1000);
  });
});

describe('Quels messages on peut signaler', () => {
  const MOI = 'moi';

  it('celui de l’autre : oui', () => {
    expect(peutSignalerMessage(message('le-soignant'), MOI)).toBe(true);
  });

  it('le mien : non — se signaler soi-même n’a aucun sens', () => {
    expect(peutSignalerMessage(message(MOI), MOI)).toBe(false);
  });

  it('un message supprimé : non — il n’y a plus rien à examiner', () => {
    expect(peutSignalerMessage(message('le-soignant', '2026-09-06T11:00:00.000Z'), MOI)).toBe(false);
  });

  it('aucun message sélectionné : non', () => {
    expect(peutSignalerMessage(null, MOI)).toBe(false);
  });
});
