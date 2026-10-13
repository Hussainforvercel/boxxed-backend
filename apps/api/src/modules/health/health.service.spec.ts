import { HealthService } from './health.service';

import type { PrismaService } from '../../infra/prisma/prisma.service';
import type Redis from 'ioredis';

function service(db: () => Promise<unknown>, ping: () => Promise<unknown>): HealthService {
  const prisma = { $queryRaw: db } as unknown as PrismaService;
  const redis = { ping } as unknown as Redis;
  return new HealthService(prisma, redis);
}

describe('HealthService.readiness', () => {
  it('is ok when both dependencies respond', async () => {
    const result = await service(
      async () => [1],
      async () => 'PONG',
    ).readiness();
    expect(result).toEqual({ status: 'ok', db: 'ok', redis: 'ok' });
  });

  it('reports the failing dependency', async () => {
    const result = await service(
      async () => [1],
      async () => {
        throw new Error('down');
      },
    ).readiness();
    expect(result).toEqual({ status: 'error', db: 'ok', redis: 'error' });
  });
});
