import { Module } from '@nestjs/common';

import { ConsentResolver } from './consent.resolver';
import { ConsentService } from './consent.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [ConsentService, ConsentResolver],
})
export class ConsentModule {}
