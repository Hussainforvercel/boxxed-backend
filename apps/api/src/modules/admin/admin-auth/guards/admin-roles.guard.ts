import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../../common/errors/domain-error';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

import type { AdminRole } from '../../../../generated/prisma/enums';
import type { AuthAdminUser } from '../auth-admin-user';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    let user: AuthAdminUser | undefined;
    if (context.getType<GqlContextType>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        req?: { user?: AuthAdminUser };
      }>();
      user = gqlContext.req?.user;
    } else {
      user = context.switchToHttp().getRequest<{ user?: AuthAdminUser }>()?.user;
    }

    if (!user) {
      throw new DomainError(
        ErrorCode.ADMIN_UNAUTHORIZED,
        'Administrative authentication required.',
      );
    }

    if (!requiredRoles.includes(user.role)) {
      throw new DomainError(
        ErrorCode.ADMIN_FORBIDDEN,
        `Forbidden: Role '${user.role}' lacks permission for this operation.`,
      );
    }

    return true;
  }
}
