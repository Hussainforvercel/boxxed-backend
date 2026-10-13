import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { VendorJwtStrategy } from './strategies/vendor-jwt.strategy';
import { VendorAuthResolver } from './vendor-auth.resolver';
import { VendorAuthService } from './vendor-auth.service';
import { AppConfigModule } from '../../../config/config.module';
import { PrismaModule } from '../../../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AppConfigModule, PassportModule, JwtModule.register({})],
  providers: [VendorAuthService, VendorAuthResolver, VendorJwtStrategy],
  exports: [VendorAuthService, VendorJwtStrategy],
})
export class VendorAuthModule {}
