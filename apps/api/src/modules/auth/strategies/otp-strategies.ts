import { Injectable } from '@nestjs/common';

import { AuthProvider } from '../../../generated/prisma/enums';
import { OtpService } from '../otp/otp.service';
import { OtpChannel } from '../otp/otp.types';

import type { IdentityStrategy, VerifiedIdentity } from './identity-strategy';

export interface OtpSignInInput {
  destination: string;
  code: string;
  ip: string;
}

/** Email OTP: a correct code proves the (normalized) email. */
@Injectable()
export class EmailOtpStrategy implements IdentityStrategy<OtpSignInInput> {
  readonly provider = AuthProvider.EMAIL_OTP;

  constructor(private readonly otp: OtpService) {}

  async verify({ destination, code, ip }: OtpSignInInput): Promise<VerifiedIdentity> {
    await this.otp.verify({ purpose: 'SIGN_IN', channel: OtpChannel.EMAIL, destination }, code, ip);
    return { provider: this.provider, subject: destination, email: destination };
  }
}

/** Phone OTP: a correct code proves the E.164 phone. */
@Injectable()
export class PhoneOtpStrategy implements IdentityStrategy<OtpSignInInput> {
  readonly provider = AuthProvider.PHONE_OTP;

  constructor(private readonly otp: OtpService) {}

  async verify({ destination, code, ip }: OtpSignInInput): Promise<VerifiedIdentity> {
    await this.otp.verify({ purpose: 'SIGN_IN', channel: OtpChannel.PHONE, destination }, code, ip);
    return { provider: this.provider, subject: destination, phoneE164: destination };
  }
}
