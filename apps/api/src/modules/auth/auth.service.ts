import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { AuthPayload } from './models/auth-payload.model';
import { OtpService } from './otp/otp.service';
import { OtpChannel } from './otp/otp.types';
import { GoogleStrategy } from './strategies/google.strategy';
import { EmailOtpStrategy, PhoneOtpStrategy } from './strategies/otp-strategies';
import { TokenService } from './tokens/token.service';
import { DomainError } from '../../common/errors/domain-error';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';

import type { OtpChallengeIssued } from './otp/otp.types';
import type { VerifiedIdentity } from './strategies/identity-strategy';
import type { AccessToken } from './tokens/token.types';
import type { User } from '../../generated/prisma/client';

export interface OtpDestination {
  channel: OtpChannel;
  /** Normalized by the input DTO: lowercased email or E.164 phone. */
  destination: string;
}

/** Orchestrates sign-in for every provider through one path (docs/06 §5). */
@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly emailOtp: EmailOtpStrategy,
    private readonly phoneOtp: PhoneOtpStrategy,
    private readonly google: GoogleStrategy,
  ) {}

  requestOtp({ channel, destination }: OtpDestination, ip: string): Promise<OtpChallengeIssued> {
    return this.otp.request({ purpose: 'SIGN_IN', channel, destination }, ip);
  }

  async verifyOtp(target: OtpDestination, code: string, ip: string): Promise<AuthPayload> {
    const strategy = target.channel === OtpChannel.EMAIL ? this.emailOtp : this.phoneOtp;
    return this.signIn(await strategy.verify({ destination: target.destination, code, ip }));
  }

  async signInWithGoogle(idToken: string): Promise<AuthPayload> {
    return this.signIn(await this.google.verify({ idToken }));
  }

  /** The single sign-in path: find/link/create the user, then start a new session. */
  async signIn(identity: VerifiedIdentity): Promise<AuthPayload> {
    const { user, isNewUser } = await this.users.resolveIdentity(identity);
    const session = await this.tokens.createSession(user);
    return toPayload(session, session.refreshToken, user, isNewUser);
  }

  /** Rotates the refresh token; the new access token carries the user's current step/role. */
  async refreshSession(refreshToken: string): Promise<AuthPayload> {
    const rotated = await this.tokens.rotate(refreshToken);
    const user = await this.users.findById(rotated.userId);
    if (!user) {
      await this.tokens.revokeAllForUser(rotated.userId);
      throw new DomainError(ErrorCode.REFRESH_INVALID, 'Your session has ended. Sign in again.');
    }
    const access = await this.tokens.signAccess(user);
    return toPayload(access, rotated.refreshToken, user, false);
  }

  /** Always succeeds from the client's view; only the caller's own family is revoked. */
  async signOut(refreshToken: string, userId: string): Promise<boolean> {
    await this.tokens.revoke(refreshToken, userId);
    return true;
  }
}

function toPayload(
  access: AccessToken,
  refreshToken: string,
  user: User,
  isNewUser: boolean,
): AuthPayload {
  return Object.assign(new AuthPayload(), {
    accessToken: access.accessToken,
    accessTokenExpiresAt: access.accessTokenExpiresAt,
    refreshToken,
    user: UserModel.from(user),
    isNewUser,
  });
}
