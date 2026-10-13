import { Module } from '@nestjs/common';

import { AdminAnalyticsResolver } from './admin-analytics.resolver';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  providers: [AdminAnalyticsService, AdminAnalyticsResolver],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
