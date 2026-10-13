import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ErrorCode } from '@boxxed/shared';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainError } from '../errors/domain-error';
import { requestFromContext } from '../http/request-context';

import type { UserRole } from '../../generated/prisma/enums';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/** @Roles(...) check only. Ownership ("staff of this restaurant") is checked in services. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = requestFromContext(context).user;
    if (!user) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
    if (!roles.includes(user.role)) {
      throw new DomainError(ErrorCode.FORBIDDEN, 'You do not have access to this.');
    }
    return true;
  }
}
