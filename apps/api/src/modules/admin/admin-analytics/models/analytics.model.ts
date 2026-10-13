import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Executive operational KPIs for admin dashboard' })
export class AdminOverviewKpisModel {
  @Field(() => Int)
  activeRestaurantsCount!: number;

  @Field(() => Int)
  activeBoxesCount!: number;

  @Field(() => Int)
  todayReservationsCount!: number;

  @Field(() => Int)
  noShowsTodayCount!: number;
}

@ObjectType({ description: 'Immediate operational alerts requiring admin intervention' })
export class AdminNeedsAttentionModel {
  @Field(() => Int)
  pendingComplaintsCount!: number;

  @Field(() => Int)
  zeroDropsBranchesCount!: number;

  @Field(() => Int)
  expiringSoonDropsCount!: number;
}

@ObjectType({ description: 'Real-time fulfillment gauge for current operational window' })
export class AdminLiveTodayModel {
  @Field(() => Float)
  awaitingPickupPercent!: number;

  @Field(() => Float)
  pickedUpPercent!: number;

  @Field(() => Float)
  noShowPercent!: number;

  @Field(() => Int)
  totalReservations!: number;
}

@ObjectType({ description: 'Recent chronological operational activity log item' })
export class AdminRecentActivityModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  time!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  badge!: string;

  @Field(() => String)
  badgeType!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType({ description: 'Daily aggregated performance metrics' })
export class AdminDailyPerformanceModel {
  @Field(() => String)
  day!: string;

  @Field(() => String)
  date!: string;

  @Field(() => Int)
  boxesSold!: number;

  @Field(() => Int)
  reservations!: number;

  @Field(() => Int)
  pickedUp!: number;
}

@ObjectType({ description: 'Aggregated 7-day platform performance telemetry' })
export class AdminPlatformPerformanceModel {
  @Field(() => [AdminDailyPerformanceModel])
  days!: AdminDailyPerformanceModel[];

  @Field(() => Int)
  totalBoxesSold!: number;

  @Field(() => Int)
  totalReservations!: number;

  @Field(() => Int)
  totalPickedUp!: number;

  @Field(() => Float)
  percentageChange!: number;
}
