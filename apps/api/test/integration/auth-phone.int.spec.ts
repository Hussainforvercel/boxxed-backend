import { ME, REQUEST_OTP, signInWithOtp } from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { clearOtpCooldown, resetState } from '../utils/reset-state';

import type { UserResult } from '../utils/auth-flows';
import type { INestApplication } from '@nestjs/common';

describe('phone OTP sign-in (full flow)', () => {
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

  it('texts a code to the E.164 number and masks it', async () => {
    const body = await gql(app, REQUEST_OTP, {
      variables: { input: { channel: 'PHONE', destination: '+92 300 123-4567' } },
    });
    expect(body.errors).toBeUndefined();
    expect(body.data?.['requestOtp']).toMatchObject({
      channel: 'PHONE',
      maskedDestination: '+92 300 •••4567',
    });
    expect(fakes.sms.lastCodeFor('+923001234567')).toMatch(/^\d{6}$/);
  });

  it('signs up with a verified phone and no email; a returning user is not new', async () => {
    const first = await signInWithOtp(app, fakes, 'PHONE', '+923001234567');
    expect(first.isNewUser).toBe(true);
    expect(first.user).toMatchObject({
      email: null,
      emailVerified: false,
      phoneE164: '+923001234567',
      phoneVerified: true,
      onboardingStep: 'PROFILE',
    });

    await clearOtpCooldown(app, 'PHONE', '+923001234567');
    const returning = await signInWithOtp(app, fakes, 'PHONE', '+92 300 1234567');
    expect(returning.isNewUser).toBe(false);
    expect(returning.user.id).toBe(first.user.id);

    const me = await gql<{ me: UserResult }>(app, ME, { token: returning.accessToken });
    expect(me.data?.me.phoneVerified).toBe(true);
  });

  it('rejects numbers that are not valid phones', async () => {
    const body = await gql(app, REQUEST_OTP, {
      variables: { input: { channel: 'PHONE', destination: '03001234567' } },
    });
    expect(errorOf(body)).toMatchObject({
      code: 'BAD_USER_INPUT',
      fields: { destination: ['must be a valid phone number in international format'] },
    });
    expect(fakes.sms.sent).toHaveLength(0);
  });
});
