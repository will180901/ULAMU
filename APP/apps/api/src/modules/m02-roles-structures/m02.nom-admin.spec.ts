/**
 * E4 affichait « admin » au lieu de « Super Admin » — corrigé le 02/09/2026.
 *
 * ── Le défaut ──────────────────────────────────────────────────────────────────────────────────
 *
 * `listAdmins` lisait le nom d'un administrateur dans `patientProfile`. Or les **deux seuls chemins
 * qui créent un compte d'administration** écrivent ce nom dans `facilityMemberProfile` :
 *
 *   • le bootstrap du seed (`prisma/seed.ts`) — celui qui a créé le compte en ligne ;
 *   • la route `createAdmin` de `m02.service.ts`, vingt lignes sous la lecture fautive.
 *
 * Le nom revenait donc `null` pour TOUS les administrateurs, et l'écran se rabattait sur le nom
 * d'utilisateur. **Rien ne plantait, et c'est précisément ce qui l'a fait durer** : un nom de repli
 * ressemble à un nom. Personne ne cherche un défaut derrière « admin ».
 *
 * ── Pourquoi ce test monte le VRAI service ─────────────────────────────────────────────────────
 *
 * Recopier la règle de résolution et l'éprouver à part ne prouverait rien : le défaut n'était pas
 * dans une règle, il était dans **le `select` Prisma** — un tiroir demandé plutôt qu'un autre. Seul
 * l'appel réel peut le montrer. Même raison qu'en `m02.dernier-titulaire.spec.ts`, et même montage.
 *
 * ── Ce que le test verrouille ──────────────────────────────────────────────────────────────────
 *
 * Les trois tiroirs, dans l'ordre exact de `M01Service.me()`. Vérifier le seul cas qui a échoué
 * laisserait revenir le défaut sous une autre forme : c'est **une règle unique de résolution** qu'on
 * garde, à deux endroits du code, pas un tiroir contre un autre.
 */
import { M02Service } from "./m02.service";

type Profil = { firstName: string; lastName: string } | null;

/**
 * Le strict nécessaire pour `listAdmins` : une table de comptes qui rend les profils demandés, et
 * une table d'attributions vide — aucun sous-rôle n'est nécessaire pour éprouver un nom.
 */
function monterService(compte: {
  patientProfile?: Profil;
  professionalProfile?: Profil;
  facilityMemberProfile?: Profil;
}) {
  const client = {
    account: {
      findMany: async () => [
        {
          id: "adm-1",
          username: "admin",
          phone: "+242060000001",
          emailTwoFactorEnabled: false,
          patientProfile: compte.patientProfile ?? null,
          professionalProfile: compte.professionalProfile ?? null,
          facilityMemberProfile: compte.facilityMemberProfile ?? null,
          totpSecret: null,
        },
      ],
    },
    adminRoleAssignment: { findMany: async () => [] },
  };

  // Six dépendances depuis le 03/09 : `PermissionsService` est parti avec la moitié
  // « structures » du module (dette n°17).
  return new M02Service(
    client as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

const NOM = { firstName: "Sylvie", lastName: "Ngouabi" };

describe("E4 — le nom d'un administrateur (02/09/2026)", () => {
  /*
    LE cas du défaut : c'est ainsi que le seed et `createAdmin` écrivent, donc ainsi que le compte
    en ligne existe. Avant correction, ce test rendait `null` et E4 affichait « admin ».
  */
  it("lit le nom écrit par le seed et par createAdmin (profil de structure)", async () => {
    const service = monterService({ facilityMemberProfile: NOM });

    const [admin] = await service.listAdmins();

    expect(admin.firstName).toBe("Sylvie");
    expect(admin.lastName).toBe("Ngouabi");
  });

  /*
    Les deux autres tiroirs. Un compte hérité peut porter son nom ailleurs — un professionnel promu
    administrateur, par exemple. La règle de `M01Service.me()` les couvre depuis toujours ; celle-ci
    doit dire la même chose, sans quoi le même écran donnerait deux noms selon la page.
  */
  it("lit aussi un nom rangé côté patient", async () => {
    const service = monterService({ patientProfile: NOM });

    expect((await service.listAdmins())[0].firstName).toBe("Sylvie");
  });

  it("lit aussi un nom rangé côté professionnel", async () => {
    const service = monterService({ professionalProfile: NOM });

    expect((await service.listAdmins())[0].firstName).toBe("Sylvie");
  });

  /*
    L'ordre, et pas seulement la présence. `me()` sert patient, puis professionnel, puis structure :
    un compte qui porterait deux profils doit donner LE MÊME nom dans les deux écrans, sinon on
    revient au défaut qu'on corrige — deux vérités pour une même donnée.
  */
  it("suit l'ordre de me() quand plusieurs profils existent", async () => {
    const service = monterService({
      patientProfile: NOM,
      facilityMemberProfile: { firstName: "Autre", lastName: "Nom" },
    });

    expect((await service.listAdmins())[0].firstName).toBe("Sylvie");
  });

  /*
    Et le cas sans profil du tout : `null`, pas une chaîne vide. L'écran a son propre repli — le nom
    d'utilisateur — et c'est à LUI de décider quoi montrer, pas au serveur d'inventer.
  */
  it("rend null quand le compte n'a aucun profil", async () => {
    const service = monterService({});

    const [admin] = await service.listAdmins();

    expect(admin.firstName).toBeNull();
    expect(admin.lastName).toBeNull();
  });
});
