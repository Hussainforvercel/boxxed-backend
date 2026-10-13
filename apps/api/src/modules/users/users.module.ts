import { Module } from '@nestjs/common';

import { OnboardingService } from './onboarding.service';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService, OnboardingService, UsersResolver],
  exports: [UsersService, OnboardingService],
})
export class UsersModule {}
