import Redis from 'ioredis';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../src/common/errors/domain-error';
import { OTP_LIMITS, OtpService } from '../../src/modules/auth/otp/otp.service';

import type { AppConfig, OtpConfig } from '../../src/config/app-config.service';
import type { MailMessage, MailService } from '../../src/infra/mail/mail.service';
import type { SmsProvider } from '../../src/infra/sms/sms-provider';
import type { OtpTarget } from '../../src/modules/auth/otp/otp.types';

// OtpService against real Redis (a dedicated DB index, flushed per test): its limits and
// atomicity live in Lua scripts, so mocking Redis would test nothing.
const REDIS_TEST_DB = 15;
const HMAC_SECRET = 'test-otp-hmac-secret-000000000000000000';

const EMAIL: OtpTarget = { purpose: 'SIGN_IN', channel: 'EMAIL', destination: 'you@example.com' };
const PHONE: OtpTarget = { purpose: 'SIGN_IN', channel: 'PHONE', destination: '+923001234567' };
const IP = '203.0.113.7';

function makeConfig(overrides: Partial<OtpConfig> = {}, smsDailyCap = 1000): AppConfig {
  const otp: OtpConfig = {
    hmacSecret: HMAC_SECRET,
    ttlSeconds: 300,
    maxAttempts: 5,
    resendSeconds: 30,
    lockSeconds: 900,
    testDestinations: new Set(),
    testCode: undefined,
    ...overrides,
  };
  return { otp, smsDailyCap } as AppConfig;
}

async function expectDomainError(
  promise: Promise<unknown>,
  code: ErrorCode,
): Promise<Readonly<Record<string, unknown>>> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
  return (error as DomainError).extensions;
}

