import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminRestaurantsService } from './admin-restaurants.service';
import { CreateRestaurantOnboardingInput } from './dto/create-restaurant-onboarding.input';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole, PartnerStatus } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';
import type { RestaurantModel } from './models/restaurant.model';

@Controller('admin/restaurants')
export class AdminRestaurantsController {
  constructor(private readonly restaurantsService: AdminRestaurantsService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  async onboard(
    @Body() input: CreateRestaurantOnboardingInput,
    @CurrentAdmin() admin: AuthAdminUser,
  ): Promise<RestaurantModel> {
    return this.restaurantsService.createRestaurantWithBranch(input, admin);
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Get()
  async list(
    @Query('search') search?: string,
    @Query('status') status?: PartnerStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<RestaurantModel[]> {
    const pageNum = page ? Number.parseInt(page, 10) : 1;
    const limitNum = limit ? Number.parseInt(limit, 10) : 50;
    return this.restaurantsService.listRestaurants(
      search,
      status,
      Number.isNaN(limitNum) ? 50 : limitNum,
      Number.isNaN(pageNum) ? 1 : pageNum,
    );
  }

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Get(':id')
  async getById(@Param('id') id: string): Promise<RestaurantModel> {
    return this.restaurantsService.getRestaurantById(id);
  }
}
