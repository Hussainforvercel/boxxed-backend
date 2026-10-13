import { Module } from '@nestjs/common';

import { VendorPayoutsController } from './vendor-payouts.controller';
import { VendorPayoutsResolver } from './vendor-payouts.resolver';
import { VendorPayoutsService } from './vendor-payouts.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  controllers: [VendorPayoutsController],
  providers: [VendorPayoutsService, VendorPayoutsResolver],
  exports: [VendorPayoutsService],
})
export class VendorPayoutsModule {}
