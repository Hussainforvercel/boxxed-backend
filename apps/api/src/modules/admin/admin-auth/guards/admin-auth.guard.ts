import { Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../../common/errors/domain-error';
import { ADMIN_JWT_STRATEGY } from '../strategies/admin-jwt.strategy';

import type { AuthAdminUser } from '../auth-admin-user';
import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';

@Injectable()
export class AdminAuthGuard extends AuthGuard(ADMIN_JWT_STRATEGY) {
  override getRequest(context: ExecutionContext): unknown {
    if (context.getType<GqlContextType>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{ req: unknown }>();
      return gqlContext.req;
    }
    return context.switchToHttp().getRequest();
  }

  override handleRequest<TUser = AuthAdminUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) {
      throw new DomainError(
        ErrorCode.ADMIN_UNAUTHORIZED,
        'Administrative authentication required.',
      );
    }
    return user;
  }
}
