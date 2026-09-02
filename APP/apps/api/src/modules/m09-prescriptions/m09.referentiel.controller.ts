/**
 * M09 — le référentiel de médicaments (EF-09-02).
 *
 * ── Pourquoi ce fichier existe, et pourquoi il est SÉPARÉ du contrôleur M09 ────────────────────
 *
 * Cette route vivait dans M12 (`m12.controller.ts`), le module de recherche et de dévoilement.
 * M12 est retiré le 02/09/2026 (chantier 26) : ULAMU couvre trois acteurs — patient, médecin,
 * administration — et la recherche de médicaments en pharmacie sort du périmètre.
 *
 * **Mais le référentiel, lui, n'est pas une donnée de pharmacie.** Son commentaire d'origine le
 * disait déjà : *« AUCUNE donnée de stock ici (catalogue pur) »*, et son exigence est **EF-09-02**
 * — une exigence de M09. C'est ce que le prescripteur consulte pour composer une ligne
 * d'ordonnance : sans lui, l'écran C7 cherche dans le vide et le médecin ne peut plus prescrire
 * que du texte libre, c'est-à-dire sans garde-fou allergies.
 *
 * Il est donc **déplacé**, pas supprimé. Le module qui l'hébergeait n'était pas le sien.
 *
 * ── Pourquoi un contrôleur à part ─────────────────────────────────────────────────────────────
 *
 * `M09Controller` est monté sur `v1/prescriptions`. La route publique du référentiel est
 * `/v1/medicaments`, et **elle ne doit pas changer** : l'application web (`api.ts`) et
 * l'application mobile l'appellent à cette adresse. Un second contrôleur monté sur `v1` la garde
 * identique — déplacer du code ne doit rien coûter à ceux qui l'appellent.
 */
import { Controller, Get, Query } from "@nestjs/common";
import { CatalogQueryDto } from "./m09.dto";
import { PrescriptionService } from "./m09.prescription.service";

@Controller("v1")
export class M09ReferentielController {
  constructor(private readonly prescriptions: PrescriptionService) {}

  /** Recherche du référentiel par nom (DCI ou marque) — pour composer une ligne d'ordonnance. */
  @Get("medicaments")
  catalog(@Query() dto: CatalogQueryDto) {
    return this.prescriptions.searchCatalog(dto.q, dto.limit);
  }
}
