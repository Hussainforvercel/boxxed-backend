import { Injectable } from '@nestjs/common';

import { DropStatus, OrderStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { VendorServiceOverviewModel } from './models/vendor-overview.model';

@Injectable()
export class VendorOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getServiceOverview(branchId: string): Promise<VendorServiceOverviewModel> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Reservations for branch
    const reservations = await this.prisma.reservation.findMany({
      where: {
        drop: { branchId },
        createdAt: { gte: today },
      },
    });

    const completed = reservations.filter((r) => r.status === OrderStatus.COMPLETED);
    const awaiting = reservations.filter(
      (r) => r.status === OrderStatus.READY_FOR_PICKUP || r.status === OrderStatus.IN_KITCHEN,
    );

    const todayNetSalesMinor = [...completed, ...awaiting].reduce(
      (acc, curr) => acc + curr.priceMinor * curr.quantity,
      0,
    );
    const todayNetSales = Math.round(todayNetSalesMinor / 100);

    // 2. Active drops for branch
    const activeDrops = await this.prisma.drop.findMany({
      where: {
        branchId,
        status: DropStatus.ACTIVE_DROP,
      },
    });

    const totalUnits = activeDrops.reduce((acc, curr) => acc + curr.totalQuantity, 0);
    const claimedUnits = activeDrops.reduce(
      (acc, curr) => acc + Math.max(0, curr.totalQuantity - curr.remainingQuantity),
      0,
    );
    const unitsRemaining = Math.max(0, totalUnits - claimedUnits);

    return {
      todayNetSales,
      todayOrdersCount: completed.length,
      activeBoxesCount: activeDrops.length,
      awaitingPickupCount: awaiting.length,
      totalUnits,
      claimedUnits,
      unitsRemaining,
      activeDropsCount: activeDrops.length,
      todayReservationsCount: completed.length + awaiting.length,
      pendingPickupCount: awaiting.length,
      totalSalesMinor: todayNetSalesMinor,
    };
  }
}
