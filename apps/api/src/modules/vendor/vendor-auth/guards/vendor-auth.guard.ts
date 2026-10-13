import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../../common/errors/domain-error';
import { VENDOR_JWT_STRATEGY } from '../strategies/vendor-jwt.strategy';

import type { AuthVendorUser } from '../auth-vendor-user';

@Injectable()
export class VendorAuthGuard extends AuthGuard(VENDOR_JWT_STRATEGY) {
  override getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    if (req) return req;
    return context.switchToHttp().getRequest();
  }

  override handleRequest<TUser = AuthVendorUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) {
      throw new DomainError(
        ErrorCode.VENDOR_UNAUTHORIZED,
        'Merchant authentication required. Please sign in with valid station credentials.',
      );
    }
    return user;
  }
}
