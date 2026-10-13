import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { CreateVendorMenuItemInput } from './dto/vendor-menu.input';
import type { VendorMenuItemModel } from './models/vendor-menu.model';
import type { MasterMenuItemModel } from '../../../generated/prisma/models';

@Injectable()
export class VendorMenuService {
  constructor(private readonly prisma: PrismaService) {}

  private mapItemToModel(item: MasterMenuItemModel, isAvailable: boolean): VendorMenuItemModel {
    const basePrice = Math.round(item.basePriceMinor / 100);
    const gstRate = item.gstRateBasisPoints ? item.gstRateBasisPoints / 10000 : 0.15;
    const finalPrice = Math.round(basePrice + basePrice * gstRate);

    let expiryDays: number | null = null;
    if (item.isTemporary && item.expiresAt) {
      const diffMs = new Date(item.expiresAt).getTime() - new Date().getTime();
      expiryDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      id: item.id,
      code: item.sku,
      sku: item.sku,
      name: item.name,
      description: item.specNarrative,
      category: item.category,
      basePrice,
      gstRate,
      finalPrice,
      isTemporary: item.isTemporary,
      expiryDays,
      isAvailable,
      dietaryTags: item.dietaryTags || ['Halal'],
    };
  }

  async listMenuItems(restaurantId: string, branchId?: string): Promise<VendorMenuItemModel[]> {
    const masterItems = await this.prisma.masterMenuItem.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const overrides = branchId
      ? await this.prisma.branchMenuOverride.findMany({
          where: { branchId },
        })
      : [];

    const overrideMap = new Map<string, boolean>();
    overrides.forEach((o) => overrideMap.set(o.masterMenuItemId, o.isAvailable));

    return masterItems.map((item) => {
      // Branch override if present, else default true
      const isAvailable = overrideMap.has(item.id) ? (overrideMap.get(item.id) as boolean) : true;
      return this.mapItemToModel(item, isAvailable);
    });
  }

  async toggleAvailability(branchId: string, menuItemId: string): Promise<VendorMenuItemModel> {
    const masterItem = await this.prisma.masterMenuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!masterItem) {
      throw new DomainError(ErrorCode.MENU_ITEM_NOT_FOUND, 'Menu item not found.');
    }

    const existingOverride = await this.prisma.branchMenuOverride.findUnique({
      where: {
        branchId_masterMenuItemId: {
          branchId,
          masterMenuItemId: menuItemId,
        },
      },
    });

    const nextAvailability = existingOverride ? !existingOverride.isAvailable : false; // was default true, toggle to false

    const updatedOverride = await this.prisma.branchMenuOverride.upsert({
      where: {
        branchId_masterMenuItemId: {
          branchId,
          masterMenuItemId: menuItemId,
        },
      },
      create: {
        branchId,
        masterMenuItemId: menuItemId,
        isAvailable: nextAvailability,
      },
      update: {
        isAvailable: nextAvailability,
      },
    });

    return this.mapItemToModel(masterItem, updatedOverride.isAvailable);
  }

  async createMenuItem(
    restaurantId: string,
    input: CreateVendorMenuItemInput,
  ): Promise<VendorMenuItemModel> {
    const totalCount = await this.prisma.masterMenuItem.count({
      where: { restaurantId },
    });

    const sku = input.code || `#KS-M${String(totalCount + 1).padStart(2, '0')}`;
    const basePriceMinor = Math.round(input.basePrice * 100);
    const gstRateBasisPoints = Math.round(input.gstRate * 10000);

    let expiresAt: Date | null = null;
    if (input.isTemporary) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input.expiryDays || 7));
    }

    const created = await this.prisma.masterMenuItem.create({
      data: {
        restaurantId,
        sku,
        name: input.name,
        specNarrative: input.description,
        category: input.category,
        basePriceMinor,
        gstRateBasisPoints,
        isTemporary: input.isTemporary,
        expiresAt,
        dietaryTags: input.dietaryTags,
        isActive: true,
      },
    });

    return this.mapItemToModel(created, true);
  }
}
