/**
 * Le plafond de fichier est le MÊME partout — chantier 130, 15/09/2026.
 *
 * ── Ce que ce test défend ─────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il y avait trois plafonds pour une seule règle.** Mesuré le 15/09 :
 *
 *   • l'écran « Ma vérification » refusait au-delà de **5 Mo** ;
 *   • le contrat d'envoi acceptait **11 000 000** caractères de base64, soit ~8 Mo de fichier ;
 *   • `StorageService` plafonnait à **8 Mo**.
 *
 * Un diplôme scanné de 6 Mo était donc refusé par l'écran alors que le serveur l'aurait pris — et
 * le message annonçait « 5 Mo maximum », si bien que le déposant réduisait son fichier pour rien.
 *
 * > **Trois chiffres pour une même règle finissent par faire trois règles.**
 *
 * ── Pourquoi ce test vit du côté du SERVEUR ───────────────────────────────────────────────────
 *
 * Parce que c'est lui qui décide. La règle partagée (`packages/shared/src/fichier.ts`, vendorée
 * dans le web et le mobile) n'est qu'un MIROIR, posé là pour refuser avant l'envoi — sur une
 * connexion congolaise, apprendre le refus après huit mégaoctets coûte des minutes.
 *
 * *Un miroir qu'on ne compare jamais à son original finit par montrer autre chose.* Ce test est la
 * comparaison. Le vendorage entre les trois copies, lui, est gardé par
 * `apps/web/src/test/vendorage.test.ts`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE_PARTAGEE = resolve(__dirname, "../../../../packages/shared/src/fichier.ts");
const STORAGE = resolve(__dirname, "storage.service.ts");
const DTO_M03 = resolve(__dirname, "../modules/m03-verification-contracts/m03.dto.ts");

/** La valeur d'une constante `X * 1024 * 1024`, en octets. */
function plafondMo(source: string, motif: RegExp): number {
  const m = motif.exec(source);
  // `m` nul = la constante a changé de forme : le message d'échec de Jest le dira par la ligne.
  expect(m).toBeTruthy();
  return Number((m as RegExpExecArray)[1]) * 1024 * 1024;
}

describe("Le plafond d'un fichier téléversé", () => {
  const partage = readFileSync(SOURCE_PARTAGEE, "utf8");
  const storage = readFileSync(STORAGE, "utf8");

  it("est le même dans la règle partagée et dans le stockage", () => {
    const cotePartage = plafondMo(partage, /TAILLE_MAX_OCTETS = (\d+) \* 1024 \* 1024/);
    const coteServeur = plafondMo(storage, /maxBytes = (\d+) \* 1024 \* 1024/);

    expect(cotePartage).toBe(coteServeur);
  });

  /*
    Le contrat borne le BASE64, pas le fichier : 4 caractères pour 3 octets. Il doit donc laisser
    passer au moins ce que le stockage accepte, sinon un fichier valide est refusé à la porte — et
    pas trop au-delà, sinon on décode pour rien de la mémoire sur une instance de 512 Mo.
  */
  it("laisse passer au contrat exactement ce que le stockage accepte", () => {
    const coteServeur = plafondMo(storage, /maxBytes = (\d+) \* 1024 \* 1024/);
    const dto = readFileSync(DTO_M03, "utf8");
    const m = /MaxLength\((\d[\d_]*)\) fileBase64/.exec(dto);
    expect(m).toBeTruthy();

    const bornBase64 = Number((m as RegExpExecArray)[1].replace(/_/g, ""));
    const minimumNecessaire = Math.ceil(coteServeur / 3) * 4;

    expect(bornBase64).toBeGreaterThanOrEqual(minimumNecessaire);
    expect(bornBase64).toBeLessThan(minimumNecessaire * 1.2);
  });

  /*
    ⚠️ La liste des pièces est plus ÉTROITE que celle du stockage, et c'est voulu : le stockage
    connaît aussi l'audio et la vidéo, qui n'ont rien à faire dans un dossier de vérification. Mais
    tout ce qu'elle autorise doit être accepté en bout de chaîne, sinon l'écran promet un format que
    le serveur refusera.
  */
  it("n’annonce aucun format que le stockage refuserait", () => {
    const liste = /MIMES_PIECE = \[([^\]]*)\]/.exec(partage);
    expect(liste).toBeTruthy();

    const types = [...(liste as RegExpExecArray)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(0);

    for (const t of types) {
      expect({ type: t, connuDuStockage: storage.includes(`"${t}"`) }).toEqual({ type: t, connuDuStockage: true });
    }
  });

  /*
    Le contrat de M03 doit accepter la même liste que celle annoncée aux écrans — ni plus (une
    porte ouverte pour rien), ni moins (un format promis puis refusé).
  */
  it("le contrat de la pièce justificative accepte cette liste, et elle seule", () => {
    const dto = readFileSync(DTO_M03, "utf8");
    const bloc = /@IsIn\(\[([^\]]*)\], \{\s*message: "Pièce justificative/.exec(dto);
    expect(bloc).toBeTruthy();

    const auContrat = [...(bloc as RegExpExecArray)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    const liste = /MIMES_PIECE = \[([^\]]*)\]/.exec(partage) as RegExpExecArray;
    const annonces = [...liste[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

    expect(auContrat).toEqual(annonces);
  });
});
