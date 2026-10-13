import { SetMetadata } from '@nestjs/common';

import type { AdminRole } from '../../../../generated/prisma/enums';
import type { CustomDecorator } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin:roles';

export function AdminRoles(...roles: readonly AdminRole[]): CustomDecorator<string> {
  return SetMetadata(ADMIN_ROLES_KEY, roles);
}
