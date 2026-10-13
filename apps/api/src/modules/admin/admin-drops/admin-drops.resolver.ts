import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminDropsService } from './admin-drops.service';
import { CreateDropInput } from './dto/drop-inputs';
import {
  AdminDropModel,
  AdminDropPostmortemModel,
  AdminDropReservationModel,
} from './models/drop.model';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole, DropStatus } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';

@Resolver(() => AdminDropModel)
export class AdminDropsResolver {
  constructor(private readonly dropsService: AdminDropsService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [AdminDropModel], {
    name: 'adminDrops',
    description: 'Filterable list of box drops with allocation details',
  })
  async adminDrops(
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('status', { type: () => DropStatus, nullable: true }) status?: DropStatus,
    @Args('discountTier', { nullable: true }) discountTier?: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page = 1,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit = 50,
  ): Promise<AdminDropModel[]> {
    return this.dropsService.listDrops(branchId, status, discountTier, page, limit);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [AdminDropReservationModel], {
    name: 'adminDropReservations',
    description: 'Counter claim reservations ledger for a drop',
  })
  async adminDropReservations(
    @Args('dropId') dropId: string,
  ): Promise<AdminDropReservationModel[]> {
    return this.dropsService.getDropReservations(dropId);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => AdminDropPostmortemModel, {
    name: 'adminDropPostmortem',
    description: 'Waste analysis and salvage report for drop',
  })
  async adminDropPostmortem(@Args('dropId') dropId: string): Promise<AdminDropPostmortemModel> {
    return this.dropsService.getDropPostmortem(dropId);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => AdminDropModel, {
    name: 'adminCreateDrop',
    description: 'Create draft box drop allocation with pricing and pickup slot',
  })
  async adminCreateDrop(
    @Args('input') input: CreateDropInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<AdminDropModel> {
    return this.dropsService.createDrop(input, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => AdminDropModel, {
    name: 'adminPublishDrop',
    description: 'Publish draft drop to live customer application',
  })
  async adminPublishDrop(
    @Args('dropId') dropId: string,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<AdminDropModel> {
    return this.dropsService.publishDrop(dropId, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => AdminDropModel, {
    name: 'adminCancelDrop',
    description: 'Emergency drop cancellation and reservation refund trigger',
  })
  async adminCancelDrop(
    @Args('dropId') dropId: string,
    @CurrentAdmin() admin: AuthAdminUser,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<AdminDropModel> {
    return this.dropsService.cancelDrop(dropId, reason, admin);
  }
}
