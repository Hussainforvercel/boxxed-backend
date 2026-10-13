import type { StaffRole } from '../../../generated/prisma/enums';

export interface AuthVendorUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  restaurantId: string;
  branchId: string;
}
