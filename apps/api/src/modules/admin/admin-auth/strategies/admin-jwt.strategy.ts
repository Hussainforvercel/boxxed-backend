import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfig } from '../../../../config/app-config.service';
import { AdminRole } from '../../../../generated/prisma/enums';

import type { AuthAdminUser } from '../auth-admin-user';

export const ADMIN_JWT_STRATEGY = 'admin-jwt-strategy';
const ADMIN_ROLES = new Set<string>(Object.values(AdminRole));

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, ADMIN_JWT_STRATEGY) {
  constructor(config: AppConfig) {
    const { accessSecret, issuer, audience } = config.jwt;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: accessSecret,
      issuer,
      audience,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  validate(payload: Record<string, unknown>): AuthAdminUser | false {
    const { sub, email, role, type } = payload;
    if (type !== 'admin') return false;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      return false;
    }
    if (!ADMIN_ROLES.has(role)) return false;
    return { id: sub, email, role: role as AdminRole };
  }
}
