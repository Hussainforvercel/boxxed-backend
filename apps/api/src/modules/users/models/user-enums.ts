import { registerEnumType } from '@nestjs/graphql';

import { OnboardingStep, UserRole } from '../../../generated/prisma/enums';

registerEnumType(OnboardingStep, { name: 'OnboardingStep' });
registerEnumType(UserRole, { name: 'UserRole' });

export { OnboardingStep, UserRole };
