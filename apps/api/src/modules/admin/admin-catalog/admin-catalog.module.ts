import { Module } from '@nestjs/common';

import { AdminCatalogResolver } from './admin-catalog.resolver';
import { AdminCatalogService } from './admin-catalog.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  providers: [AdminCatalogService, AdminCatalogResolver],
  exports: [AdminCatalogService],
})
export class AdminCatalogModule {}
