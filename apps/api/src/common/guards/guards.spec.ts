import { Reflector } from '@nestjs/core';

import { ErrorCode } from '@boxxed/shared';

import { GqlAuthGuard } from './gql-auth.guard';
import { RolesGuard } from './roles.guard';
import { gqlContext, httpContext } from './test-context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainError } from '../errors/domain-error';

import type { AuthUser } from '../auth/auth-user';

const USER: AuthUser = { id: 'u1', role: 'CUSTOMER', onboardingStep: 'COMPLETE' };

function reflectorWith(metadata: Record<string, unknown>): Reflector {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => metadata[key as string]);
  return reflector;
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : 'not a DomainError';
  }
  return undefined;
}

describe('GqlAuthGuard', () => {
  it('lets @Public() operations through without a token', async () => {
    const guard = new GqlAuthGuard(reflectorWith({ [IS_PUBLIC_KEY]: true }));
    await expect(
      Promise.resolve(guard.canActivate(gqlContext({ req: { headers: {} } }))),
    ).resolves.toBe(true);
  });

  it('reads the request from GraphQL-over-HTTP and REST contexts', () => {
    const guard = new GqlAuthGuard(reflectorWith({}));
    const req = { headers: { authorization: 'Bearer x' } };
    expect(guard.getRequest(gqlContext({ req }))).toBe(req);
    expect(guard.getRequest(httpContext(req))).toBe(req);
  });

  it('turns graphql-ws connectionParams into a request with the Bearer header', () => {
    const guard = new GqlAuthGuard(reflectorWith({}));
    const ctx: Record<string, unknown> = { connectionParams: { authorization: 'Bearer ws-token' } };
    const req = guard.getRequest(gqlContext(ctx));
    expect(req.headers.authorization).toBe('Bearer ws-token');
    expect(ctx['req']).toBe(req); // @CurrentUser reads the same object
  });

  it('handles a WS connection without credentials as unauthenticated', () => {
    const guard = new GqlAuthGuard(reflectorWith({}));
    expect(guard.getRequest(gqlContext({ connectionParams: {} })).headers).toEqual({});
  });

  it('maps a missing or invalid user to UNAUTHENTICATED', () => {
    const guard = new GqlAuthGuard(reflectorWith({}));
    expect(codeOf(() => guard.handleRequest(null, false))).toBe(ErrorCode.UNAUTHENTICATED);
    expect(codeOf(() => guard.handleRequest(new Error('jwt expired'), USER))).toBe(
      ErrorCode.UNAUTHENTICATED,
    );
    expect(guard.handleRequest(null, USER)).toBe(USER);
  });
});

describe('RolesGuard', () => {
  it('allows anything without @Roles', () => {
    const guard = new RolesGuard(reflectorWith({}));
    expect(guard.canActivate(gqlContext({ req: {} }))).toBe(true);
  });

  it('allows a matching role', () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ['VENDOR_STAFF'] }));
    const req = { user: { ...USER, role: 'VENDOR_STAFF' } };
    expect(guard.canActivate(gqlContext({ req }))).toBe(true);
  });

  it('returns FORBIDDEN for another role and UNAUTHENTICATED without a user', () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ['VENDOR_STAFF'] }));
    expect(codeOf(() => guard.canActivate(gqlContext({ req: { user: USER } })))).toBe(
      ErrorCode.FORBIDDEN,
    );
    expect(codeOf(() => guard.canActivate(gqlContext({ req: {} })))).toBe(
      ErrorCode.UNAUTHENTICATED,
    );
  });
});
