import { SetMetadata } from '@nestjs/common';

import type { StaffRole } from '../../../../generated/prisma/enums';

export const VENDOR_ROLES_KEY = 'vendor_roles';
export const VendorRoles = (...roles: StaffRole[]) => SetMetadata(VENDOR_ROLES_KEY, roles);
