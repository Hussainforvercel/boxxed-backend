import { IntrinsicException } from '@nestjs/common';

import type { ErrorCode } from '@boxxed/shared';

/**
 * The only error services throw for expected failures (docs/06 §8). The GraphQL formatter
 * turns it into `{ message, extensions: { code, ...extensions } }`.
 * Intrinsic: Nest's exception filter does not log it as an error with a stack trace; an
 * expected outcome (wrong code, expired session) is not an incident.
 */
export class DomainError extends IntrinsicException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly extensions: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
