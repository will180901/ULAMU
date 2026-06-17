/**
 * C6 — statut de vérification exposé aux autres modules (M02, M05, M06, M11, M12 — spec §7).
 * RM-03-01 : « peut exercer » = Badge Vérifié + version courante du contrat signée
 * (EF-03-05 posture stricte D-029 ; EF-03-06 : sans signature, pas d'activation).
 * RM-03-03 : seul le statut (oui/non) sort d'ici — jamais les documents.
 */
import { Injectable } from "@nestjs/common";
import { Prisma, VerificationStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { canPracticeEffective } from "./m03.policies";

export interface EffectiveVerificationStatus {
  /** null = aucun dossier ouvert (jamais praticable). */
  status: VerificationStatus | null;
  canPractice: boolean;
}

type CaseWithAgreement = Prisma.VerificationCaseGetPayload<{
  include: { agreement: { include: { versions: true } } };
}>;

const STATUS_INCLUDE = { agreement: { include: { versions: true } } } as const;

@Injectable()
export class VerificationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getForProfessional(accountId: string): Promise<EffectiveVerificationStatus> {
    const c = await this.prisma.verificationCase.findUnique({
      where: { professionalId: accountId },
      include: STATUS_INCLUDE,
    });
    return this.effective(c);
  }

  async getForFacility(facilityId: string): Promise<EffectiveVerificationStatus> {
    const c = await this.prisma.verificationCase.findUnique({
      where: { facilityId },
      include: STATUS_INCLUDE,
    });
    return this.effective(c);
  }

  private effective(c: CaseWithAgreement | null): EffectiveVerificationStatus {
    if (!c) return { status: null, canPractice: false };
    const latest = c.agreement
      ? ([...c.agreement.versions].sort((a, b) => b.version - a.version).at(0) ?? null)
      : null;
    return { status: c.status, canPractice: canPracticeEffective(c.status, latest?.signedAt != null) };
  }
}
