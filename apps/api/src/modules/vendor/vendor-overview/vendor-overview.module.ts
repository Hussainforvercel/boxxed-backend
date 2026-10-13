import { Module } from '@nestjs/common';

import { VendorOverviewResolver } from './vendor-overview.resolver';
import { VendorOverviewService } from './vendor-overview.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorOverviewService, VendorOverviewResolver],
  exports: [VendorOverviewService],
})
export class VendorOverviewModule {}
