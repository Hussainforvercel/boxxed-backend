import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../errors/domain-error';

import type { AuthUser } from '../auth/auth-user';
import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * Throttler that understands GraphQL contexts. Keyed by user id when GqlAuthGuard (registered
 * first) authenticated the caller, otherwise by client IP (docs/06 §7).
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (context.getType<GqlContextType>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return {
        req: req as unknown as Record<string, unknown>,
        res: res as unknown as Record<string, unknown>,
      };
    }
    return super.getRequestResponse(context);
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & { user?: AuthUser };
    if (request.user) return `user:${request.user.id}`;
    return request.ips.length > 0
      ? (request.ips[0] ?? request.ip ?? 'unknown')
      : (request.ip ?? 'unknown');
  }

  protected override generateKey(
    _context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    const hashed = createHash('sha256').update(tracker).digest('hex').slice(0, 32);
    return `thr:${throttlerName}:${hashed}`;
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    if (context.getType<GqlContextType>() !== 'graphql') {
      return super.throwThrottlingException(context, detail);
    }
    throw new DomainError(ErrorCode.RATE_LIMITED, 'Too many requests. Try again later.', {
      retryAfterSeconds: Math.max(1, Math.ceil(detail.timeToBlockExpire)),
    });
  }
}
