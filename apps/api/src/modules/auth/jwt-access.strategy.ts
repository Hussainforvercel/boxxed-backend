import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CLOCK_TOLERANCE_SECONDS } from './tokens/token.service';
import { AppConfig } from '../../config/app-config.service';
import { OnboardingStep, UserRole } from '../../generated/prisma/enums';

import type { AuthUser } from '../../common/auth/auth-user';

export const JWT_ACCESS = 'jwt-access';

const ROLES = new Set<string>(Object.values(UserRole));
const STEPS = new Set<string>(Object.values(OnboardingStep));

/**
 * passport-jwt strategy behind GqlAuthGuard: Bearer access token, JWT_ACCESS_SECRET, HS256,
 * `iss`/`aud` checked, 30 s clock tolerance (docs/06 §4). Refresh tokens never verify here
 * (different secret).
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, JWT_ACCESS) {
  constructor(config: AppConfig) {
    const { accessSecret, issuer, audience } = config.jwt;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: accessSecret,
      issuer,
      audience,
      algorithms: ['HS256'],
      ignoreExpiration: false,
      jsonWebTokenOptions: { clockTolerance: CLOCK_TOLERANCE_SECONDS },
    });
  }

  validate(payload: Record<string, unknown>): AuthUser | false {
    const { sub, role, onb } = payload;
    if (typeof sub !== 'string' || typeof role !== 'string' || typeof onb !== 'string') {
      return false;
    }
    if (!ROLES.has(role) || !STEPS.has(onb)) return false;
    return { id: sub, role: role as UserRole, onboardingStep: onb as OnboardingStep };
  }
}
