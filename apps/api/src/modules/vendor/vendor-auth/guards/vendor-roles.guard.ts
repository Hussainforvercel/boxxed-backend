import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../../common/errors/domain-error';
import { StaffRole } from '../../../../generated/prisma/enums';
import { VENDOR_ROLES_KEY } from '../decorators/vendor-roles.decorator';

import type { AuthVendorUser } from '../auth-vendor-user';

@Injectable()
export class VendorRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(VENDOR_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req ?? context.switchToHttp().getRequest();
    const user = req.user as AuthVendorUser | undefined;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new DomainError(
        ErrorCode.VENDOR_FORBIDDEN,
        `Access denied. Requires one of [${requiredRoles.join(', ')}] staff permissions.`,
      );
    }

    return true;
  }
}
