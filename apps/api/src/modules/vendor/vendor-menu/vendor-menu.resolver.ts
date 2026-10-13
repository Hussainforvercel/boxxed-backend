import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CreateVendorMenuItemInput } from './dto/vendor-menu.input';
import { VendorMenuItemModel } from './models/vendor-menu.model';
import { VendorMenuService } from './vendor-menu.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorMenuResolver {
  constructor(private readonly menuService: VendorMenuService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorMenuItemModel], {
    name: 'vendorMenu',
    description: 'Get culinary dish catalog for restaurant with branch 86 stock status',
  })
  async vendorMenu(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorMenuItemModel[]> {
    const targetRestaurantId = restaurantId || user.restaurantId;
    const targetBranchId = branchId || user.branchId;
    return this.menuService.listMenuItems(targetRestaurantId, targetBranchId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorMenuItemModel], {
    name: 'vendorBranchMenu',
    description: 'Get culinary dish catalog for restaurant with branch 86 stock status',
  })
  async vendorBranchMenu(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorMenuItemModel[]> {
    const targetRestaurantId = restaurantId || user.restaurantId;
    const targetBranchId = branchId || user.branchId;
    return this.menuService.listMenuItems(targetRestaurantId, targetBranchId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorMenuItemModel, {
    name: 'vendorToggleMenuItemAvailability',
    description: 'Toggle branch 86 kitchen out-of-stock switch for dish',
  })
  async vendorToggleMenuItemAvailability(
    @CurrentVendor() user: AuthVendorUser,
    @Args('menuItemId') menuItemId: string,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorMenuItemModel> {
    const targetBranchId = branchId || user.branchId;
    return this.menuService.toggleAvailability(targetBranchId, menuItemId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorMenuItemModel, {
    name: 'vendorCreateMenuItem',
    description: 'Register a permanent or 7-day temporary dish to the master catalog',
  })
  async vendorCreateMenuItem(
    @CurrentVendor() user: AuthVendorUser,
    @Args('input') input: CreateVendorMenuItemInput,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorMenuItemModel> {
    const targetRestaurantId = restaurantId || user.restaurantId;
    return this.menuService.createMenuItem(targetRestaurantId, input);
  }
}
