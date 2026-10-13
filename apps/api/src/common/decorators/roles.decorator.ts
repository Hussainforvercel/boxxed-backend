import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../../generated/prisma/enums';

export const ROLES_KEY = 'auth:roles';

/** Role check only; ownership checks live in services (docs/06 §4). */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
