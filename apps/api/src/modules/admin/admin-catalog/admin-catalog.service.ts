import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { AuditActionType } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';
import type { CreateMasterMenuItemInput } from './dto/catalog-inputs';
import type {
  AdminBranchMenuOverrideModel,
  AdminMasterMenuItemModel,
} from './models/catalog.model';

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getMasterMenu(restaurantId: string): Promise<AdminMasterMenuItemModel[]> {
    return this.prisma.masterMenuItem.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMasterMenuItem(
    restaurantId: string,
    input: CreateMasterMenuItemInput,
    adminActor: AuthAdminUser,
  ): Promise<AdminMasterMenuItemModel> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new DomainError(
        ErrorCode.RESTAURANT_NOT_FOUND,
        `Restaurant '${restaurantId}' not found.`,
      );
    }

    const brandInitials =
      restaurant.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'BRD';

    const existingCount = await this.prisma.masterMenuItem.count({ where: { restaurantId } });
    const sku = `ITM-${brandInitials}-${String(existingCount + 1).padStart(3, '0')}`;

    const item = await this.prisma.masterMenuItem.create({
      data: {
        restaurantId,
        sku,
        name: input.name,
        specNarrative: input.specNarrative,
        category: input.category,
        basePriceMinor: input.basePriceMinor,
        gstRateBasisPoints: input.gstRateBasisPoints,
        imageUrl: input.imageUrl ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.MASTER_MENU_UPDATED,
        entityType: 'MASTER_MENU_ITEM',
        entityId: item.id,
        summary: `Added ${item.name} (${sku}) to master catalog for ${restaurant.name}`,
        payloadJson: { restaurantId, sku, name: item.name },
      },
    });

    return item;
  }

  async toggleBranchMenuItem(
    branchId: string,
    masterMenuItemId: string,
    isAvailable: boolean,
    adminActor: AuthAdminUser,
  ): Promise<AdminBranchMenuOverrideModel> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${branchId}' not found.`);
    }

    const override = await this.prisma.branchMenuOverride.upsert({
      where: {
        branchId_masterMenuItemId: { branchId, masterMenuItemId },
      },
      update: { isAvailable },
      create: {
        branchId,
        masterMenuItemId,
        isAvailable,
      },
      include: {
        masterItem: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.BRANCH_MENU_OVERRIDDEN,
        entityType: 'BRANCH_MENU_OVERRIDE',
        entityId: override.id,
        summary: `Set dish availability to ${isAvailable} for branch ${branch.name}`,
        payloadJson: { branchId, masterMenuItemId, isAvailable },
      },
    });

    return override;
  }
}
