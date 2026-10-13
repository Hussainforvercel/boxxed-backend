import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CreateVendorBoxInput } from './dto/vendor-drop.input';
import { VendorBoxDropModel } from './models/vendor-drop.model';
import { VendorDropsService } from './vendor-drops.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorDropsResolver {
  constructor(private readonly dropsService: VendorDropsService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorBoxDropModel], {
    name: 'vendorDrops',
    description: 'List box release drops for branch station, optionally filtered by tab',
  })
  async vendorDrops(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('filterTab', { nullable: true }) filterTab?: string,
  ): Promise<VendorBoxDropModel[]> {
    const targetBranchId = branchId || user.branchId;
    return this.dropsService.listDrops(targetBranchId, filterTab);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorBoxDropModel], {
    name: 'vendorBranchDrops',
    description: 'List active and draft box drops for branch station',
  })
  async vendorBranchDrops(
    @CurrentVendor() user: AuthVendorUser,
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('filterTab', { nullable: true }) filterTab?: string,
  ): Promise<VendorBoxDropModel[]> {
    const targetBranchId = branchId || user.branchId;
    return this.dropsService.listDrops(targetBranchId, filterTab);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorBoxDropModel, {
    name: 'vendorQuickAddStock',
    description: 'Add units to a live drop quota',
  })
  async vendorQuickAddStock(
    @Args('dropId') dropId: string,
    @Args('amount', { type: () => Int }) amount: number,
  ): Promise<VendorBoxDropModel> {
    return this.dropsService.quickAddStock(dropId, amount);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorBoxDropModel, {
    name: 'vendorToggleDropStatus',
    description: 'Toggle drop between ACTIVE and DRAFT',
  })
  async vendorToggleDropStatus(@Args('dropId') dropId: string): Promise<VendorBoxDropModel> {
    return this.dropsService.toggleDropStatus(dropId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorBoxDropModel, {
    name: 'vendorCreateDrop',
    description: 'Create and configure a new box drop for tonight service',
  })
  async vendorCreateDrop(
    @CurrentVendor() user: AuthVendorUser,
    @Args('input') input: CreateVendorBoxInput,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorBoxDropModel> {
    const targetBranchId = branchId || user.branchId;
    return this.dropsService.createDrop(targetBranchId, input);
  }
}
