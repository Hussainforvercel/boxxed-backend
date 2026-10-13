import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Live service overview KPIs and stock metrics for branch station' })
export class VendorServiceOverviewModel {
  @Field(() => Float, { description: "Today's net sales in PKR" })
  todayNetSales!: number;

  @Field(() => Int, { description: 'Total orders fulfilled tonight' })
  todayOrdersCount!: number;

  @Field(() => Int, { description: 'Live active drop series count' })
  activeBoxesCount!: number;

  @Field(() => Int, { description: 'Guests awaiting pickup at counter right now' })
  awaitingPickupCount!: number;

  @Field(() => Int, { description: 'Total units allocated tonight' })
  totalUnits!: number;

  @Field(() => Int, { description: 'Total units claimed tonight' })
  claimedUnits!: number;

  @Field(() => Int, { description: 'Units remaining across all active drops' })
  unitsRemaining!: number;

  @Field(() => Int, { description: 'Live active drops count' })
  activeDropsCount!: number;

  @Field(() => Int, { description: 'Total reservations count today' })
  todayReservationsCount!: number;

  @Field(() => Int, { description: 'Pending pickup count at counter' })
  pendingPickupCount!: number;

  @Field(() => Int, { description: 'Total sales in minor currency units (paisa)' })
  totalSalesMinor!: number;
}
