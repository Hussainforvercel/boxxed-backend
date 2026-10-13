import { Reflector } from '@nestjs/core';

import { ErrorCode } from '@boxxed/shared';

import { OnboardingCompleteGuard } from './onboarding-complete.guard';
import { ONBOARDED_KEY } from '../../common/decorators/onboarded.decorator';
import { DomainError } from '../../common/errors/domain-error';
import { gqlContext } from '../../common/guards/test-context';

import type { UsersService } from './users.service';
import type { OnboardingStep } from '../../generated/prisma/enums';

function setup(required: boolean, dbStep: OnboardingStep | null) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => (key === ONBOARDED_KEY && required ? true : undefined));
  const findById = jest.fn(async () => (dbStep ? { id: 'u1', onboardingStep: dbStep } : null));
  const guard = new OnboardingCompleteGuard(reflector, { findById } as unknown as UsersService);
  return { guard, findById };
}

const ctx = (onboardingStep: OnboardingStep) =>
  gqlContext({ req: { user: { id: 'u1', role: 'CUSTOMER', onboardingStep } } });

describe('OnboardingCompleteGuard', () => {
  it('ignores operations without @Onboarded', async () => {
    const { guard, findById } = setup(false, 'PROFILE');
    await expect(guard.canActivate(ctx('PROFILE'))).resolves.toBe(true);
    expect(findById).not.toHaveBeenCalled();
  });

  it('passes a COMPLETE claim without a DB read', async () => {
    const { guard, findById } = setup(true, 'PROFILE');
    await expect(guard.canActivate(ctx('COMPLETE'))).resolves.toBe(true);
    expect(findById).not.toHaveBeenCalled();
  });

  it('re-checks the DB when the claim is stale', async () => {
    const { guard, findById } = setup(true, 'COMPLETE');
    await expect(guard.canActivate(ctx('CONSENT'))).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith('u1');
  });

  it.each(['PROFILE', 'CONSENT'] as const)(
    'throws ONBOARDING_INCOMPLETE with the step when the user is at %s',
    async (step) => {
      const { guard } = setup(true, step);
      const error = await guard.canActivate(ctx(step)).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(ErrorCode.ONBOARDING_INCOMPLETE);
      expect((error as DomainError).extensions).toEqual({ onboardingStep: step });
    },
  );

  it('treats a deleted user as unauthenticated', async () => {
    const { guard } = setup(true, null);
    const error = await guard.canActivate(ctx('PROFILE')).catch((caught: unknown) => caught);
    expect((error as DomainError).code).toBe(ErrorCode.UNAUTHENTICATED);
  });
});
