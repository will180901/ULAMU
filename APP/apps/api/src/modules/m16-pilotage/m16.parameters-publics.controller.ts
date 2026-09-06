/**
 * Les paramètres métier que les clients ont le droit de LIRE — dette n°27, 06/09/2026.
 *
 * ── Ce qui manquait ────────────────────────────────────────────────────────────────────────────
 *
 * Les PM-xx ne sortaient que par `GET /v1/admin/parameters`, réservé au super-administrateur. Aucun
 * client — web ni mobile — ne pouvait donc connaître une seule règle chiffrée du métier.
 *
 * Constaté au chantier 48, sur le Carnet familial : l'application **ne peut pas savoir à quel âge un
 * transfert devient possible** (PM-16). Elle proposait donc le geste à tout le monde et laissait le
 * serveur refuser. Correct, mais l'utilisateur découvrait la règle par un refus.
 *
 * ⚠️ **L'autre solution — écrire « 18 » dans l'écran — serait pire.** L'application mentirait le jour
 * où le paramètre change, et personne ne le saurait avant qu'un utilisateur ne se plaigne. C'est la
 * dérive que ce projet combat partout ailleurs : *une règle recopiée est une règle qui dérive.*
 *
 * ── Pourquoi une LISTE BLANCHE, et pas « tous les paramètres » ────────────────────────────────
 *
 * Servir tous les PM-xx exposerait des seuils opérationnels — plafonds de retrait, délais d'alerte,
 * seuils de fiabilité — qui renseignent qui cherche à contourner la plateforme. Chaque clé ci-dessous
 * est ouverte **une par une, avec sa raison**, et le défaut est le silence.
 */
import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/auth.guard";
import { ParamsService } from "../../common/params.service";

/**
 * Les seules clés lisibles sans être administrateur.
 *
 * Le critère : le paramètre décrit-il une règle que l'utilisateur **rencontre de toute façon** ?
 * L'âge minimum lui est opposé à l'inscription, l'échelle de notation s'affiche sous chaque étoile,
 * le délai de confirmation court sous ses yeux. Les publier ne révèle rien : cela évite seulement
 * que chaque écran les réinvente.
 */
const CLES_PUBLIQUES: Record<string, string> = {
  // Opposé à l'inscription (M01) et au transfert d'un Carnet à la majorité (CU-07-05).
  "PM-16": "Âge minimum d'un compte patient, en années",
  // Affiché sous chaque note et chaque moyenne (EF-05-01, D-021).
  "PM-13": "Échelle de notation : minimum et maximum, séparés par une virgule",
  // Le compte à rebours que le patient voit tourner après une sollicitation (D-024).
  "PM-07": "Délai de confirmation d'une poignée de main, en secondes",
};

@Controller("v1/parameters")
export class M16ParametresPublicsController {
  constructor(private readonly params: ParamsService) {}

  /**
   * Lecture seule, publique, bornée à la liste blanche.
   *
   * Publique et non « authentifiée » à dessein : l'âge minimum est opposé à l'inscription, donc
   * AVANT toute session. Exiger un jeton pour lire une règle qu'on applique à un visiteur serait
   * incohérent.
   *
   * Une clé absente de la base ne fait pas échouer la réponse : elle est simplement omise. Un écran
   * qui ne trouve pas sa valeur doit se taire plutôt qu'inventer — c'est la même règle que partout,
   * *une lecture qui échoue n'est ni un zéro ni un « non »*.
   */
  @Public()
  @Get()
  async list(): Promise<{ items: Array<{ key: string; value: string; description: string }> }> {
    const items: Array<{ key: string; value: string; description: string }> = [];
    for (const [key, description] of Object.entries(CLES_PUBLIQUES)) {
      try {
        items.push({ key, value: await this.params.get(key), description });
      } catch {
        // Paramètre absent en base : on l'omet. Le client saura qu'il ne sait pas.
      }
    }
    return { items };
  }
}
