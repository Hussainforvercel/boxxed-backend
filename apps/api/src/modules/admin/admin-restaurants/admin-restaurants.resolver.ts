import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminRestaurantsService } from './admin-restaurants.service';
import { CreateRestaurantOnboardingInput } from './dto/create-restaurant-onboarding.input';
import { RestaurantModel } from './models/restaurant.model';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole, PartnerStatus } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';

@Resolver(() => RestaurantModel)
export class AdminRestaurantsResolver {
  constructor(private readonly restaurantsService: AdminRestaurantsService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Mutation(() => RestaurantModel, {
    name: 'adminCreateRestaurantWithBranch',
    description: 'Onboards a new restaurant partner and its primary branch atomically',
  })
  async adminCreateRestaurantWithBranch(
    @Args('input') input: CreateRestaurantOnboardingInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<RestaurantModel> {
    return this.restaurantsService.createRestaurantWithBranch(input, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => [RestaurantModel], {
    name: 'adminRestaurants',
    description: 'List restaurant partners with optional search and status filtering',
  })
  async adminRestaurants(
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => PartnerStatus, nullable: true }) status?: PartnerStatus,
    @Args('page', { type: () => Int, defaultValue: 1 }) page = 1,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit = 50,
  ): Promise<RestaurantModel[]> {
    return this.restaurantsService.listRestaurants(search, status, limit, page);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Query(() => RestaurantModel, {
    name: 'adminRestaurantDetail',
    description: 'Fetch full 360 profile for a restaurant partner by ID or Slug',
  })
  async adminRestaurantDetail(@Args('id') id: string): Promise<RestaurantModel> {
    return this.restaurantsService.getRestaurantById(id);
  }
}
