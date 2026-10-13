import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import { ErrorCode } from '@boxxed/shared';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DomainError } from '../errors/domain-error';

import type { AuthUser } from '../auth/auth-user';
import type { AuthRequest } from '../http/request-context';
import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';

/** Must match JWT_ACCESS in modules/auth/jwt-access.strategy.ts. */
const STRATEGY = 'jwt-access';

interface GqlContext {
  req?: AuthRequest;
  /** graphql-ws (Phase 4): the client's `connectionParams`. */
  connectionParams?: { authorization?: unknown; Authorization?: unknown };
}

/**
 * Global guard: every operation needs a valid access token unless marked @Public()
 * (docs/06 §4). Works for REST, GraphQL over HTTP (Authorization header) and GraphQL over
 * WebSocket (`connectionParams.authorization`).
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard(STRATEGY) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context) as Promise<boolean>;
  }

  override getRequest(context: ExecutionContext): AuthRequest {
    if (context.getType<GqlContextType>() !== 'graphql') {
      return context.switchToHttp().getRequest<AuthRequest>();
    }
    const gqlContext = GqlExecutionContext.create(context).getContext<GqlContext>();
    if (gqlContext.req) return gqlContext.req;
    // WebSocket: build a request-like object so passport and @CurrentUser work unchanged.
    const params = gqlContext.connectionParams ?? {};
    const authorization = params.authorization ?? params.Authorization;
    gqlContext.req = {
      headers: typeof authorization === 'string' ? { authorization } : {},
    } as AuthRequest;
    return gqlContext.req;
  }

  override handleRequest<TUser = AuthUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
    }
    return user;
  }
}
