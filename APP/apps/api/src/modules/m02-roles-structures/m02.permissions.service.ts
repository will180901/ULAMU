/**
 * M02 — service de permissions, exposé à TOUS les modules (interface §8 :
 * « Ce compte a-t-il le droit X ? »). EF-02-02 / RM-02-03 : la vérification se fait
 * côté serveur, à chaque requête — jamais seulement masquée à l'interface.
 */
import { ForbiddenException, Injectable } from "@nestjs/common";
import { FacilityMember } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { FacilityRight, GLOBAL_PERMISSIONS_MATRIX, memberHasRight, PermissionRule } from "./m02.policies";

@Injectable()
export class PermissionsService {
  /**
   * Matrice statique des rôles globaux (spec M02 §5) — consultable par les autres
   * modules pour documenter/contrôler leurs routes. Voir m02.policies.ts.
   */
  readonly globalMatrix: readonly PermissionRule[] = GLOBAL_PERMISSIONS_MATRIX;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rattachement d'un compte à une structure, actif ou non — null s'il n'existe pas.
   * Composition consommée par M03, M09, M11, M16 (interface §8).
   */
  async getMembership(accountId: string, facilityId: string): Promise<FacilityMember | null> {
    return this.prisma.facilityMember.findUnique({
      where: { facilityId_accountId: { facilityId, accountId } },
    });
  }

  /**
   * Garde d'accès interne d'un espace (CU-02-06) : membre ACTIF porteur du droit,
   * ou titulaire — le titulaire (OWNER) a tous les droits d'office (EF-02-05).
   * Jette ForbiddenException (refus explicite) sinon.
   */
  async assertFacilityRight(accountId: string, facilityId: string, right: FacilityRight): Promise<FacilityMember> {
    const membership = await this.getMembership(accountId, facilityId);
    if (!membership || !membership.active) {
      // Un membre suspendu perd l'accès immédiatement (EF-02-07, CU-02-04).
      throw new ForbiddenException("Vous n'êtes pas membre actif de cette structure (RM-02-03)");
    }
    if (!memberHasRight(membership.role, membership.rights, right)) {
      throw new ForbiddenException(`Droit « ${right} » non accordé par le titulaire (EF-02-05)`);
    }
    return membership;
  }
}
