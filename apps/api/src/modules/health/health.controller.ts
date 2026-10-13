import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

import type { Readiness } from './health.service';
import type { Response } from 'express';

/** Not throttled: the reverse proxy and deploy script poll these. */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is up. No dependency checks. */
  @Get()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: Postgres and Redis reachable. 503 otherwise (proxy + deploy script poll this). */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<Readiness> {
    const result = await this.health.readiness();
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