describe('OtpService (real Redis)', () => {
  let redis: Redis;
  let mails: MailMessage[];
  let smses: { to: string; text: string }[];

  const service = (config = makeConfig()): OtpService => {
    const mail = { send: async (message: MailMessage) => void mails.push(message) };
    const sms: SmsProvider = { send: async (to, text) => void smses.push({ to, text }) };
    return new OtpService(redis, sms, mail as MailService, config);
  };
  const codeFrom = (text: string): string => /\b(\d{6})\b/.exec(text)?.[1] ?? '';
  const lastEmailCode = (): string => codeFrom(mails.at(-1)?.text ?? '');
  const lastSmsCode = (): string => codeFrom(smses.at(-1)?.text ?? '');

  beforeAll(() => {
    redis = new Redis(process.env['REDIS_URL'] ?? '', { db: REDIS_TEST_DB });
  });

  beforeEach(async () => {
    await redis.flushdb();
    mails = [];
    smses = [];
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  it('delivers a 6-digit code by email and stores only its HMAC', async () => {
    const issued = await service().request(EMAIL, IP);
    const code = lastEmailCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(issued).toMatchObject({ channel: 'EMAIL', maskedDestination: 'you@ex•••.com' });
    expect(issued.codeLength).toBe(6);

    const keys = await redis.keys('*');
    for (const key of keys) {
      const type = await redis.type(key);
      const value =
        type === 'hash' ? JSON.stringify(await redis.hgetall(key)) : await redis.get(key);
      expect(value ?? '').not.toContain(code);
    }
    const stored = await redis.hgetall('otp:SIGN_IN:EMAIL:you@example.com');
    expect(stored['hash']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sets the challenge TTL and reports expiry and resend times', async () => {
    const before = Date.now();
    const issued = await service().request(EMAIL, IP);
    const ttl = await redis.ttl('otp:SIGN_IN:EMAIL:you@example.com');
    expect(ttl).toBeGreaterThan(290);
    expect(ttl).toBeLessThanOrEqual(300);
    expect(issued.expiresAt.getTime() - before).toBeGreaterThanOrEqual(300_000);
    expect(issued.resendAvailableAt.getTime() - before).toBeGreaterThanOrEqual(30_000);
  });

  it('verifies the right code exactly once', async () => {
    const otp = service();
    await otp.request(PHONE, IP);
    const code = lastSmsCode();
    await expect(otp.verify(PHONE, code, IP)).resolves.toBeUndefined();
    await expectDomainError(otp.verify(PHONE, code, IP), ErrorCode.OTP_EXPIRED);
  });

  it('lets only one of several concurrent correct verifications succeed', async () => {
    const otp = service();
    await otp.request(EMAIL, IP);
    const code = lastEmailCode();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => otp.verify(EMAIL, code, IP)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('returns OTP_EXPIRED when there is no challenge or it lapsed', async () => {
    const otp = service();
    await expectDomainError(otp.verify(EMAIL, '123456', IP), ErrorCode.OTP_EXPIRED);
    await otp.request(EMAIL, IP);
    await redis.pexpire('otp:SIGN_IN:EMAIL:you@example.com', 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expectDomainError(otp.verify(EMAIL, lastEmailCode(), IP), ErrorCode.OTP_EXPIRED);
  });

  it('counts wrong codes, then locks the destination after 5', async () => {
    const otp = service();
    await otp.request(EMAIL, IP);
    const wrong = lastEmailCode() === '000000' ? '111111' : '000000';
    for (let remaining = 4; remaining >= 1; remaining -= 1) {
      const extensions = await expectDomainError(
        otp.verify(EMAIL, wrong, IP),
        ErrorCode.OTP_INVALID,
      );
      expect(extensions['attemptsRemaining']).toBe(remaining);
    }
    const locked = await expectDomainError(
      otp.verify(EMAIL, wrong, IP),
      ErrorCode.OTP_ATTEMPTS_EXCEEDED,
    );
    expect(locked['retryAfterSeconds']).toBe(900);

    // Locked: even the right code can't be tried, and no new code can be requested.
    const again = await expectDomainError(
      otp.verify(EMAIL, lastEmailCode(), IP),
      ErrorCode.OTP_ATTEMPTS_EXCEEDED,
    );
    expect(again['retryAfterSeconds']).toBeGreaterThan(890);
    const request = await expectDomainError(otp.request(EMAIL, IP), ErrorCode.RATE_LIMITED);
    expect(request['retryAfterSeconds']).toBeGreaterThan(890);
  });

  it('enforces the 30 s resend cooldown, and a resend replaces the old code', async () => {
    const otp = service();
    await otp.request(EMAIL, IP);
    const first = lastEmailCode();
    const cooldown = await expectDomainError(otp.request(EMAIL, IP), ErrorCode.RATE_LIMITED);
    expect(cooldown['retryAfterSeconds']).toBeGreaterThan(25);
    expect(cooldown['retryAfterSeconds']).toBeLessThanOrEqual(30);

    await redis.del('otp:cooldown:EMAIL:you@example.com');
    await otp.request(EMAIL, IP);
    const second = lastEmailCode();
    if (first !== second) {
      await expectDomainError(otp.verify(EMAIL, first, IP), ErrorCode.OTP_INVALID);
    }
    await expect(otp.verify(EMAIL, second, IP)).resolves.toBeUndefined();
  });

  const sendUntilLimited = async (
    otp: OtpService,
    target: (i: number) => OtpTarget,
    ip: (i: number) => string,
    max: number,
  ): Promise<Readonly<Record<string, unknown>>> => {
    for (let i = 0; i < max; i += 1) {
      await otp.request(target(i), ip(i));
      await redis.del(`otp:cooldown:${target(i).channel}:${target(i).destination}`);
    }
    return expectDomainError(otp.request(target(max), ip(max)), ErrorCode.RATE_LIMITED);
  };

  it(`limits a destination to ${OTP_LIMITS.destinationPerHour} sends per hour`, async () => {
    const limited = await sendUntilLimited(
      service(),
      () => EMAIL,
      (i) => `198.51.100.${i}`,
      OTP_LIMITS.destinationPerHour,
    );
    expect(limited['retryAfterSeconds']).toBeGreaterThan(3500);
  });

  it(`limits a destination to ${OTP_LIMITS.destinationPerDay} sends per day`, async () => {
    const otp = service();
    for (let i = 0; i < OTP_LIMITS.destinationPerDay; i += 1) {
      await otp.request(EMAIL, `198.51.100.${i}`);
      await redis.del('otp:cooldown:EMAIL:you@example.com', 'otp:rl:dest:h:EMAIL:you@example.com');
    }
    const limited = await expectDomainError(otp.request(EMAIL, IP), ErrorCode.RATE_LIMITED);
    expect(limited['retryAfterSeconds']).toBeGreaterThan(86_000);
  });

  it(`limits an IP to ${OTP_LIMITS.ipSendsPerHour} sends per hour`, async () => {
    const limited = await sendUntilLimited(
      service(),
      (i) => ({ ...EMAIL, destination: `user${i}@example.com` }),
      () => IP,
      OTP_LIMITS.ipSendsPerHour,
    );
    expect(limited['retryAfterSeconds']).toBeGreaterThan(3500);
  });

  it(`limits an IP to ${OTP_LIMITS.ipVerifiesPerHour} verifications per hour`, async () => {
    const otp = service();
    for (let i = 0; i < OTP_LIMITS.ipVerifiesPerHour; i += 1) {
      await expectDomainError(otp.verify(EMAIL, '123456', IP), ErrorCode.OTP_EXPIRED);
    }
    const limited = await expectDomainError(
      otp.verify(EMAIL, '123456', IP),
      ErrorCode.RATE_LIMITED,
    );
    expect(limited['retryAfterSeconds']).toBeGreaterThan(3500);
  });

  it('stops phone OTP at SMS_DAILY_CAP without affecting email', async () => {
    const otp = service(makeConfig({}, 2));
    const phone = (i: number): OtpTarget => ({ ...PHONE, destination: `+92300123456${i}` });
    const limited = await sendUntilLimited(otp, phone, (i) => `198.51.100.${i}`, 2);
    expect(limited['retryAfterSeconds']).toBeGreaterThan(0);
    expect(limited['retryAfterSeconds']).toBeLessThanOrEqual(86_400);
    expect(smses).toHaveLength(2);
    await expect(otp.request(EMAIL, '198.51.100.99')).resolves.toBeDefined();
  });

  it('does not consume any limit when a request is rejected', async () => {
    const otp = service();
    await otp.request(EMAIL, IP);
    await expectDomainError(otp.request(EMAIL, IP), ErrorCode.RATE_LIMITED); // cooldown
    expect(await redis.get('otp:rl:dest:h:EMAIL:you@example.com')).toBe('1');
    expect(await redis.get(`otp:rl:ip:send:${IP}`)).toBe('1');
  });

  it('gives the same response shape for any destination (no account lookup)', async () => {
    const otp = service();
    const known = await otp.request(EMAIL, IP);
    const unknown = await otp.request({ ...EMAIL, destination: 'nobody@example.com' }, IP);
    expect(Object.keys(unknown).sort()).toEqual(Object.keys(known).sort());
    expect({ ...unknown, maskedDestination: '', expiresAt: 0, resendAvailableAt: 0 }).toEqual({
      ...known,
      maskedDestination: '',
      expiresAt: 0,
      resendAvailableAt: 0,
    });
  });

  it('uses OTP_TEST_CODE for allow-listed destinations without delivering', async () => {
    const otp = service(
      makeConfig({ testCode: '424242', testDestinations: new Set(['qa@boxxed.test']) }),
    );
    const qa: OtpTarget = { ...EMAIL, destination: 'qa@boxxed.test' };
    await otp.request(qa, IP);
    expect(mails).toHaveLength(0);
    await expect(otp.verify(qa, '424242', IP)).resolves.toBeUndefined();

    await otp.request(EMAIL, IP); // not allow-listed: a real random code is sent
    expect(mails).toHaveLength(1);
  });
});
