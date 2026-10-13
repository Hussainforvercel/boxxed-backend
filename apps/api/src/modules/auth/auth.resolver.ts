import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import {
  RefreshSessionInput,
  RequestOtpInput,
  SignInWithGoogleInput,
  SignOutInput,
  VerifyOtpInput,
} from './dto/auth.inputs';
import { AuthPayload } from './models/auth-payload.model';
import { OtpChallenge } from './models/otp-challenge.model';
import { ClientIp } from '../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

import type { AuthUser } from '../../common/auth/auth-user';

/** Stricter than the default 100/min for credential-checking operations (docs/06 §7). */
const STRICT = { default: { limit: 20, ttl: 60_000 } };

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  /** D-4, D-5, D-6 resend. Same response whether or not an account exists. */
  @Public()
  @Mutation(() => OtpChallenge)
  requestOtp(@Args('input') input: RequestOtpInput, @ClientIp() ip: string): Promise<OtpChallenge> {
    return this.auth.requestOtp(input, ip);
  }

  /** D-6. Sign-in-or-sign-up. */
  @Public()
  @Throttle(STRICT)
  @Mutation(() => AuthPayload)
  verifyOtp(@Args('input') input: VerifyOtpInput, @ClientIp() ip: string): Promise<AuthPayload> {
    return this.auth.verifyOtp(input, input.code, ip);
  }

  /** D-4, D-5. Sign-in-or-sign-up. */
  @Public()
  @Throttle(STRICT)
  @Mutation(() => AuthPayload)
  signInWithGoogle(@Args('input') input: SignInWithGoogleInput): Promise<AuthPayload> {
    return this.auth.signInWithGoogle(input.idToken);
  }

  /** Silent refresh. Rotates the refresh token; reuse of an old one ends the session. */
  @Public()
  @Throttle(STRICT)
  @Mutation(() => AuthPayload)
  refreshSession(@Args('input') input: RefreshSessionInput): Promise<AuthPayload> {
    return this.auth.refreshSession(input.refreshToken);
  }

  /** P-6. Revokes this device's session; the access token simply expires. */
  @Mutation(() => Boolean)
  signOut(@CurrentUser() caller: AuthUser, @Args('input') input: SignOutInput): Promise<boolean> {
    return this.auth.signOut(input.refreshToken, caller.id);
  }
}
