import Redis from 'ioredis';

import { createTestApp } from '../utils/create-test-app';
import { gql } from '../utils/graphql';

import type { INestApplication } from '@nestjs/common';

// The Redis storage wraps keys in hash tags: `{thr:<name>:<hash>:<name>}:hits|blocked`.
async function clearThrottleKeys(): Promise<void> {
  const redis = new Redis(process.env['REDIS_URL'] ?? '');
  const keys = await redis.keys('{thr:*');
  if (keys.length > 0) await redis.del(...keys);
  await redis.quit();
}

describe('rate limiting (Redis-backed)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await clearThrottleKeys();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await clearThrottleKeys();
  });

  // Guards run per resolver call, so the probe must hit a resolver (`__typename` alone does not).
  it('returns RATE_LIMITED with retryAfterSeconds after 100 requests per minute', async () => {
    for (let i = 0; i < 100; i += 1) {
      const body = await gql(app, '{ health { status } }');
      expect(body.errors).toBeUndefined();
    }
    const limited = await gql(app, '{ health { status } }');
    expect(limited.errors?.[0]?.extensions).toMatchObject({ code: 'RATE_LIMITED' });
    expect(limited.errors?.[0]?.extensions?.['retryAfterSeconds']).toBeGreaterThan(0);
  });
});
