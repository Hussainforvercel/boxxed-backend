import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Curated limited box release drop' })
export class VendorBoxDropModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  seriesCode!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  subtitle!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Float, { description: 'Drop customer price in PKR' })
  price!: number;

  @Field(() => Float, { description: 'Original retail value in PKR' })
  originalValue!: number;

  @Field(() => Int, { description: 'Number of units claimed so far' })
  claimedCount!: number;

  @Field(() => Int, { description: 'Total drop allocation quota' })
  totalQuantity!: number;

  @Field(() => Int, { description: 'Units remaining to be claimed' })
  remainingQuantity!: number;

  @Field(() => String)
  windowCloseTime!: string;

  @Field(() => String)
  pickupWindow!: string;

  @Field(() => String, { description: 'ACTIVE | SCHEDULED | SOLDOUT | DRAFT' })
  status!: string;

  @Field(() => String, { description: 'Feast | Craft BBQ | Special | Bakery' })
  category!: string;

  @Field(() => String)
  rackAllocation!: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => String, { nullable: true })
  scheduledTimeText?: string | null;
}
