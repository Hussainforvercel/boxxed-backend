import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthVendorUser } from '../auth-vendor-user';
import type { ExecutionContext } from '@nestjs/common';

export const CurrentVendor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthVendorUser => {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req ?? context.switchToHttp().getRequest();
    return req.user as AuthVendorUser;
  },
);
