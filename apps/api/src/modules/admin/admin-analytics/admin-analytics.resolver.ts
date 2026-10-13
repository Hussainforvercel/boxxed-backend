import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { AdminAnalyticsService } from './admin-analytics.service';
import {
  AdminLiveTodayModel,
  AdminNeedsAttentionModel,
  AdminOverviewKpisModel,
  AdminPlatformPerformanceModel,
  AdminRecentActivityModel,
} from './models/analytics.model';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

@Resolver()
export class AdminAnalyticsResolver {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => AdminOverviewKpisModel, {
    name: 'adminOverviewKpis',
    description: 'High-level executive KPIs on inventory, reservations, and partner counts',
  })
  async adminOverviewKpis(): Promise<AdminOverviewKpisModel> {
    return this.analyticsService.getOverviewKpis();
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => AdminNeedsAttentionModel, {
    name: 'adminNeedsAttention',
    description: 'Critical operational issues needing immediate HQ intervention',
  })
  async adminNeedsAttention(): Promise<AdminNeedsAttentionModel> {
    return this.analyticsService.getNeedsAttention();
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => AdminLiveTodayModel, {
    name: 'adminLiveToday',
    description: 'Real-time fulfillment gauge across all branches for today',
  })
  async adminLiveToday(): Promise<AdminLiveTodayModel> {
    return this.analyticsService.getLiveToday();
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [AdminRecentActivityModel], {
    name: 'adminRecentActivity',
    description: 'Chronological recent activity feed from audit logs',
  })
  async adminRecentActivity(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AdminRecentActivityModel[]> {
    return this.analyticsService.getRecentActivity(limit ?? 10);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => AdminPlatformPerformanceModel, {
    name: 'adminPlatformPerformance',
    description: '7-day platform performance trends across partner venues',
  })
  async adminPlatformPerformance(
    @Args('days', { type: () => Int, nullable: true }) days?: number,
  ): Promise<AdminPlatformPerformanceModel> {
    return this.analyticsService.getPlatformPerformance(days ?? 7);
  }
}
