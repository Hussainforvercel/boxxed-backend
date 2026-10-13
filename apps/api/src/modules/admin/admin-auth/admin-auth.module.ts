import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthResolver } from './admin-auth.resolver';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AppConfig } from '../../../config/app-config.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt-strategy' }),
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.accessSecret,
        signOptions: {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminAuthResolver,
    AdminJwtStrategy,
    AdminAuthGuard,
    AdminRolesGuard,
  ],
  exports: [AdminAuthService, AdminAuthGuard, AdminRolesGuard],
})
export class AdminAuthModule {}
