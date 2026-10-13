import { Module } from '@nestjs/common';

import { VendorProfileResolver } from './vendor-profile.resolver';
import { VendorProfileService } from './vendor-profile.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorProfileService, VendorProfileResolver],
  exports: [VendorProfileService],
})
export class VendorProfileModule {}
