import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ErrorCode } from '@boxxed/shared';

import { UsersService } from './users.service';
import { ONBOARDED_KEY } from '../../common/decorators/onboarded.decorator';
import { DomainError } from '../../common/errors/domain-error';
import { requestFromContext } from '../../common/http/request-context';

import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * @Onboarded(): requires onboardingStep = COMPLETE (name + current Terms/Privacy; no phone,
 * DEC-3). A COMPLETE token claim passes without a query. Any other claim is re-checked in the
 * DB, so a user who just finished onboarding isn't blocked by a token issued minutes earlier.
 */
@Injectable()
export class OnboardingCompleteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(ONBOARDED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const caller = requestFromContext(context).user;
    if (!caller) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
    if (caller.onboardingStep === 'COMPLETE') return true;

    const user = await this.users.findById(caller.id);
    if (!user) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
    if (user.onboardingStep === 'COMPLETE') return true;
    throw new DomainError(ErrorCode.ONBOARDING_INCOMPLETE, 'Finish setting up your account.', {
      onboardingStep: user.onboardingStep,
    });
  }
}
