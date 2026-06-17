/**
 * M12 — SearchService : la moitié GRATUITE du modèle signature (D-009).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 *
 * « Le médicament existe près de chez toi » — recherche ANONYME par arrondissement (EF-12-01/02),
 * par produits libres OU par ordonnance (lignes restantes, CU-12-01). Délègue intégralement
 * l'agrégat à M11 (StockAvailabilityService.searchAnonymous) : M12 n'expose NI identité, NI prix,
 * NI position — la règle d'or (RM-12-01) tient dès la recherche.
 *
 * D-009 : aucune identité de PATIENT n'est enregistrée à la recherche (pas de trace nominative) ;
 * seules les CLOCHES posées explicitement (ProductAvailabilityAlert) lient un patient à un produit.
 */
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrescriptionStatus } from "@prisma/client";
import { AuditEmitter } from "../../common/audit.emitter";
import { AuthenticatedActor } from "../../common/auth/auth.guard";
import { PrismaService } from "../../common/prisma.service";
import {
  AnonymousDistrictResult,
  StockAvailabilityService,
} from "../m11-stocks/m11.availability.service";
import { CreateAlertDto, SearchDto } from "./m12.dto";
import { normalizeItems, remainingItemsFromLines, SearchItem } from "./m12.policies";

/** Entrée du référentiel médicaments (EF-09-02) — sert le PATIENT à composer sa recherche M12. */
export interface CatalogItem {
  id: string;
  dci: string;
  commercialNames: string[];
  form: string | null;
  dosage: string | null;
}

export interface SearchResult {
  /** Résultats agrégés par arrondissement (anonymes, RM-11-04/05). */
  districts: AnonymousDistrictResult[];
  /** Items effectivement recherchés (après normalisation / résolution d'ordonnance). */
  items: SearchItem[];
  /**
   * Aucune pharmacie ne couvre un produit nulle part → on propose explicitement de poser une
   * cloche « me prévenir si disponible » (EF-12-06, CU-12-01). Le client affiche le bouton.
   */
  suggestAlert: boolean;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: StockAvailabilityService,
    private readonly audit: AuditEmitter,
  ) {}

  // ── EF-12-01/02 : recherche gratuite par produits libres (CU-12-01) ─────────

  /**
   * Délègue à M11.searchAnonymous (le contrat C7). Aucune identité patient n'est tracée (D-009).
   * Zéro résultat → suggestAlert = true (le client propose la cloche). < 4 s en 3G (ENF-03).
   */
  async search(_actor: AuthenticatedActor, dto: SearchDto): Promise<SearchResult> {
    const items = normalizeItems(dto.items);
    return this.runSearch(items, dto.district);
  }

  /**
   * Référentiel médicaments (EF-09-02) — recherche par nom (DCI ou marque), pour que le PATIENT
   * compose sa recherche M12 / le prescripteur sa ligne. AUCUNE donnée de stock ici (catalogue pur).
   */
  async searchCatalog(q: string, limit = 20): Promise<{ items: CatalogItem[] }> {
    const term = (q ?? "").trim().toLowerCase();
    if (term.length < 2) return { items: [] };
    const rows = await this.prisma.medicament.findMany({ where: { active: true }, take: 500, orderBy: { dci: "asc" } });
    const matched = rows.filter(
      (m) => m.dci.toLowerCase().includes(term) || m.commercialNames.some((n) => n.toLowerCase().includes(term)),
    );
    return {
      items: matched.slice(0, Math.max(1, Math.min(limit, 50))).map((m) => ({
        id: m.id,
        dci: m.dci,
        commercialNames: m.commercialNames,
        form: m.form,
        dosage: m.dosage,
      })),
    };
  }

  // ── EF-12-01 : recherche par ordonnance (lignes RESTANTES, CU-12-01) ────────

  /**
   * Résout les lignes RESTANTES (qtyPrescribed − qtyDispensed > 0) d'une ordonnance ACTIVE du
   * patient, puis délègue la recherche. 404 si l'ordonnance n'existe pas, 403 si elle n'est pas
   * la sienne (lecture seule directe de M09 — documentée, comme M13 lit M03).
   */
  async searchByPrescription(
    actor: AuthenticatedActor,
    prescriptionId: string,
    district?: string,
  ): Promise<SearchResult> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { lines: true },
    });
    if (!prescription) throw new NotFoundException("Ordonnance introuvable");
    // RM-12-05 : le dévoilement est personnel ; la recherche par ordonnance l'est aussi.
    if (prescription.patientAccountId !== actor.accountId) {
      throw new ForbiddenException("Cette ordonnance n'est pas la vôtre");
    }
    // Seule une ordonnance encore « en cours » a des produits à chercher (D-014).
    if (
      prescription.status !== PrescriptionStatus.ACTIVE &&
      prescription.status !== PrescriptionStatus.PARTIALLY_DISPENSED
    ) {
      // Plus rien à délivrer : on renvoie un résultat vide honnête (pas une erreur).
      return { districts: [], items: [], suggestAlert: false };
    }

    const items = remainingItemsFromLines(prescription.lines);
    return this.runSearch(items, district);
  }

  // ── EF-12-06 / CU-12-01 : poser une cloche « me prévenir si disponible » ─────

  /**
   * Crée une ProductAvailabilityAlert liée au patient — notification UNIQUE à réapparition
   * (notifiedAt posé par M11 quand le stock revient). Audit C5 sans contenu médical.
   */
  async createAlert(actor: AuthenticatedActor, dto: CreateAlertDto): Promise<{ alertId: string }> {
    const medicamentIds = [...new Set(dto.medicamentIds)];
    return this.prisma.$transaction(async (tx) => {
      const alert = await tx.productAvailabilityAlert.create({
        data: {
          patientAccountId: actor.accountId,
          district: dto.district,
          medicamentIds,
        },
      });
      await this.audit.emit(tx, {
        actorId: actor.accountId,
        actorType: "patient",
        action: "m12.alert.created",
        resource: `alert:${alert.id}`,
        context: { district: dto.district, productCount: medicamentIds.length },
      });
      return { alertId: alert.id };
    });
  }

  // ── Interne ───────────────────────────────────────────────────────────────

  private async runSearch(items: SearchItem[], district?: string): Promise<SearchResult> {
    if (items.length === 0) {
      // Rien à chercher (ordonnance entièrement délivrée, items vides) : pas de cloche à proposer.
      return { districts: [], items: [], suggestAlert: false };
    }
    const districts = await this.availability.searchAnonymous({ district, items });
    // Zéro pharmacie couvrante nulle part → proposer la cloche (EF-12-06).
    return { districts, items, suggestAlert: districts.length === 0 };
  }
}
