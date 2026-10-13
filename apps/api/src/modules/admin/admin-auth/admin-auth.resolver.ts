import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminAuthService } from './admin-auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminLoginInput } from './dto/admin-login.input';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminAuthPayload, AdminUserModel } from './models/admin-auth-payload.model';
import { Public } from '../../../common/decorators/public.decorator';

import type { AuthAdminUser } from './auth-admin-user';

@Resolver()
export class AdminAuthResolver {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Mutation(() => AdminAuthPayload, {
    name: 'adminLogin',
    description: 'Authenticate Super Admin / Operations user and obtain administrative JWT',
  })
  async adminLogin(@Args('input') input: AdminLoginInput): Promise<AdminAuthPayload> {
    return this.adminAuthService.login(input);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Query(() => AdminUserModel, {
    name: 'adminMe',
    description: 'Fetch current authenticated admin operator profile',
  })
  async adminMe(@CurrentAdmin() admin: AuthAdminUser): Promise<AdminUserModel> {
    return this.adminAuthService.getAdminProfile(admin.id);
  }
}
