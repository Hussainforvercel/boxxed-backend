import { Module } from '@nestjs/common';

import { VendorMenuResolver } from './vendor-menu.resolver';
import { VendorMenuService } from './vendor-menu.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorMenuService, VendorMenuResolver],
  exports: [VendorMenuService],
})
export class VendorMenuModule {}
