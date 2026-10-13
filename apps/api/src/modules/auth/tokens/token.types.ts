import type { OnboardingStep, UserRole } from '../../../generated/prisma/enums';

/** What an access token says about its user. Re-read from the DB on every issue. */
export interface TokenSubject {
  id: string;
  role: UserRole;
  onboardingStep: OnboardingStep;
}

/** Access-token claims (docs/06 §5). `onb` = onboardingStep at issue time. */
export interface AccessClaims {
  sub: string;
  role: UserRole;
  onb: OnboardingStep;
}

/** Refresh-token claims: `fid` = family id, `jti` = this token's id within the family. */
export interface RefreshClaims {
  sub: string;
  fid: string;
  jti: string;
}

export interface AccessToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
}

export interface SessionTokens extends AccessToken {
  refreshToken: string;
}
