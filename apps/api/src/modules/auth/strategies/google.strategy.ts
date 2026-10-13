import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { GoogleIdTokenVerifier } from './google-id-token.verifier';
import { DomainError } from '../../../common/errors/domain-error';
import { normalizeEmail } from '../../../common/validation/transforms';
import { AuthProvider } from '../../../generated/prisma/enums';

import type { IdentityStrategy, VerifiedIdentity } from './identity-strategy';

/**
 * Google Sign-In. The subject is Google's `sub`. Tokens without a Google-verified email are
 * refused (decided 2026-09-24, Phase 1A): every Boxxed user needs a contact, and an unverified
 * email must never be linked to or collide with an existing account.
 */
@Injectable()
export class GoogleStrategy implements IdentityStrategy<{ idToken: string }> {
  readonly provider = AuthProvider.GOOGLE;

  constructor(private readonly verifier: GoogleIdTokenVerifier) {}

  async verify({ idToken }: { idToken: string }): Promise<VerifiedIdentity> {
    const claims = await this.verifier.verify(idToken);
    if (!claims?.email || !claims.emailVerified) {
      throw new DomainError(ErrorCode.GOOGLE_TOKEN_INVALID, 'Google sign-in failed. Try again.');
    }
    return { provider: this.provider, subject: claims.sub, email: normalizeEmail(claims.email) };
  }
}
