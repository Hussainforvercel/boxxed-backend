import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { AdminAuthService } from './admin-auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminLoginInput } from './dto/admin-login.input';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';

import type { AuthAdminUser } from './auth-admin-user';
import type { AdminAuthPayload, AdminUserModel } from './models/admin-auth-payload.model';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() input: AdminLoginInput): Promise<AdminAuthPayload> {
    return this.adminAuthService.login(input);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Get('me')
  async me(@CurrentAdmin() admin: AuthAdminUser): Promise<AdminUserModel> {
    return this.adminAuthService.getAdminProfile(admin.id);
  }
}
