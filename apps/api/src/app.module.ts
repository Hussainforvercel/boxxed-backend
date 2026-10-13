import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import Redis from 'ioredis';

import { validationExceptionFactory } from './common/errors/validation-exception.factory';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppConfigModule } from './config/config.module';
import { AppGraphQLModule } from './graphql/graphql.module';
import { LoggingModule } from './infra/logging/logging.module';
import { MailModule } from './infra/mail/mail.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { REDIS_CLIENT } from './infra/redis/redis.constants';
import { RedisModule } from './infra/redis/redis.module';
import { SmsModule } from './infra/sms/sms.module';
import { AdminAnalyticsModule } from './modules/admin/admin-analytics/admin-analytics.module';
import { AdminAuthModule } from './modules/admin/admin-auth/admin-auth.module';
import { AdminBranchesModule } from './modules/admin/admin-branches/admin-branches.module';
import { AdminCatalogModule } from './modules/admin/admin-catalog/admin-catalog.module';
import { AdminDropsModule } from './modules/admin/admin-drops/admin-drops.module';
import { AdminRestaurantsModule } from './modules/admin/admin-restaurants/admin-restaurants.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsentModule } from './modules/consent/consent.module';
import { CustomerModule } from './modules/customer/customer.module';
import { HealthModule } from './modules/health/health.module';
import { OnboardingCompleteGuard } from './modules/users/onboarding-complete.guard';
import { UsersModule } from './modules/users/users.module';
import { VendorModule } from './modules/vendor/vendor.module';

/** Default limit per client: 100 requests / minute (docs/06 §7). */
const DEFAULT_THROTTLE = { name: 'default', ttl: 60_000, limit: 100 };

@Module({
  imports: [
    SentryModule.forRoot(),
    AppConfigModule,
    LoggingModule,
    PrismaModule,
    RedisModule,
    MailModule,
    SmsModule,
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [DEFAULT_THROTTLE],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    AppGraphQLModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ConsentModule,
    CustomerModule,
    AdminAuthModule,
    AdminRestaurantsModule,
    AdminBranchesModule,
    AdminDropsModule,
    AdminCatalogModule,
    AdminAnalyticsModule,
    VendorModule,
  ],
  providers: [
    // Order matters: authenticate first so the throttler can key by user id (docs/06 §4, §7).
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: OnboardingCompleteGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        exceptionFactory: validationExceptionFactory,
      }),
    },
  ],
})
export class AppModule {}
