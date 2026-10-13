import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfig } from '../../../../config/app-config.service';
import { StaffRole } from '../../../../generated/prisma/enums';

import type { AuthVendorUser } from '../auth-vendor-user';

export const VENDOR_JWT_STRATEGY = 'vendor-jwt-strategy';
const STAFF_ROLES = new Set<string>(Object.values(StaffRole));

@Injectable()
export class VendorJwtStrategy extends PassportStrategy(Strategy, VENDOR_JWT_STRATEGY) {
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

  validate(payload: Record<string, unknown>): AuthVendorUser | false {
    const { sub, email, name, role, restaurantId, branchId, type } = payload;
    if (type !== 'vendor') return false;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      typeof restaurantId !== 'string' ||
      typeof branchId !== 'string'
    ) {
      return false;
    }
    if (!STAFF_ROLES.has(role)) return false;

    return {
      id: sub,
      email,
      name: typeof name === 'string' ? name : 'Merchant Operator',
      role: role as StaffRole,
      restaurantId,
      branchId,
    };
  }
}
