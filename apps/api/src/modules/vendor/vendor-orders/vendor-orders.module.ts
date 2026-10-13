import { Module } from '@nestjs/common';

import { VendorOrdersResolver } from './vendor-orders.resolver';
import { VendorOrdersService } from './vendor-orders.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorOrdersService, VendorOrdersResolver],
  exports: [VendorOrdersService],
})
export class VendorOrdersModule {}
