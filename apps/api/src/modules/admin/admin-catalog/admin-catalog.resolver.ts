import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminCatalogService } from './admin-catalog.service';
import { CreateMasterMenuItemInput } from './dto/catalog-inputs';
import { AdminBranchMenuOverrideModel, AdminMasterMenuItemModel } from './models/catalog.model';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';

@Resolver(() => AdminMasterMenuItemModel)
export class AdminCatalogResolver {
  constructor(private readonly catalogService: AdminCatalogService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [AdminMasterMenuItemModel], {
    name: 'adminMasterMenu',
    description: 'Fetch canonical menu items for brand',
  })
  async adminMasterMenu(
    @Args('restaurantId') restaurantId: string,
  ): Promise<AdminMasterMenuItemModel[]> {
    return this.catalogService.getMasterMenu(restaurantId);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => AdminMasterMenuItemModel, {
    name: 'adminCreateMasterMenuItem',
    description: 'Add canonical item to master catalog',
  })
  async adminCreateMasterMenuItem(
    @Args('restaurantId') restaurantId: string,
    @Args('input') input: CreateMasterMenuItemInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<AdminMasterMenuItemModel> {
    return this.catalogService.createMasterMenuItem(restaurantId, input, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => AdminBranchMenuOverrideModel, {
    name: 'adminToggleBranchMenuItem',
    description: 'Toggle branch-level inclusion or exclusion of dish from mystery boxes',
  })
  async adminToggleBranchMenuItem(
    @Args('branchId') branchId: string,
    @Args('masterMenuItemId') masterMenuItemId: string,
    @Args('isAvailable', { type: () => Boolean }) isAvailable: boolean,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<AdminBranchMenuOverrideModel> {
    return this.catalogService.toggleBranchMenuItem(branchId, masterMenuItemId, isAvailable, admin);
  }
}
