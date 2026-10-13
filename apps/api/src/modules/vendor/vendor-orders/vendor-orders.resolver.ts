import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import {
  VendorOrderItemModel,
  VendorOrderVerificationResultModel,
} from './models/vendor-order.model';
import { VendorOrdersService } from './vendor-orders.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorOrdersResolver {
  constructor(private readonly ordersService: VendorOrdersService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorOrderItemModel], {
    name: 'vendorOrders',
    description: 'List orders for counter pickup fulfillment filtered by status or search',
  })
  async vendorOrders(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<VendorOrderItemModel[]> {
    const targetBranchId = branchId || user.branchId;
    return this.ordersService.listOrders(targetBranchId, status, search);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorOrderItemModel], {
    name: 'vendorBranchOrders',
    description: 'List branch reservations filtered by status or search',
  })
  async vendorBranchOrders(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<VendorOrderItemModel[]> {
    const targetBranchId = branchId || user.branchId;
    return this.ordersService.listOrders(targetBranchId, status, search);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorOrderItemModel, {
    name: 'vendorMarkOrderReady',
    description: 'Transition order status to AWAITING_PICKUP',
  })
  async vendorMarkOrderReady(@Args('orderId') orderId: string): Promise<VendorOrderItemModel> {
    return this.ordersService.markOrderReady(orderId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorOrderItemModel, {
    name: 'vendorCompleteHandover',
    description: 'Complete order pickup handover at the front counter',
  })
  async vendorCompleteHandover(@Args('orderId') orderId: string): Promise<VendorOrderItemModel> {
    return this.ordersService.completeHandover(orderId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorOrderVerificationResultModel, {
    name: 'vendorVerifyAndHandover',
    description: 'Verify guest pickup pass by ticket/phone/OTP and atomically complete handover',
  })
  async vendorVerifyAndHandover(
    @CurrentVendor() user: AuthVendorUser,
    @Args('searchCode') searchCode: string,
    @Args('otp', { nullable: true }) otp?: string,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorOrderVerificationResultModel> {
    const targetBranchId = branchId || user.branchId;
    return this.ordersService.verifyAndHandover(targetBranchId, searchCode, otp);
  }
}
