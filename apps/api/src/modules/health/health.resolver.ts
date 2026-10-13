import { Query, Resolver } from '@nestjs/graphql';

import { HealthService } from './health.service';
import { DependencyStatus, HealthStatus } from './models/health-status.model';
import { Public } from '../../common/decorators/public.decorator';

import type { DependencyState } from './health.service';

const TO_GRAPHQL: Record<DependencyState, DependencyStatus> = {
  ok: DependencyStatus.OK,
  error: DependencyStatus.ERROR,
};

@Public()
@Resolver(() => HealthStatus)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  /** Public. Readiness of the API's dependencies (docs/09). */
  @Query(() => HealthStatus)
  async health(): Promise<HealthStatus> {
    const result = await this.healthService.readiness();
    return {
      status: TO_GRAPHQL[result.status],
      db: TO_GRAPHQL[result.db],
      redis: TO_GRAPHQL[result.redis],
    };
  }
}
