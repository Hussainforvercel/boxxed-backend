import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthAdminUser } from '../auth-admin-user';
import type { ExecutionContext } from '@nestjs/common';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthAdminUser | undefined => {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext()?.req ?? context.switchToHttp().getRequest();
    return req?.user as AuthAdminUser | undefined;
  },
);
