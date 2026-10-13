import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfig } from '../../config/app-config.service';
import { PrismaClient } from '../../generated/prisma/client';

import type { OnModuleDestroy } from '@nestjs/common';

/**
 * Prisma 7 client over node-postgres (adapter-pg). Connects lazily on first query, so a
 * database outage at boot does not crash the process — /health/ready reports it instead.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
