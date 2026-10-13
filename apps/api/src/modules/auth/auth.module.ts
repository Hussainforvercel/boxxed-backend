import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { OtpService } from './otp/otp.service';
import { GoogleIdTokenVerifier } from './strategies/google-id-token.verifier';
import { GoogleStrategy } from './strategies/google.strategy';
import { EmailOtpStrategy, PhoneOtpStrategy } from './strategies/otp-strategies';
import { TokenService } from './tokens/token.service';
import { UsersModule } from '../users/users.module';

@Module({
  // Secrets are passed per call: access and refresh tokens use different ones.
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtAccessStrategy,
    EmailOtpStrategy,
    PhoneOtpStrategy,
    GoogleStrategy,
    GoogleIdTokenVerifier,
    AuthResolver,
  ],
  exports: [TokenService],
})
export class AuthModule {}
