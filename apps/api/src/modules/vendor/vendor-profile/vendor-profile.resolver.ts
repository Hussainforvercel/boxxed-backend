import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { UpdateVendorProfileInput } from './dto/vendor-profile.input';
import {
  VendorBranchStationModel,
  VendorRestaurantProfileModel,
} from './models/vendor-profile.model';
import { VendorProfileService } from './vendor-profile.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorProfileResolver {
  constructor(private readonly profileService: VendorProfileService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorRestaurantProfileModel, {
    name: 'vendorRestaurantProfile',
    description: 'Get restaurant merchant profile with branches and station credentials',
  })
  async vendorRestaurantProfile(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorRestaurantProfileModel> {
    const targetId = restaurantId || user.restaurantId;
    return this.profileService.getProfile(targetId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorBranchStationModel], {
    name: 'vendorBranches',
    description: 'List kitchen operational stations for the merchant restaurant',
  })
  async vendorBranches(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorBranchStationModel[]> {
    const targetId = restaurantId || user.restaurantId;
    const profile = await this.profileService.getProfile(targetId);
    return profile.branches;
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorRestaurantProfileModel, {
    name: 'vendorUpdateProfile',
    description: 'Update trading details of the restaurant profile',
  })
  async vendorUpdateProfile(
    @CurrentVendor() user: AuthVendorUser,
    @Args('input') input: UpdateVendorProfileInput,
  ): Promise<VendorRestaurantProfileModel> {
    return this.profileService.updateProfile(user.restaurantId, input);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorBranchStationModel, {
    name: 'vendorToggleBusyMode',
    description: 'Toggle branch kitchen busy mode / throttle status',
  })
  async vendorToggleBusyMode(
    @Args('branchId') branchId: string,
  ): Promise<VendorBranchStationModel> {
    return this.profileService.toggleBusyMode(branchId);
  }
}
