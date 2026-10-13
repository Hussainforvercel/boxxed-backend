import { Injectable } from '@nestjs/common';

import {
  BranchStatus,
  ComplaintStatus,
  DropStatus,
  OrderStatus,
  PartnerStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type {
  AdminDailyPerformanceModel,
  AdminLiveTodayModel,
  AdminNeedsAttentionModel,
  AdminOverviewKpisModel,
  AdminPlatformPerformanceModel,
  AdminRecentActivityModel,
} from './models/analytics.model';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewKpis(): Promise<AdminOverviewKpisModel> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [activeRestaurantsCount, activeDrops, todayReservationsCount, noShowsTodayCount] =
      await Promise.all([
        this.prisma.restaurant.count({
          where: { status: PartnerStatus.ACTIVE },
        }),
        this.prisma.drop.findMany({
          where: { status: DropStatus.ACTIVE_DROP },
          select: { remainingQuantity: true },
        }),
        this.prisma.reservation.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.prisma.reservation.count({
          where: {
            createdAt: { gte: todayStart },
            status: OrderStatus.NO_SHOW,
          },
        }),
      ]);

    const activeBoxesCount = activeDrops.reduce((acc, d) => acc + d.remainingQuantity, 0);

    return {
      activeRestaurantsCount,
      activeBoxesCount,
      todayReservationsCount,
      noShowsTodayCount,
    };
  }

  async getNeedsAttention(): Promise<AdminNeedsAttentionModel> {
    const now = new Date();
    const in45Mins = new Date(now.getTime() + 45 * 60 * 1000);

    const [pendingComplaintsCount, activeBranches, expiringSoonDropsCount] = await Promise.all([
      this.prisma.complaintTicket.count({
        where: { status: ComplaintStatus.PENDING_REVIEW },
      }),
      this.prisma.branch.findMany({
        where: { status: BranchStatus.ACTIVE },
        select: {
          id: true,
          drops: {
            where: { status: DropStatus.ACTIVE_DROP },
            select: { id: true },
          },
        },
      }),
      this.prisma.drop.count({
        where: {
          status: DropStatus.ACTIVE_DROP,
          pickupEnd: { gte: now, lte: in45Mins },
        },
      }),
    ]);

    const zeroDropsBranchesCount = activeBranches.filter((b) => b.drops.length === 0).length;

    return {
      pendingComplaintsCount,
      zeroDropsBranchesCount,
      expiringSoonDropsCount,
    };
  }

  async getLiveToday(): Promise<AdminLiveTodayModel> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const reservations = await this.prisma.reservation.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { status: true },
    });

    const total = reservations.length;
    if (total === 0) {
      return {
        awaitingPickupPercent: 0,
        pickedUpPercent: 0,
        noShowPercent: 0,
        totalReservations: 0,
      };
    }

    const awaiting = reservations.filter(
      (r) =>
        r.status === OrderStatus.PENDING ||
        r.status === OrderStatus.IN_KITCHEN ||
        r.status === OrderStatus.READY_FOR_PICKUP,
    ).length;

    const pickedUp = reservations.filter((r) => r.status === OrderStatus.COMPLETED).length;
    const noShow = reservations.filter((r) => r.status === OrderStatus.NO_SHOW).length;

    return {
      awaitingPickupPercent: Number(((awaiting / total) * 100).toFixed(1)),
      pickedUpPercent: Number(((pickedUp / total) * 100).toFixed(1)),
      noShowPercent: Number(((noShow / total) * 100).toFixed(1)),
      totalReservations: total,
    };
  }

  async getRecentActivity(limit = 10): Promise<AdminRecentActivityModel[]> {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => {
      const timeStr = log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let badge = 'AUDIT';
      let badgeType = 'live';

      switch (log.action) {
        case 'PARTNER_ONBOARDED':
          badge = 'ONBOARDING';
          badgeType = 'onboarding';
          break;
        case 'DROP_PUBLISHED':
          badge = 'BOX LIVE';
          badgeType = 'live';
          break;
        case 'BRANCH_THROTTLED':
        case 'BRANCH_EMERGENCY_SHUTDOWN':
          badge = 'URGENT';
          badgeType = 'urgent';
          break;
        case 'DROP_CREATED':
          badge = 'INVENTORY';
          badgeType = 'inventory';
          break;
        case 'STAFF_INVITED':
          badge = 'STAFF';
          badgeType = 'onboarding';
          break;
        default:
          badge = log.action.replace(/_/g, ' ');
          badgeType = 'live';
      }

      return {
        id: log.id,
        time: timeStr,
        title: log.entityType.charAt(0).toUpperCase() + log.entityType.slice(1),
        badge,
        badgeType,
        description: log.summary,
        createdAt: log.createdAt,
      };
    });
  }

  async getPlatformPerformance(daysCount = 7): Promise<AdminPlatformPerformanceModel> {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    const now = new Date();
    const resultDays: AdminDailyPerformanceModel[] = [];

    let totalBoxesSold = 0;
    let totalReservations = 0;
    let totalPickedUp = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(dayDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dayDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const dayReservations = await this.prisma.reservation.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        select: { status: true },
      });

      const resCount = dayReservations.length;
      const pickedUpCount = dayReservations.filter(
        (r) => r.status === OrderStatus.COMPLETED,
      ).length;
      const boxesSoldCount = dayReservations.filter(
        (r) => r.status !== OrderStatus.CANCELLED,
      ).length;

      totalBoxesSold += boxesSoldCount;
      totalReservations += resCount;
      totalPickedUp += pickedUpCount;

      const isToday = i === 0;
      const dayName = dayNames[dayDate.getDay()] || 'Day';
      const dayLabel = isToday ? 'Today' : dayName;

      resultDays.push({
        day: dayLabel,
        date: dayDate.toISOString().slice(0, 10),
        boxesSold: boxesSoldCount,
        reservations: resCount,
        pickedUp: pickedUpCount,
      });
    }

    return {
      days: resultDays,
      totalBoxesSold,
      totalReservations,
      totalPickedUp,
      percentageChange: 100.0,
    };
  }
}
