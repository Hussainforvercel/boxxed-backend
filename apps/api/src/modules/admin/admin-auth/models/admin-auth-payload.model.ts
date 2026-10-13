import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

import { AdminRole } from '../../../../generated/prisma/enums';

registerEnumType(AdminRole, {
  name: 'AdminRole',
  description: 'Role-based access level within Super Admin console',
});

@ObjectType({ description: 'Super Admin User Profile' })
export class AdminUserModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => AdminRole)
  role!: AdminRole;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String)
  hqLocation!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date, { nullable: true })
  lastLoginAt?: Date | null;
}

@ObjectType({ description: 'Authentication payload for Super Admin session' })
export class AdminAuthPayload {
  @Field(() => String)
  accessToken!: string;

  @Field(() => AdminUserModel)
  adminUser!: AdminUserModel;
}
