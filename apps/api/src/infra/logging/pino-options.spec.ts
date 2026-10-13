import { Writable } from 'node:stream';

import pino from 'pino';

import { REDACT_PATHS } from './pino-options';

describe('log redaction', () => {
  it('censors tokens, OTP codes and contact details', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    const logger = pino({ redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } }, sink);

    logger.info({
      req: { headers: { authorization: 'Bearer secret-token' } },
      input: { code: '123456', email: 'a@b.co', phoneE164: '+923001234567', destination: 'a@b.co' },
      auth: { refreshToken: 'r', accessToken: 'a', idToken: 'g' },
    });

    const output = lines.join('');
    for (const secret of [
      'secret-token',
      '123456',
      'a@b.co',
      '+923001234567',
      '"r"',
      '"a"',
      '"g"',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[REDACTED]');
  });
});
