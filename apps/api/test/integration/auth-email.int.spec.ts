import { ME, REQUEST_OTP, signInWithOtp, VERIFY_OTP } from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { clearOtpCooldown, resetState } from '../utils/reset-state';

import type { UserResult } from '../utils/auth-flows';
import type { INestApplication } from '@nestjs/common';

describe('email OTP sign-in (full flow)', () => {
  const fakes = createFakes();
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({}, { fakes });
  });

  beforeEach(async () => {
    await resetState(app);
    clearFakes(fakes);
  });

  afterAll(async () => {
    await resetState(app);
    await app.close();
  });

  it('requestOtp returns a masked challenge and emails a 6-digit code', async () => {
    const body = await gql(app, REQUEST_OTP, {
      variables: { input: { channel: 'EMAIL', destination: '  You@Example.COM ' } },
    });
    expect(body.errors).toBeUndefined();
    expect(body.data?.['requestOtp']).toMatchObject({
      channel: 'EMAIL',
      maskedDestination: 'you@ex•••.com',
      codeLength: 6,
    });
    // Normalized before delivery and limits: one address, one counter.
    expect(fakes.mail.lastCodeFor('you@example.com')).toMatch(/^\d{6}$/);
  });

  it('signs up a new user at PROFILE with a verified email, then signs the same user in', async () => {
    const first = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    expect(first.isNewUser).toBe(true);
    expect(first.user).toMatchObject({
      email: 'you@example.com',
      emailVerified: true,
      phoneE164: null,
      phoneVerified: false,
      role: 'CUSTOMER',
      onboardingStep: 'PROFILE',
      consents: [],
    });
    expect(new Date(first.accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());

    const me = await gql<{ me: UserResult }>(app, ME, { token: first.accessToken });
    expect(me.data?.me.id).toBe(first.user.id);

    await clearOtpCooldown(app, 'EMAIL', 'you@example.com');
    const second = await signInWithOtp(app, fakes, 'EMAIL', 'YOU@example.com');
    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  it('rejects a wrong code with OTP_INVALID and the attempts left', async () => {
    await gql(app, REQUEST_OTP, {
      variables: { input: { channel: 'EMAIL', destination: 'you@example.com' } },
    });
    const right = fakes.mail.lastCodeFor('you@example.com');
    const wrong = right === '000000' ? '111111' : '000000';
    const body = await gql(app, VERIFY_OTP, {
      variables: { input: { channel: 'EMAIL', destination: 'you@example.com', code: wrong } },
    });
    expect(errorOf(body)).toMatchObject({ code: 'OTP_INVALID', attemptsRemaining: 4 });
  });

  it('validates the input: bad email, bad code format', async () => {
    const badEmail = await gql(app, REQUEST_OTP, {
      variables: { input: { channel: 'EMAIL', destination: 'not-an-email' } },
    });
    expect(errorOf(badEmail)).toMatchObject({
      code: 'BAD_USER_INPUT',
      fields: { destination: ['must be a valid email address'] },
    });
    const badCode = await gql(app, VERIFY_OTP, {
      variables: { input: { channel: 'EMAIL', destination: 'you@example.com', code: '12ab56' } },
    });
    expect(errorOf(badCode)).toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it('me without a valid token is UNAUTHENTICATED', async () => {
    expect(errorOf(await gql(app, ME))).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(errorOf(await gql(app, ME, { token: 'garbage' }))).toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});
