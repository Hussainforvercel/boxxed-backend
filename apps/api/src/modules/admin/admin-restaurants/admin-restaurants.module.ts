import { Module } from '@nestjs/common';

import { AdminRestaurantsController } from './admin-restaurants.controller';
import { AdminRestaurantsResolver } from './admin-restaurants.resolver';
import { AdminRestaurantsService } from './admin-restaurants.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminRestaurantsController],
  providers: [AdminRestaurantsService, AdminRestaurantsResolver],
  exports: [AdminRestaurantsService],
})
export class AdminRestaurantsModule {}
