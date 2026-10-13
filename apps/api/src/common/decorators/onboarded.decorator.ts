import { SetMetadata } from '@nestjs/common';

export const ONBOARDED_KEY = 'auth:onboarded';

/** Requires onboardingStep = COMPLETE, else ONBOARDING_INCOMPLETE (OnboardingCompleteGuard). */
export const Onboarded = (): MethodDecorator & ClassDecorator => SetMetadata(ONBOARDED_KEY, true);
