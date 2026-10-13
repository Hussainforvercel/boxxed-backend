import { Logger } from '@nestjs/common';
import { ExternalExceptionFilter } from '@nestjs/core/exceptions/external-exception-filter';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from './domain-error';

import type { ArgumentsHost } from '@nestjs/common';

describe('DomainError', () => {
  it('carries its code and extensions', () => {
    const error = new DomainError(ErrorCode.OTP_INVALID, 'Wrong code', { attemptsRemaining: 2 });
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: 'OTP_INVALID', extensions: { attemptsRemaining: 2 } });
  });

  it('is not logged as an error by Nest (expected outcomes are not incidents)', () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new ExternalExceptionFilter();
    const host = {} as ArgumentsHost;

    expect(() => filter.catch(new DomainError(ErrorCode.REFRESH_INVALID, 'x'), host)).toThrow();
    expect(logged).not.toHaveBeenCalled();

    expect(() => filter.catch(new Error('unexpected'), host)).toThrow();
    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });
});
