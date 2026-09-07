/**
 * @format
 * Les documents acceptés à l'inscription — chantier 62, 07/09/2026 (EF-01-08, loi n° 29-2019).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **L'application faisait accepter des documents qu'elle ne montrait pas.** La case
 * d'inscription disait *« J'accepte que mes données de santé soient chiffrées et accessibles aux
 * seuls soignants que je consulte »* — une phrase sur le chiffrement. Sur la foi de cette case, le
 * serveur enregistrait un consentement aux **CGU** et à la **politique de confidentialité**, ligne
 * que le modèle qualifie de *preuve légale, immuable*.
 *
 * Une preuve fabriquée à partir d'une case qui ne nomme pas ce qu'elle prouve ne prouve rien.
 *
 * Deux choses sont figées ici :
 *
 *   1. **les textes viennent du SERVEUR, sans jeton** — on les lit au moment où l'on décide de les
 *      accepter, donc avant d'avoir un compte. Les recopier dans l'application les ferait changer
 *      sans que la version bouge, et les consentements passés désigneraient alors un texte qui
 *      n'est plus celui qu'on a lu ;
 *   2. **la preuve se relit AVEC le jeton** — c'est celle de cette personne, pas un texte public.
 */
import {describe, expect, it} from '@jest/globals';
import {ApiClient} from '../src/lib/api-client';
import {ConsentRecordView, LegalDocument, LEGAL_ROUTES} from '../src/lib/contracts';

/** Les chemins tels que le serveur les sert. */
const CHEMIN_DOCUMENTS = '/v1/legal/documents';
const CHEMIN_CONSENTEMENTS = '/v1/accounts/me/consents';

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

const DOCUMENTS: LegalDocument[] = [
  {type: 'CGU', version: '1.0', title: "Conditions générales d'utilisation", paragraphs: ['Texte des CGU.']},
  {type: 'PRIVACY', version: '1.0', title: 'Politique de confidentialité', paragraphs: ['Texte de la politique.']},
];

const MES_CONSENTEMENTS: ConsentRecordView[] = [
  {documentType: 'CGU', documentVersion: '1.0', acceptedAt: '2026-03-12T10:00:00.000Z'},
  {documentType: 'PRIVACY', documentVersion: '1.0', acceptedAt: '2026-03-12T10:00:00.000Z'},
];

describe('Les textes légaux — servis, jamais recopiés', () => {
  it('appelle exactement les routes servies par l’API', () => {
    expect(LEGAL_ROUTES.documents).toBe(CHEMIN_DOCUMENTS);
    expect(LEGAL_ROUTES.myConsents).toBe(CHEMIN_CONSENTEMENTS);
  });

  /*
    SANS jeton, et c'est le point : on lit ces documents au moment où l'on décide de les accepter —
    donc pendant l'inscription, avant d'avoir le moindre compte. Exiger une session rendrait la
    lecture impossible précisément quand elle compte.
  */
  it('lit les documents SANS jeton — on les lit avant d’avoir un compte', async () => {
    const appels: Appel[] = [];
    const res = await client(appels, {documents: DOCUMENTS}).legalDocuments();

    expect(res.documents).toEqual(DOCUMENTS);
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_DOCUMENTS}`);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('rapporte le titre, la version et le texte de chaque document', async () => {
    const res = await client([], {documents: DOCUMENTS}).legalDocuments();
    expect(res.documents.map(d => d.type)).toEqual(['CGU', 'PRIVACY']);
    for (const d of res.documents) {
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.version.length).toBeGreaterThan(0);
      expect(d.paragraphs.length).toBeGreaterThan(0);
    }
  });
});

describe('La preuve — celle de cette personne', () => {
  /*
    AVEC jeton : ce n'est pas un texte public, c'est ce que CETTE personne a accepté et quand. Sans
    en-tête d'autorisation, le serveur ne saurait pas de qui l'on parle.
  */
  it('relit ses consentements AVEC le jeton', async () => {
    const appels: Appel[] = [];
    const res = await client(appels, MES_CONSENTEMENTS).myConsents();

    expect(res).toEqual(MES_CONSENTEMENTS);
    const [{url, init}] = appels;
    expect(url).toBe(`https://api.test${CHEMIN_CONSENTEMENTS}`);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-session');
  });

  it('porte la version acceptée et sa date — sans elles, la ligne ne prouve rien', async () => {
    const res = await client([], MES_CONSENTEMENTS).myConsents();
    expect(res[0].documentVersion).toBe('1.0');
    expect(res[0].acceptedAt).toBe('2026-03-12T10:00:00.000Z');
  });
});
