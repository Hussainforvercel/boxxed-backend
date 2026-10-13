import { Module } from '@nestjs/common';

import { VendorReviewsResolver } from './vendor-reviews.resolver';
import { VendorReviewsService } from './vendor-reviews.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module';

@Module({
  imports: [PrismaModule, VendorAuthModule],
  providers: [VendorReviewsService, VendorReviewsResolver],
  exports: [VendorReviewsService],
})
export class VendorReviewsModule {}
