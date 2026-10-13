import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GraphQLError } from 'graphql';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from './domain-error';
import { formatError } from './format-error';

import type { GraphQLFormattedError } from 'graphql';

function run(
  error: unknown,
  formatted: Partial<GraphQLFormattedError> = {},
): GraphQLFormattedError {
  return formatError({ message: 'raw message', path: ['health'], ...formatted }, error);
}

describe('formatError', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('passes DomainError code, message and extensions through', () => {
    const result = run(
      new DomainError(ErrorCode.RATE_LIMITED, 'Slow down', { retryAfterSeconds: 30 }),
    );
    expect(result).toEqual({
      message: 'Slow down',
      path: ['health'],
      extensions: { code: 'RATE_LIMITED', retryAfterSeconds: 30 },
    });
  });

  it('maps Nest HTTP exceptions to codes', () => {
    expect(run(new UnauthorizedException()).extensions).toEqual({ code: 'UNAUTHENTICATED' });
    expect(run(new NotFoundException()).extensions).toEqual({ code: 'NOT_FOUND' });
  });

  it('maps Apollo parse/validation failures to BAD_USER_INPUT', () => {
    const error = new GraphQLError('Cannot query field "nope"');
    const result = run(error, { extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } });
    expect(result.extensions).toEqual({ code: 'BAD_USER_INPUT' });
  });

  it('hides unexpected errors behind INTERNAL with a generic message and no stack', () => {
    const result = run(new TypeError('db password is wrong'), {
      extensions: { code: 'INTERNAL_SERVER_ERROR', stacktrace: ['secret'] },
    });
    expect(result).toEqual({
      message: 'Something went wrong',
      path: ['health'],
      extensions: { code: 'INTERNAL' },
    });
  });
});
