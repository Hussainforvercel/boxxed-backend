import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import { DropStatus, OrderStatus } from '../../../../generated/prisma/enums';

registerEnumType(DropStatus, {
  name: 'DropStatus',
  description: 'Lifecycle state of a box inventory drop',
});

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Customer order & reservation fulfillment state',
});

@ObjectType({ description: 'Branch summary on a box drop' })
export class AdminDropBranchSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  internalCode!: string;

  @Field(() => String)
  restaurantId!: string;
}

@ObjectType({ description: 'Administrative box drop entity' })
export class AdminDropModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String)
  branchId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  categoryTag!: string;

  @Field(() => String)
  headlineItem!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => Int)
  priceMinor!: number;

  @Field(() => Int)
  originalPriceMinor!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  discountTier!: string;

  @Field(() => Int)
  totalQuantity!: number;

  @Field(() => Int)
  remainingQuantity!: number;

  @Field(() => Date)
  pickupStart!: Date;

  @Field(() => Date)
  pickupEnd!: Date;

  @Field(() => String, { nullable: true })
  pickupSlotDuration?: string | null;

  @Field(() => DropStatus)
  status!: DropStatus;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  @Field(() => String, { nullable: true })
  postmortemNotes?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => AdminDropBranchSummaryModel, { nullable: true })
  branch?: AdminDropBranchSummaryModel;
}

@ObjectType({ description: 'Reservation claim record on a box drop' })
export class AdminDropReservationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => String)
  referenceCode!: string;

  @Field(() => String)
  customerPhone!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  priceMinor!: number;

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  collectedAt?: Date | null;
}

@ObjectType({ description: 'Waste reduction and salvage postmortem on expired drops' })
export class AdminDropPostmortemModel {
  @Field(() => ID)
  dropId!: string;

  @Field(() => Int)
  totalQuantity!: number;

  @Field(() => Int)
  soldQuantity!: number;

  @Field(() => Int)
  unsoldQuantity!: number;

  @Field(() => Int)
  revenueMinor!: number;

  @Field(() => Float)
  salvageRatePercent!: number;

  @Field(() => Float)
  wasteKgEstimated!: number;

  @Field(() => String, { nullable: true })
  notes?: string | null;
}
