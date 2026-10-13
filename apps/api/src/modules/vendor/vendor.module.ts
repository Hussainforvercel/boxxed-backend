import { Module } from '@nestjs/common';

import { VendorAuthModule } from './vendor-auth/vendor-auth.module';
import { VendorDropsModule } from './vendor-drops/vendor-drops.module';
import { VendorMenuModule } from './vendor-menu/vendor-menu.module';
import { VendorOrdersModule } from './vendor-orders/vendor-orders.module';
import { VendorOverviewModule } from './vendor-overview/vendor-overview.module';
import { VendorPayoutsModule } from './vendor-payouts/vendor-payouts.module';
import { VendorProfileModule } from './vendor-profile/vendor-profile.module';
import { VendorReviewsModule } from './vendor-reviews/vendor-reviews.module';

@Module({
  imports: [
    VendorAuthModule,
    VendorProfileModule,
    VendorOverviewModule,
    VendorOrdersModule,
    VendorDropsModule,
    VendorMenuModule,
    VendorPayoutsModule,
    VendorReviewsModule,
  ],
  exports: [
    VendorAuthModule,
    VendorProfileModule,
    VendorOverviewModule,
    VendorOrdersModule,
    VendorDropsModule,
    VendorMenuModule,
    VendorPayoutsModule,
    VendorReviewsModule,
  ],
})
export class VendorModule {}
