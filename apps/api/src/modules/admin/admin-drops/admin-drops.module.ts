import { Module } from '@nestjs/common';

import { AdminDropsController } from './admin-drops.controller';
import { AdminDropsResolver } from './admin-drops.resolver';
import { AdminDropsService } from './admin-drops.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminDropsController],
  providers: [AdminDropsService, AdminDropsResolver],
  exports: [AdminDropsService],
})
export class AdminDropsModule {}
