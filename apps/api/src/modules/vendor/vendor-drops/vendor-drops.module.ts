import { Module } from '@nestjs/common';

import { VendorDropsResolver } from './vendor-drops.resolver';
import { VendorDropsService } from './vendor-drops.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorDropsService, VendorDropsResolver],
  exports: [VendorDropsService],
})
export class VendorDropsModule {}
