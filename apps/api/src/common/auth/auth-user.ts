import type { OnboardingStep, UserRole } from '../../generated/prisma/enums';

/** The authenticated caller, taken from verified access-token claims (docs/06 §5). */
export interface AuthUser {
  id: string;
  role: UserRole;
  /** From the `onb` claim: may lag behind the DB by up to one access-token lifetime. */
  onboardingStep: OnboardingStep;
}
