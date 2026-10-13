import type { ExecutionContext } from '@nestjs/common';

/** A minimal ExecutionContext for guard unit tests (GraphQL or HTTP). */
export function gqlContext(gqlCtx: Record<string, unknown>): ExecutionContext {
  const args = [{}, {}, gqlCtx, {}];
  return {
    getType: () => 'graphql',
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    getHandler: () => function handler() {},
    getClass: () => class Target {},
    switchToHttp: () => {
      throw new Error('not http');
    },
  } as unknown as ExecutionContext;
}

export function httpContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    getArgs: () => [req, {}],
    getArgByIndex: (index: number) => [req, {}][index],
    getHandler: () => function handler() {},
    getClass: () => class Target {},
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
}
