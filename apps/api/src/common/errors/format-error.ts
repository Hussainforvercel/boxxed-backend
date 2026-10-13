import { unwrapResolverError } from '@apollo/server/errors';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { GraphQLError } from 'graphql';

import { ErrorCode, isErrorCode } from '@boxxed/shared';

import { DomainError } from './domain-error';

import type { GraphQLFormattedError } from 'graphql';

const logger = new Logger('GraphQL');

const GENERIC_MESSAGE = 'Something went wrong';

/** Apollo / Nest built-in codes that mean "the client sent a bad operation". */
const CLIENT_OPERATION_CODES = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_REQUEST',
  'OPERATION_RESOLUTION_FAILURE',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
]);

const HTTP_STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_USER_INPUT,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

/**
 * Apollo `formatError`: every error leaves the API with a code from the closed ErrorCode set,
 * a safe message and no stack trace (docs/09 §Error format). Unexpected errors are logged.
 */
export function formatError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  const base: GraphQLFormattedError = {
    message: formatted.message,
    ...(formatted.locations ? { locations: formatted.locations } : {}),
    ...(formatted.path ? { path: formatted.path } : {}),
  };

  if (original instanceof DomainError) {
    return {
      ...base,
      message: original.message,
      extensions: { ...original.extensions, code: original.code },
    };
  }

  if (original instanceof HttpException) {
    const code = HTTP_STATUS_CODES[original.getStatus()];
    if (code) return { ...base, message: original.message, extensions: { code } };
  }

  const builtIn = formatted.extensions?.['code'];
  if (typeof builtIn === 'string' && CLIENT_OPERATION_CODES.has(builtIn)) {
    return { ...base, extensions: { code: ErrorCode.BAD_USER_INPUT } };
  }
  if (original instanceof GraphQLError && isErrorCode(original.extensions['code'])) {
    return { ...base, extensions: { code: original.extensions['code'] } };
  }

  logger.error(original instanceof Error ? (original.stack ?? original.message) : String(original));
  Sentry.captureException(original); // no-op unless SENTRY_DSN is set
  return { ...base, message: GENERIC_MESSAGE, extensions: { code: ErrorCode.INTERNAL } };
}
