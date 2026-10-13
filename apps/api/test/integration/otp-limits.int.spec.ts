import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';
import { REQUEST_OTP, signInWithOtp, VERIFY_OTP } from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { clearOtpCooldown, resetState } from '../utils/reset-state';

import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

// Every OTP limit end to end through GraphQL: the right ErrorCode and retryAfterSeconds /
// attemptsRemaining reach the client. X-Forwarded-For sets the client IP (1 trusted hop).
const SMS_DAILY_CAP = 3;
const EMAIL = 'you@example.com';

describe('OTP limits over GraphQL', () => {
  const fakes = createFakes();
  let app: INestApplication;
  let redis: Redis;
  let ipCounter = 0;
  /** A fresh client IP, so only the limit under test can trigger. */
  const nextIp = (): string => `198.51.100.${(ipCounter += 1) % 250}`;

  const request = (destination: string, ip = nextIp(), channel = 'EMAIL') =>
    gql(app, REQUEST_OTP, { ip, variables: { input: { channel, destination } } });
  const verify = (destination: string, code: string, ip = nextIp(), channel = 'EMAIL') =>
    gql(app, VERIFY_OTP, { ip, variables: { input: { channel, destination, code } } });
  const retryAfter = (extensions: Record<string, unknown>): number =>
    extensions['retryAfterSeconds'] as number;

  beforeAll(async () => {
    app = await createTestApp(
      { TRUST_PROXY_HOPS: '1', SMS_DAILY_CAP: String(SMS_DAILY_CAP) },
      { fakes },
    );
    redis = app.get<Redis>(REDIS_CLIENT);
  });

  beforeEach(async () => {
    await resetState(app);
    clearFakes(fakes);
  });

  afterAll(async () => {
    await resetState(app);
    await app.close();
  });

  it('resend cooldown → RATE_LIMITED with ~30 s', async () => {
    expect((await request(EMAIL)).errors).toBeUndefined();
    const limited = errorOf(await request(EMAIL));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(25);
    expect(retryAfter(limited)).toBeLessThanOrEqual(30);
  });

  it('5 sends per destination per hour → RATE_LIMITED with ~1 h', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await request(EMAIL)).errors).toBeUndefined();
      await clearOtpCooldown(app, 'EMAIL', EMAIL);
    }
    const limited = errorOf(await request(EMAIL));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(3500);
  });

  it('10 sends per destination per day → RATE_LIMITED with ~24 h', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await request(EMAIL)).errors).toBeUndefined();
      await redis.del(`otp:cooldown:EMAIL:${EMAIL}`, `otp:rl:dest:h:EMAIL:${EMAIL}`);
    }
    const limited = errorOf(await request(EMAIL));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(86_000);
  });

  it('10 sends per IP per hour → RATE_LIMITED with ~1 h', async () => {
    const ip = '203.0.113.10';
    for (let i = 0; i < 10; i += 1) {
      expect((await request(`user${i}@example.com`, ip)).errors).toBeUndefined();
    }
    const limited = errorOf(await request('one-more@example.com', ip));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(3500);
    expect((await request('one-more@example.com')).errors).toBeUndefined(); // other IPs fine
  });

  it('30 verifications per IP per hour → RATE_LIMITED with ~1 h', async () => {
    // Seeded at the limit: the 20/min throttler would trip before 30 real calls. The counting
    // itself is exercised call by call in otp-service.int.spec.ts.
    const ip = '203.0.113.20';
    await redis.set(`otp:rl:ip:verify:${ip}`, 30, 'EX', 3600);
    const limited = errorOf(await verify(EMAIL, '123456', ip));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(3500); // not the throttler's ≤ 60 s
  });

  it('verifyOtp is throttled at 20/min per client → RATE_LIMITED with ≤ 60 s', async () => {
    const ip = '203.0.113.30';
    for (let i = 0; i < 20; i += 1) {
      expect(errorOf(await verify(`u${i}@example.com`, '123456', ip))['code']).toBe('OTP_EXPIRED');
    }
    const limited = errorOf(await verify('u99@example.com', '123456', ip));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeLessThanOrEqual(60);
  });

  it(`SMS_DAILY_CAP (${SMS_DAILY_CAP}) stops phone OTP; email still works`, async () => {
    for (let i = 0; i < SMS_DAILY_CAP; i += 1) {
      expect((await request(`+92300123450${i}`, nextIp(), 'PHONE')).errors).toBeUndefined();
    }
    const limited = errorOf(await request('+923001234599', nextIp(), 'PHONE'));
    expect(limited['code']).toBe('RATE_LIMITED');
    expect(retryAfter(limited)).toBeGreaterThan(0);
    expect(retryAfter(limited)).toBeLessThanOrEqual(86_400); // until UTC midnight
    expect(fakes.sms.sent).toHaveLength(SMS_DAILY_CAP);
    expect((await request(EMAIL)).errors).toBeUndefined();
  });

  it('wrong codes → OTP_INVALID with attemptsRemaining, then OTP_ATTEMPTS_EXCEEDED and a lock', async () => {
    await request(EMAIL);
    const right = fakes.mail.lastCodeFor(EMAIL);
    const wrong = right === '000000' ? '111111' : '000000';
    for (let remaining = 4; remaining >= 1; remaining -= 1) {
      expect(errorOf(await verify(EMAIL, wrong))).toMatchObject({
        code: 'OTP_INVALID',
        attemptsRemaining: remaining,
      });
    }
    expect(errorOf(await verify(EMAIL, wrong))).toMatchObject({
      code: 'OTP_ATTEMPTS_EXCEEDED',
      retryAfterSeconds: 900,
    });
    const rightButLocked = errorOf(await verify(EMAIL, right));
    expect(rightButLocked['code']).toBe('OTP_ATTEMPTS_EXCEEDED');
    expect(retryAfter(rightButLocked)).toBeGreaterThan(890);

    await clearOtpCooldown(app, 'EMAIL', EMAIL);
    const newCode = errorOf(await request(EMAIL)); // requestOtp's contract: RATE_LIMITED
    expect(newCode['code']).toBe('RATE_LIMITED');
    expect(retryAfter(newCode)).toBeGreaterThan(890);
  });

  it('no challenge, or an expired one → OTP_EXPIRED', async () => {
    expect(errorOf(await verify(EMAIL, '123456'))['code']).toBe('OTP_EXPIRED');
    await request(EMAIL);
    await redis.del(`otp:SIGN_IN:EMAIL:${EMAIL}`); // what the TTL does
    const code = fakes.mail.lastCodeFor(EMAIL);
    expect(errorOf(await verify(EMAIL, code))['code']).toBe('OTP_EXPIRED');
  });

  it('requestOtp answers identically for existing and unknown accounts', async () => {
    await signInWithOtp(app, fakes, 'EMAIL', 'known@example.com', { ip: nextIp() });
    await clearOtpCooldown(app, 'EMAIL', 'known@example.com');

    const known = await request('known@example.com');
    const unknown = await request('nobody@example.com');
    expect(known.errors).toBeUndefined();
    expect(unknown.errors).toBeUndefined();
    const shape = (body: typeof known) => {
      const challenge = body.data?.['requestOtp'] as Record<string, unknown>;
      return { ...challenge, maskedDestination: '*', expiresAt: '*', resendAvailableAt: '*' };
    };
    expect(shape(known)).toEqual(shape(unknown));
  });
});
