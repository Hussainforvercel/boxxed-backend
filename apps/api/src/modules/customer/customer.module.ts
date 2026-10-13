import { Module } from '@nestjs/common';

import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CustomerService, CustomerResolver],
  exports: [CustomerService],
})
export class CustomerModule {}
