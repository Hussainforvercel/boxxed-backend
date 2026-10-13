import { createParamDecorator } from '@nestjs/common';

import { requestFromContext } from '../http/request-context';

import type { ExecutionContext } from '@nestjs/common';

/** Client IP as resolved by express `trust proxy` (TRUST_PROXY_HOPS), for per-IP limits. */
export const ClientIp = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    requestFromContext(context).ip ?? 'unknown',
);
