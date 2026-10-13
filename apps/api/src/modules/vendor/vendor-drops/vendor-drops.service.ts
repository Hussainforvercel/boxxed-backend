import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { DropStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { CreateVendorBoxInput } from './dto/vendor-drop.input';
import type { VendorBoxDropModel } from './models/vendor-drop.model';
import type { DropModel } from '../../../generated/prisma/models';

@Injectable()
export class VendorDropsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDropToModel(d: DropModel): VendorBoxDropModel {
    const claimedCount = Math.max(0, d.totalQuantity - d.remainingQuantity);
    let statusText = 'ACTIVE';

    if (d.status === DropStatus.DRAFT_REVIEW) {
      statusText = 'DRAFT';
    } else if (d.status === DropStatus.SOLD_OUT || d.remainingQuantity === 0) {
      statusText = 'SOLDOUT';
    } else if (d.status === DropStatus.ACTIVE_DROP) {
      statusText = 'ACTIVE';
    } else {
      statusText = 'SCHEDULED';
    }

    const price = Math.round(d.priceMinor / 100);
    const originalValue = Math.round(d.originalPriceMinor / 100);

    return {
      id: d.id,
      seriesCode: d.seriesCode || 'SERIES 01',
      title: d.title,
      subtitle: d.headlineItem || d.description?.slice(0, 50) || 'Chef curated limited release',
      description: d.description || '',
      price,
      originalValue,
      claimedCount,
      totalQuantity: d.totalQuantity,
      remainingQuantity: d.remainingQuantity,
      windowCloseTime: '10:15 PM',
      pickupWindow: d.pickupSlotDuration || '7:30 – 10:30 PM',
      status: statusText,
      category: d.categoryTag || 'Feast',
      rackAllocation: d.rackAllocation || 'Rack A1 – A4',
      imageUrl: d.imageUrl,
      scheduledTimeText: d.scheduledTimeText,
    };
  }

  async listDrops(branchId: string, filterTab?: string): Promise<VendorBoxDropModel[]> {
    const drops = await this.prisma.drop.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });

    const models = drops.map((d) => this.mapDropToModel(d));

    if (!filterTab || filterTab === 'ALL') {
      return models;
    }

    return models.filter((m) => m.status === filterTab);
  }

  async quickAddStock(dropId: string, amount: number): Promise<VendorBoxDropModel> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
    });

    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, 'Box drop not found.');
    }

    const newTotal = drop.totalQuantity + amount;
    const newRemaining = drop.remainingQuantity + amount;
    const newStatus = drop.status === DropStatus.SOLD_OUT ? DropStatus.ACTIVE_DROP : drop.status;

    const updated = await this.prisma.drop.update({
      where: { id: dropId },
      data: {
        totalQuantity: newTotal,
        remainingQuantity: newRemaining,
        status: newStatus,
      },
    });

    return this.mapDropToModel(updated);
  }

  async toggleDropStatus(dropId: string): Promise<VendorBoxDropModel> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
    });

    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, 'Box drop not found.');
    }

    const nextStatus =
      drop.status === DropStatus.ACTIVE_DROP ? DropStatus.DRAFT_REVIEW : DropStatus.ACTIVE_DROP;

    const updated = await this.prisma.drop.update({
      where: { id: dropId },
      data: { status: nextStatus },
    });

    return this.mapDropToModel(updated);
  }

  async createDrop(branchId: string, input: CreateVendorBoxInput): Promise<VendorBoxDropModel> {
    const count = await this.prisma.drop.count();
    const sku = `#BX-${String(8100 + count)}`;

    const now = new Date();
    const pickupStart = new Date(now);
    pickupStart.setHours(19, 30, 0, 0); // 7:30 PM
    const pickupEnd = new Date(now);
    pickupEnd.setHours(22, 30, 0, 0); // 10:30 PM

    const priceMinor = Math.round(input.price * 100);
    const originalPriceMinor = Math.round(input.originalValue * 100);
    const initialStatus =
      input.status === 'DRAFT' ? DropStatus.DRAFT_REVIEW : DropStatus.ACTIVE_DROP;

    const created = await this.prisma.drop.create({
      data: {
        branchId,
        sku,
        title: input.title,
        headlineItem: input.subtitle,
        description: input.description,
        categoryTag: input.category,
        discountTier: '30_PERCENT_OFF',
        priceMinor,
        originalPriceMinor,
        currency: 'PKR',
        totalQuantity: input.totalQuantity,
        remainingQuantity: input.totalQuantity,
        pickupStart,
        pickupEnd,
        pickupSlotDuration: input.pickupWindow,
        seriesCode: input.seriesCode,
        rackAllocation: input.rackAllocation,
        imageUrl: input.imageUrl ?? null,
        status: initialStatus,
        publishedAt: initialStatus === DropStatus.ACTIVE_DROP ? new Date() : null,
      },
    });

    return this.mapDropToModel(created);
  }
}
