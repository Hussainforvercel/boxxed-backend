import { SIGN_IN_WITH_GOOGLE, signInWithOtp } from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { resetState } from '../utils/reset-state';

import type { AuthPayloadResult } from '../utils/auth-flows';
import type { INestApplication } from '@nestjs/common';

describe('Google sign-in (stubbed verifier)', () => {
  const fakes = createFakes();
  let app: INestApplication;

  const signIn = (idToken: string) =>
    gql<{ signInWithGoogle: AuthPayloadResult }>(app, SIGN_IN_WITH_GOOGLE, {
      variables: { input: { idToken } },
    });

  beforeAll(async () => {
    app = await createTestApp({}, { fakes });
    fakes.google.register('token-new', {
      sub: 'g-1',
      email: 'New.Person@gmail.com',
      emailVerified: true,
    });
    fakes.google.register('token-existing', {
      sub: 'g-2',
      email: 'you@example.com',
      emailVerified: true,
    });
    fakes.google.register('token-unverified', {
      sub: 'g-3',
      email: 'you@example.com',
      emailVerified: false,
    });
    fakes.google.register('token-no-email', { sub: 'g-4', email: undefined, emailVerified: false });
  });

  beforeEach(async () => {
    await resetState(app);
    clearFakes(fakes);
  });

  afterAll(async () => {
    await resetState(app);
    await app.close();
  });

  it('creates a new user from a verified Google email, then finds it again by sub', async () => {
    const first = await signIn('token-new');
    expect(first.errors).toBeUndefined();
    expect(first.data?.signInWithGoogle).toMatchObject({
      isNewUser: true,
      user: { email: 'new.person@gmail.com', emailVerified: true, onboardingStep: 'PROFILE' },
    });
    const again = await signIn('token-new');
    expect(again.data?.signInWithGoogle.isNewUser).toBe(false);
    expect(again.data?.signInWithGoogle.user.id).toBe(first.data?.signInWithGoogle.user.id);
  });

  it('links to the existing user with the same verified email', async () => {
    const emailUser = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    const google = await signIn('token-existing');
    expect(google.data?.signInWithGoogle).toMatchObject({
      isNewUser: false,
      user: { id: emailUser.user.id },
    });
  });

  it.each(['token-unverified', 'token-no-email', 'forged-or-wrong-audience'])(
    'refuses %s with GOOGLE_TOKEN_INVALID and creates nothing',
    async (idToken) => {
      await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
      const body = await signIn(idToken);
      expect(errorOf(body)).toMatchObject({ code: 'GOOGLE_TOKEN_INVALID' });
      // The existing email account was not taken over by an unverified Google email.
      const again = await signIn('token-existing');
      expect(again.data?.signInWithGoogle.isNewUser).toBe(false);
    },
  );
});
