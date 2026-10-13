import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthUser } from '../auth/auth-user';
import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { Request } from 'express';

/** The request-like object guards and decorators read, for HTTP, GraphQL-over-HTTP and WS. */
export type AuthRequest = Request & { user?: AuthUser };

/**
 * Returns the express request behind a REST or GraphQL call. GraphQL over WebSocket (Phase 4)
 * puts a request-like `{ headers, user }` on the context built from `connectionParams`, so
 * guards stay transport-agnostic.
 */
export function requestFromContext(context: ExecutionContext): AuthRequest {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{ req: AuthRequest }>().req;
  }
  return context.switchToHttp().getRequest<AuthRequest>();
}
