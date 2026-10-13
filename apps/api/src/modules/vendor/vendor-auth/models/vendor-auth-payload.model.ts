import { Field, ID, ObjectType } from '@nestjs/graphql';

import { StaffRole, StaffStatus } from '../../../../generated/prisma/enums';

@ObjectType({ description: 'Restaurant parent brief for authenticated vendor' })
export class VendorRestaurantBriefModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  partnerNumber!: string;

  @Field(() => String)
  cuisine!: string;

  @Field(() => String, { nullable: true })
  district?: string | null;

  @Field(() => String, { nullable: true })
  stationId?: string | null;
}

@ObjectType({ description: 'Branch brief for authenticated vendor' })
export class VendorBranchBriefModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  internalCode!: string;

  @Field(() => String, { nullable: true })
  locationArea?: string | null;
}

@ObjectType({ description: 'Branch staff authenticated profile' })
export class VendorStaffProfileModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  username?: string | null;

  @Field(() => StaffRole)
  role!: StaffRole;

  @Field(() => StaffStatus)
  status!: StaffStatus;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String)
  branchId!: string;

  @Field(() => String)
  restaurantId!: string;

  @Field(() => Date, { nullable: true })
  lastLoginAt?: Date | null;

  @Field(() => VendorRestaurantBriefModel, { nullable: true })
  restaurant?: VendorRestaurantBriefModel;

  @Field(() => VendorBranchBriefModel, { nullable: true })
  branch?: VendorBranchBriefModel;
}

@ObjectType({ description: 'Merchant authentication response containing session JWT' })
export class VendorAuthPayload {
  @Field(() => String, { description: 'Bearer access token for vendor operations' })
  accessToken!: string;

  @Field(() => VendorStaffProfileModel)
  staff!: VendorStaffProfileModel;

  @Field(() => VendorRestaurantBriefModel)
  restaurant!: VendorRestaurantBriefModel;

  @Field(() => VendorBranchBriefModel)
  branch!: VendorBranchBriefModel;
}
