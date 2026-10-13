import type { AdminRole } from '../../../generated/prisma/enums';

export interface AuthAdminUser {
  id: string;
  email: string;
  role: AdminRole;
}
