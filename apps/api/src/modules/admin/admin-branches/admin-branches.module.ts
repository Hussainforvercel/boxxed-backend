import { Module } from '@nestjs/common';

import { AdminBranchesResolver } from './admin-branches.resolver';
import { AdminBranchesService } from './admin-branches.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { RedisModule } from '../../../infra/redis/redis.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AdminAuthModule],
  providers: [AdminBranchesService, AdminBranchesResolver],
  exports: [AdminBranchesService],
})
export class AdminBranchesModule {}
