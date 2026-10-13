import { createParamDecorator } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../errors/domain-error';
import { requestFromContext } from '../http/request-context';

import type { AuthUser } from '../auth/auth-user';
import type { ExecutionContext } from '@nestjs/common';

/** The caller set by GqlAuthGuard. Only valid on non-@Public operations. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user = requestFromContext(context).user;
  if (!user) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
  return user satisfies AuthUser;
});
