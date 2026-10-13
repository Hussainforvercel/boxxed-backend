import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminBranchesService } from './admin-branches.service';
import { InviteBranchStaffInput, UpdateBranchThrottleInput } from './dto/branch-inputs';
import {
  BranchDetailModel,
  BranchOperatingScheduleModel,
  BranchStaffModel,
} from './models/branch.model';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole, BranchStatus } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';

@Resolver(() => BranchDetailModel)
export class AdminBranchesResolver {
  constructor(private readonly branchesService: AdminBranchesService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [BranchDetailModel], {
    name: 'adminBranches',
    description: 'Paginated list of branches with operational metrics',
  })
  async adminBranches(
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => BranchStatus, nullable: true }) status?: BranchStatus,
    @Args('page', { type: () => Int, defaultValue: 1 }) page = 1,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit = 50,
  ): Promise<BranchDetailModel[]> {
    return this.branchesService.listBranches(restaurantId, search, status, page, limit);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => BranchDetailModel, {
    name: 'adminBranchDetail',
    description: 'Detailed operational view of a physical branch',
  })
  async adminBranchDetail(@Args('id') id: string): Promise<BranchDetailModel> {
    return this.branchesService.getBranchDetail(id);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [BranchOperatingScheduleModel], {
    name: 'adminBranchSchedule',
    description: 'Weekly 7-day operating schedule for branch',
  })
  async adminBranchSchedule(
    @Args('branchId') branchId: string,
  ): Promise<BranchOperatingScheduleModel[]> {
    return this.branchesService.getBranchSchedule(branchId);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => BranchDetailModel, {
    name: 'adminToggleOrderIngestion',
    description: 'Instant killswitch toggle for customer reservations on a branch',
  })
  async adminToggleOrderIngestion(
    @Args('branchId') branchId: string,
    @Args('enabled', { type: () => Boolean }) enabled: boolean,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    return this.branchesService.toggleOrderIngestion(branchId, enabled, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => BranchDetailModel, {
    name: 'adminUpdateBranchThrottle',
    description: 'Update rush-hour prep buffer minutes and throttling on branch',
  })
  async adminUpdateBranchThrottle(
    @Args('input') input: UpdateBranchThrottleInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    return this.branchesService.updateBranchThrottle(input, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => BranchDetailModel, {
    name: 'adminEmergencyBranchShutdown',
    description: 'Emergency shutdown: cancel active drops and close intake',
  })
  async adminEmergencyBranchShutdown(
    @Args('branchId') branchId: string,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    return this.branchesService.emergencyBranchShutdown(branchId, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => BranchStaffModel, {
    name: 'adminInviteBranchStaff',
    description: 'Invite new staff member to branch management roster',
  })
  async adminInviteBranchStaff(
    @Args('input') input: InviteBranchStaffInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<BranchStaffModel> {
    return this.branchesService.inviteBranchStaff(
      input.branchId,
      input.name,
      input.email,
      input.role,
      admin,
    );
  }
}
