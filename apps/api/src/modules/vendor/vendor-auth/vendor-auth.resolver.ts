import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentVendor } from './decorators/current-vendor.decorator';
import { VendorLoginInput } from './dto/vendor-login.input';
import { VendorAuthGuard } from './guards/vendor-auth.guard';
import { VendorAuthPayload, VendorStaffProfileModel } from './models/vendor-auth-payload.model';
import { VendorAuthService } from './vendor-auth.service';
import { Public } from '../../../common/decorators/public.decorator';

import type { AuthVendorUser } from './auth-vendor-user';

@Resolver()
export class VendorAuthResolver {
  constructor(private readonly authService: VendorAuthService) {}

  @Public()
  @Mutation(() => VendorAuthPayload, {
    name: 'vendorLogin',
    description: 'Authenticate branch staff operator and issue vendor JWT session token',
  })
  async vendorLogin(@Args('input') input: VendorLoginInput): Promise<VendorAuthPayload> {
    return this.authService.login(input);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorStaffProfileModel, {
    name: 'vendorMe',
    description: 'Get profile of authenticated merchant station operator',
  })
  async vendorMe(@CurrentVendor() user: AuthVendorUser): Promise<VendorStaffProfileModel> {
    return this.authService.getProfile(user.id);
  }
}
