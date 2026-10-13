import { isTransientMailError, MAIL_MAX_RETRIES, MailService } from './mail.service';

import type { AppConfig } from '../../config/app-config.service';
import type { Transporter } from 'nodemailer';

const MESSAGE = { to: 'someone@example.com', subject: 's', text: 't', html: '<p>t</p>' };

class TestMailService extends MailService {
  protected override sleep(): Promise<void> {
    return Promise.resolve();
  }
}

function setup(failures: unknown[]): { service: MailService; sendMail: jest.Mock } {
  const sendMail = jest.fn(async () => {
    const failure = failures.shift();
    if (failure) throw failure;
    return {};
  });
  const transport = { sendMail, close: jest.fn() } as unknown as Transporter;
  const config = { smtp: { from: 'no-reply@boxxed.test' } } as AppConfig;
  return { service: new TestMailService(transport, config), sendMail };
}

describe('MailService', () => {
  it('sends with the configured from address', async () => {
    const { service, sendMail } = setup([]);
    await service.send(MESSAGE);
    expect(sendMail).toHaveBeenCalledWith({ from: 'no-reply@boxxed.test', ...MESSAGE });
  });

  it('retries transient failures (SMTP 421, ECONNRESET) and then succeeds', async () => {
    const { service, sendMail } = setup([{ responseCode: 421 }, { code: 'ECONNRESET' }]);
    await service.send(MESSAGE);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it(`gives up after ${MAIL_MAX_RETRIES} retries`, async () => {
    const failures = Array.from({ length: 10 }, () => ({ code: 'ETIMEDOUT' }));
    const { service, sendMail } = setup(failures);
    await expect(service.send(MESSAGE)).rejects.toThrow('Mail delivery failed');
    expect(sendMail).toHaveBeenCalledTimes(MAIL_MAX_RETRIES + 1);
  });

  it('never retries a permanent 5xx failure', async () => {
    const { service, sendMail } = setup([{ responseCode: 550 }]);
    await expect(service.send(MESSAGE)).rejects.toThrow('Mail delivery failed');
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('does not put the recipient in the thrown error', async () => {
    const { service } = setup([{ responseCode: 550, message: 'no such user someone@example.com' }]);
    await expect(service.send(MESSAGE)).rejects.not.toThrow(/someone@example\.com/);
  });
});

describe('isTransientMailError', () => {
  it.each([
    [{ responseCode: 421 }, true],
    [{ responseCode: 451 }, true],
    [{ responseCode: 550 }, false],
    [{ responseCode: 554 }, false],
    [{ code: 'ECONNECTION' }, true],
    [{ code: 'EAUTH' }, false],
    [new Error('boom'), false],
    ['nope', false],
  ])('%p → %p', (error, expected) => {
    expect(isTransientMailError(error)).toBe(expected);
  });
});
