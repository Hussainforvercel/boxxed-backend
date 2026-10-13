import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infra/redis/redis.constants';

export type DependencyState = 'ok' | 'error';

export interface Readiness {
  status: DependencyState;
  db: DependencyState;
  redis: DependencyState;
}

const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async readiness(): Promise<Readiness> {
    const [db, redis] = await Promise.all([
      check(() => this.prisma.$queryRaw`SELECT 1`),
      check(() => this.redis.ping()),
    ]);
    return { status: db === 'ok' && redis === 'ok' ? 'ok' : 'error', db, redis };
  }
}

async function check(probe: () => Promise<unknown>): Promise<DependencyState> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([probe(), timeout]);
    return 'ok';
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}
