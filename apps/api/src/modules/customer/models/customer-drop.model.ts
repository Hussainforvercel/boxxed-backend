import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Restaurant summary for public/customer drop' })
export class CustomerDropRestaurantModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  partnerNumber!: string;

  @Field(() => String)
  cuisine!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  district?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String)
  timeZone!: string;
}

@ObjectType({ description: 'Branch summary for customer drop' })
export class CustomerDropBranchModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  internalCode!: string;

  @Field(() => String)
  locationArea!: string;

  @Field(() => String)
  address!: string;
}

@ObjectType({ description: 'Live customer inventory drop' })
export class CustomerDropModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  headlineItem!: string;

  @Field(() => String)
  categoryTag!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => Int, { description: 'Price in minor cents (e.g. 65000)' })
  priceMinor!: number;

  @Field(() => Float, { description: 'Price in PKR currency (e.g. 650)' })
  price!: number;

  @Field(() => Int, { description: 'Original retail value in minor cents (e.g. 165000)' })
  originalPriceMinor!: number;

  @Field(() => Float, { description: 'Original retail value in PKR currency (e.g. 1650)' })
  originalPrice!: number;

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

  @Field(() => String, { nullable: true })
  seriesCode?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => CustomerDropRestaurantModel)
  restaurant!: CustomerDropRestaurantModel;

  @Field(() => CustomerDropBranchModel)
  branch!: CustomerDropBranchModel;
}
