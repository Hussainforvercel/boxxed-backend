import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../src/common/errors/domain-error';
import { TokenService } from '../../src/modules/auth/tokens/token.service';

import type { AppConfig, JwtConfig } from '../../src/config/app-config.service';
import type { TokenSubject } from '../../src/modules/auth/tokens/token.types';

// TokenService against real Redis (dedicated DB index): rotation is a Lua compare-and-set.
const REDIS_TEST_DB = 15;

const JWT: JwtConfig = {
  accessSecret: 'test-access-secret-000000000000000000000000',
  refreshSecret: 'test-refresh-secret-00000000000000000000000',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 2_592_000,
  issuer: 'boxxed-api',
  audience: 'boxxed-app',
};
const USER: TokenSubject = { id: 'user-1', role: 'CUSTOMER', onboardingStep: 'PROFILE' };

async function expectRefreshInvalid(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(ErrorCode.REFRESH_INVALID);
}

describe('TokenService (real Redis)', () => {
  let redis: Redis;
  let tokens: TokenService;
  const jwt = new JwtService();

  beforeAll(() => {
    redis = new Redis(process.env['REDIS_URL'] ?? '', { db: REDIS_TEST_DB });
    tokens = new TokenService(jwt, redis, { jwt: JWT } as AppConfig);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  it('signs access and refresh tokens with different secrets', async () => {
    const session = await tokens.createSession(USER);
    expect(() => jwt.verify(session.accessToken, { secret: JWT.accessSecret })).not.toThrow();
    expect(() => jwt.verify(session.accessToken, { secret: JWT.refreshSecret })).toThrow();
    expect(() => jwt.verify(session.refreshToken, { secret: JWT.refreshSecret })).not.toThrow();
    expect(() => jwt.verify(session.refreshToken, { secret: JWT.accessSecret })).toThrow();
  });

  it('carries sub/role/onb/iss/aud on the access token and verifies it', async () => {
    const { accessToken, accessTokenExpiresAt } = await tokens.signAccess(USER);
    expect(await tokens.verifyAccess(accessToken)).toMatchObject({
      sub: 'user-1',
      role: 'CUSTOMER',
      onb: 'PROFILE',
      iss: 'boxxed-api',
      aud: 'boxxed-app',
    });
    expect(accessTokenExpiresAt.getTime() - Date.now()).toBeGreaterThan(890_000);
  });

  it('rejects a refresh token presented as an access token, and vice versa', async () => {
    const session = await tokens.createSession(USER);
    expect(await tokens.verifyAccess(session.refreshToken)).toBeNull();
    await expectRefreshInvalid(tokens.rotate(session.accessToken));
  });

  it('rejects access tokens with the wrong audience or issuer', async () => {
    const wrongAud = jwt.sign(
      { sub: 'user-1', role: 'CUSTOMER', onb: 'PROFILE' },
      { secret: JWT.accessSecret, issuer: JWT.issuer, audience: 'someone-else' },
    );
    const wrongIss = jwt.sign(
      { sub: 'user-1', role: 'CUSTOMER', onb: 'PROFILE' },
      { secret: JWT.accessSecret, issuer: 'evil', audience: JWT.audience },
    );
    expect(await tokens.verifyAccess(wrongAud)).toBeNull();
    expect(await tokens.verifyAccess(wrongIss)).toBeNull();
  });

  it('stores the family in Redis with the refresh TTL', async () => {
    await tokens.createSession(USER);
    const [familyKey] = await redis.keys('rt:fam:*');
    expect(familyKey).toBeDefined();
    const family = await redis.hgetall(familyKey ?? '');
    expect(family['userId']).toBe('user-1');
    expect(await redis.ttl(familyKey ?? '')).toBeGreaterThan(2_591_000);
    expect(await redis.smembers('rt:user:user-1')).toEqual([familyKey?.slice('rt:fam:'.length)]);
  });

  it('rotates: a new refresh token with a new jti in the same family', async () => {
    const session = await tokens.createSession(USER);
    const rotated = await tokens.rotate(session.refreshToken);
    expect(rotated.userId).toBe('user-1');
    const before = jwt.decode<{ fid: string; jti: string }>(session.refreshToken);
    const after = jwt.decode<{ fid: string; jti: string }>(rotated.refreshToken);
    expect(after.fid).toBe(before.fid);
    expect(after.jti).not.toBe(before.jti);
    await expect(tokens.rotate(rotated.refreshToken)).resolves.toBeDefined();
  });

  it('on reuse of an old token revokes the whole family', async () => {
    const session = await tokens.createSession(USER);
    const rotated = await tokens.rotate(session.refreshToken);

    await expectRefreshInvalid(tokens.rotate(session.refreshToken)); // reuse → family deleted
    await expectRefreshInvalid(tokens.rotate(rotated.refreshToken)); // the newest one is dead too
    expect(await redis.keys('rt:fam:*')).toEqual([]);
    expect(await redis.smembers('rt:user:user-1')).toEqual([]);
  });

  it('lets only one of several concurrent rotations of the same token win', async () => {
    const session = await tokens.createSession(USER);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => tokens.rotate(session.refreshToken)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('keeps other sessions of the same user alive when one family is revoked', async () => {
    const phone = await tokens.createSession(USER);
    const tablet = await tokens.createSession(USER);
    const rotated = await tokens.rotate(phone.refreshToken);
    await expectRefreshInvalid(tokens.rotate(phone.refreshToken));
    await expectRefreshInvalid(tokens.rotate(rotated.refreshToken));
    await expect(tokens.rotate(tablet.refreshToken)).resolves.toBeDefined();
  });

  it('sign-out deletes the family; another user cannot revoke it', async () => {
    const session = await tokens.createSession(USER);
    await tokens.revoke(session.refreshToken, 'someone-else');
    const rotated = await tokens.rotate(session.refreshToken);

    await tokens.revoke(rotated.refreshToken, 'user-1');
    await expectRefreshInvalid(tokens.rotate(rotated.refreshToken));
    expect(await redis.keys('rt:fam:*')).toEqual([]);
  });

  it('revokeAllForUser ends every session', async () => {
    const a = await tokens.createSession(USER);
    const b = await tokens.createSession(USER);
    await tokens.revokeAllForUser('user-1');
    await expectRefreshInvalid(tokens.rotate(a.refreshToken));
    await expectRefreshInvalid(tokens.rotate(b.refreshToken));
  });

  it('rejects garbage and tampered refresh tokens', async () => {
    const session = await tokens.createSession(USER);
    await expectRefreshInvalid(tokens.rotate('not-a-jwt'));
    await expectRefreshInvalid(tokens.rotate(`${session.refreshToken.slice(0, -2)}xx`));
  });
});
