import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import {
  VendorEarningsSummaryModel,
  VendorPayoutRecordModel,
  VendorPayoutSummaryModel,
} from './models/vendor-payout.model';
import { VendorPayoutsService } from './vendor-payouts.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorPayoutsResolver {
  constructor(private readonly payoutsService: VendorPayoutsService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorPayoutRecordModel], {
    name: 'vendorPayouts',
    description: 'Historical and scheduled batch disbursement records for merchant',
  })
  async vendorPayouts(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorPayoutRecordModel[]> {
    const targetId = restaurantId || user.restaurantId;
    return this.payoutsService.listPayouts(targetId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorPayoutSummaryModel, {
    name: 'vendorPayoutSummary',
    description:
      'Executive payout summary including next scheduled direct deposit and month net sales',
  })
  async vendorPayoutSummary(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorPayoutSummaryModel> {
    const targetId = restaurantId || user.restaurantId;
    return this.payoutsService.getPayoutSummary(targetId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorEarningsSummaryModel, {
    name: 'vendorEarningsSummary',
    description: 'Calculate real gross sales, platform fee deductions (15%), and net payable',
  })
  async vendorEarningsSummary(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorEarningsSummaryModel> {
    const targetId = restaurantId || user.restaurantId;
    return this.payoutsService.getEarningsSummary(targetId);
  }
}
