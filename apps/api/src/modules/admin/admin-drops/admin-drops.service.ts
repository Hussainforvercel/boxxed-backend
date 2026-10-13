import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { AuditActionType, DropStatus, OrderStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';
import type { CreateDropInput } from './dto/drop-inputs';
import type {
  AdminDropModel,
  AdminDropPostmortemModel,
  AdminDropReservationModel,
} from './models/drop.model';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AdminDropsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueDropSku(): Promise<string> {
    let sku = '';
    let exists = true;
    while (exists) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      sku = `#BX-${rand}`;
      const found = await this.prisma.drop.findUnique({ where: { sku } });
      if (!found) exists = false;
    }
    return sku;
  }

  async listDrops(
    branchId?: string,
    status?: DropStatus,
    discountTier?: string,
    page = 1,
    limit = 50,
  ): Promise<AdminDropModel[]> {
    const skip = (page - 1) * limit;
    const where: Prisma.DropWhereInput = {};

    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (discountTier) where.discountTier = discountTier;

    return this.prisma.drop.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, internalCode: true, restaurantId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  async getDropReservations(dropId: string): Promise<AdminDropReservationModel[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { dropId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      referenceCode: r.referenceCode,
      customerPhone: r.user.phoneE164 || 'Unspecified',
      customerName: r.user.fullName || 'Anonymous User',
      quantity: r.quantity,
      priceMinor: r.priceMinor,
      status: r.status,
      createdAt: r.createdAt,
      collectedAt: r.collectedAt,
    }));
  }

  async getDropPostmortem(dropId: string): Promise<AdminDropPostmortemModel> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
      include: { reservations: true },
    });

    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, `Drop '${dropId}' not found.`);
    }

    const soldQuantity = drop.totalQuantity - drop.remainingQuantity;
    const unsoldQuantity = drop.remainingQuantity;
    const revenueMinor = soldQuantity * drop.priceMinor;
    const salvageRatePercent =
      drop.totalQuantity > 0 ? Number(((soldQuantity / drop.totalQuantity) * 100).toFixed(1)) : 0;
    const wasteKgEstimated = Number((unsoldQuantity * 0.8).toFixed(1));

    return {
      dropId: drop.id,
      totalQuantity: drop.totalQuantity,
      soldQuantity,
      unsoldQuantity,
      revenueMinor,
      salvageRatePercent,
      wasteKgEstimated,
      notes: drop.postmortemNotes,
    };
  }

  private validateDropInput(input: CreateDropInput): { start: Date; end: Date } {
    if (input.priceMinor > input.originalPriceMinor) {
      throw new DomainError(
        ErrorCode.COMMISSION_INVALID,
        'Price cannot exceed original base price.',
      );
    }
    const start = new Date(input.pickupStart);
    const end = new Date(input.pickupEnd);
    if (end <= start) {
      throw new DomainError(
        ErrorCode.BAD_USER_INPUT,
        'Pickup end time must be strictly after pickup start time.',
      );
    }
    return { start, end };
  }

  async createDrop(input: CreateDropInput, adminActor: AuthAdminUser): Promise<AdminDropModel> {
    const { start, end } = this.validateDropInput(input);
    const branch = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${input.branchId}' not found.`);
    }

    const sku = await this.generateUniqueDropSku();

    const drop = await this.prisma.drop.create({
      data: {
        branchId: input.branchId,
        sku,
        title: input.title,
        categoryTag: input.categoryTag,
        headlineItem: input.headlineItem,
        description: input.description ?? null,
        priceMinor: input.priceMinor,
        originalPriceMinor: input.originalPriceMinor,
        discountTier: input.discountTier,
        totalQuantity: input.totalQuantity,
        remainingQuantity: input.totalQuantity,
        pickupStart: start,
        pickupEnd: end,
        pickupSlotDuration: input.pickupSlotDuration ?? '30 mins',
        status: DropStatus.DRAFT_REVIEW,
      },
      include: {
        branch: { select: { id: true, name: true, internalCode: true, restaurantId: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.DROP_CREATED,
        entityType: 'DROP',
        entityId: drop.id,
        summary: `Created draft drop ${drop.title} (${sku}) at ${branch.name}`,
        payloadJson: { dropId: drop.id, sku, branchId: branch.id },
      },
    });

    return drop;
  }

  async publishDrop(dropId: string, adminActor: AuthAdminUser): Promise<AdminDropModel> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
      include: { branch: true },
    });
    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, `Drop '${dropId}' not found.`);
    }

    const updated = await this.prisma.drop.update({
      where: { id: dropId },
      data: {
        status: DropStatus.ACTIVE_DROP,
        publishedAt: new Date(),
      },
      include: {
        branch: { select: { id: true, name: true, internalCode: true, restaurantId: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.DROP_PUBLISHED,
        entityType: 'DROP',
        entityId: dropId,
        summary: `Published drop ${drop.title} (${drop.sku}) to live customers`,
        payloadJson: { dropId, sku: drop.sku },
      },
    });

    return updated;
  }

  private async executeDropCancellation(
    drop: Prisma.DropGetPayload<{ include: { branch: true } }>,
    note: string,
    adminActor: AuthAdminUser,
  ): Promise<AdminDropModel> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.drop.update({
        where: { id: drop.id },
        data: {
          status: DropStatus.CANCELLED,
          postmortemNotes: note,
        },
        include: {
          branch: { select: { id: true, name: true, internalCode: true, restaurantId: true } },
        },
      });

      await tx.reservation.updateMany({
        where: {
          dropId: drop.id,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.IN_KITCHEN, OrderStatus.READY_FOR_PICKUP],
          },
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: adminActor.id,
          actorEmail: adminActor.email,
          action: AuditActionType.DROP_CANCELLED,
          entityType: 'DROP',
          entityId: drop.id,
          summary: `Cancelled drop ${drop.title} (${drop.sku}): ${note}`,
          payloadJson: { dropId: drop.id, sku: drop.sku, reason: note },
        },
      });

      return result;
    });
  }

  async cancelDrop(
    dropId: string,
    reason: string | undefined,
    adminActor: AuthAdminUser,
  ): Promise<AdminDropModel> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
      include: { branch: true },
    });
    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, `Drop '${dropId}' not found.`);
    }

    const note = reason || 'Cancelled by Super Admin Operations';
    return this.executeDropCancellation(drop, note, adminActor);
  }

  async exportCsv(): Promise<string> {
    const drops = await this.prisma.drop.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = [
      'SKU',
      'Branch',
      'Title',
      'Price (Minor)',
      'Original Price (Minor)',
      'Total Qty',
      'Remaining Qty',
      'Status',
      'Pickup Start',
      'Pickup End',
    ];

    const lines = drops.map((d) =>
      [
        d.sku,
        `"${d.branch.name.replace(/"/g, '""')}"`,
        `"${d.title.replace(/"/g, '""')}"`,
        d.priceMinor,
        d.originalPriceMinor,
        d.totalQuantity,
        d.remainingQuantity,
        d.status,
        d.pickupStart.toISOString(),
        d.pickupEnd.toISOString(),
      ].join(','),
    );

    return [headers.join(','), ...lines].join('\n');
  }
}
