import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';
import { ME, REFRESH_SESSION, SIGN_OUT, signInWithOtp } from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { clearOtpCooldown, resetState } from '../utils/reset-state';

import type { AuthPayloadResult } from '../utils/auth-flows';
import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

describe('sessions: refresh rotation, reuse detection, sign-out', () => {
  const fakes = createFakes();
  let app: INestApplication;

  const refresh = (refreshToken: string) =>
    gql<{ refreshSession: AuthPayloadResult }>(app, REFRESH_SESSION, {
      variables: { input: { refreshToken } },
    });

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

  it('rotates: each refresh returns a new refresh token and a working access token', async () => {
    const session = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    const first = await refresh(session.refreshToken);
    expect(first.errors).toBeUndefined();
    const rotated = first.data?.refreshSession as AuthPayloadResult;
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(rotated.isNewUser).toBe(false);
    expect(rotated.user.id).toBe(session.user.id);

    const me = await gql(app, ME, { token: rotated.accessToken });
    expect(me.errors).toBeUndefined();
    const second = await refresh(rotated.refreshToken);
    expect(second.errors).toBeUndefined();
  });

  it('reuse of an old refresh token → REFRESH_INVALID and the whole family is revoked', async () => {
    const session = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    const rotated = (await refresh(session.refreshToken)).data?.refreshSession as AuthPayloadResult;

    expect(errorOf(await refresh(session.refreshToken))).toMatchObject({
      code: 'REFRESH_INVALID',
    });
    // The legitimate newest token is dead too: the thief and the victim both sign in again.
    expect(errorOf(await refresh(rotated.refreshToken))).toMatchObject({
      code: 'REFRESH_INVALID',
    });
    expect(await app.get<Redis>(REDIS_CLIENT).keys('rt:fam:*')).toEqual([]);
  });

  it('reuse on one device leaves the same user’s other sessions alive', async () => {
    const phone = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    await clearOtpCooldown(app, 'EMAIL', 'you@example.com');
    const tablet = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');

    await refresh(phone.refreshToken);
    expect(errorOf(await refresh(phone.refreshToken))).toMatchObject({ code: 'REFRESH_INVALID' });
    expect((await refresh(tablet.refreshToken)).errors).toBeUndefined();
  });

  it('an access token is not accepted as a refresh token, nor the reverse', async () => {
    const session = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    expect(errorOf(await refresh(session.accessToken))).toMatchObject({ code: 'REFRESH_INVALID' });
    expect(errorOf(await gql(app, ME, { token: session.refreshToken }))).toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('signOut revokes the family; the refresh token then fails', async () => {
    const session = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    const out = await gql(app, SIGN_OUT, {
      token: session.accessToken,
      variables: { input: { refreshToken: session.refreshToken } },
    });
    expect(out).toEqual({ data: { signOut: true } });
    expect(errorOf(await refresh(session.refreshToken))).toMatchObject({
      code: 'REFRESH_INVALID',
    });
  });

  it('signOut requires a user and cannot revoke someone else’s session', async () => {
    const victim = await signInWithOtp(app, fakes, 'EMAIL', 'victim@example.com');
    const attacker = await signInWithOtp(app, fakes, 'EMAIL', 'attacker@example.com');
    const input = { input: { refreshToken: victim.refreshToken } };

    expect(errorOf(await gql(app, SIGN_OUT, { variables: input }))).toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    const attempt = await gql(app, SIGN_OUT, { token: attacker.accessToken, variables: input });
    expect(attempt).toEqual({ data: { signOut: true } }); // no oracle
    expect((await refresh(victim.refreshToken)).errors).toBeUndefined();
  });
});
