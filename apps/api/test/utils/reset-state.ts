import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';

import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

/** Empties the auth tables and the OTP / refresh / throttler keys between tests. */
export async function resetState(app: INestApplication): Promise<void> {
  await app.get(PrismaService).$executeRawUnsafe('TRUNCATE "User" CASCADE');
  const redis = app.get<Redis>(REDIS_CLIENT);
  for (const pattern of ['otp:*', 'rt:*', '{thr:*']) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  }
}

/** Skips the 30 s resend cooldown, for tests that sign the same destination in twice. */
export async function clearOtpCooldown(
  app: INestApplication,
  channel: 'EMAIL' | 'PHONE',
  destination: string,
): Promise<void> {
  await app.get<Redis>(REDIS_CLIENT).del(`otp:cooldown:${channel}:${destination}`);
}
