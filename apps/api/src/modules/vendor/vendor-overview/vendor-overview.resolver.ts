import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { VendorServiceOverviewModel } from './models/vendor-overview.model';
import { VendorOverviewService } from './vendor-overview.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorOverviewResolver {
  constructor(private readonly overviewService: VendorOverviewService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorServiceOverviewModel, {
    name: 'vendorServiceOverview',
    description: 'Get real-time service overview KPIs and inventory balance for branch station',
  })
  async vendorServiceOverview(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorServiceOverviewModel> {
    const targetBranchId = branchId || user.branchId;
    return this.overviewService.getServiceOverview(targetBranchId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorServiceOverviewModel, {
    name: 'vendorDashboardOverview',
    description: 'Get real-time dashboard overview metrics for branch station',
  })
  async vendorDashboardOverview(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorServiceOverviewModel> {
    const targetBranchId = branchId || user.branchId;
    return this.overviewService.getServiceOverview(targetBranchId);
  }
}
