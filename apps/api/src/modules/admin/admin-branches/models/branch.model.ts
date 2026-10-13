import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import { BranchStatus, StaffRole, StaffStatus } from '../../../../generated/prisma/enums';
import { BranchOperatingScheduleModel } from '../../admin-restaurants/models/restaurant.model';

export { BranchOperatingScheduleModel };

registerEnumType(StaffRole, {
  name: 'StaffRole',
  description: 'Branch staff authorization tier',
});

registerEnumType(StaffStatus, {
  name: 'StaffStatus',
  description: 'Staff invitation or activation lifecycle status',
});

@ObjectType({ description: 'Restaurant parent brief for branch' })
export class BranchRestaurantSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  partnerNumber!: string;

  @Field(() => String)
  slug!: string;
}

@ObjectType({ description: 'Branch staff membership record' })
export class BranchStaffModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  branchId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => StaffRole)
  role!: StaffRole;

  @Field(() => StaffStatus)
  status!: StaffStatus;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType({ description: 'Physical branch node with real-time operational metrics' })
export class BranchDetailModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  restaurantId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  internalCode!: string;

  @Field(() => String)
  locationArea!: string;

  @Field(() => String)
  address!: string;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field(() => Float)
  geofenceRadiusKm!: number;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  email!: string;

  @Field(() => BranchStatus)
  status!: BranchStatus;

  @Field(() => Boolean)
  orderIngestionEnabled!: boolean;

  @Field(() => Boolean)
  isThrottled!: boolean;

  @Field(() => Int)
  prepBufferMinutes!: number;

  @Field(() => Int)
  maxOrdersPerHour!: number;

  @Field(() => Int)
  liveBoxesCount!: number;

  @Field(() => Int)
  activeDropsCount!: number;

  @Field(() => Int)
  todayReservationsCount!: number;

  @Field(() => BranchRestaurantSummaryModel, { nullable: true })
  restaurant?: BranchRestaurantSummaryModel;

  @Field(() => [BranchOperatingScheduleModel], { nullable: true })
  schedules?: BranchOperatingScheduleModel[];
}
