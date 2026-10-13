import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Dish registry specification for batch costing and box composition' })
export class VendorMenuItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'Item inventory code e.g. #KS-M01' })
  code!: string;

  @Field(() => String, { nullable: true, description: 'SKU code e.g. ITM-FP-001' })
  sku?: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { description: 'Mains | Starters & Sides | Desserts | Beverages' })
  category!: string;

  @Field(() => Float, { description: 'Base price excl. GST in PKR' })
  basePrice!: number;

  @Field(() => Float, { description: 'Sindh SRB sales tax rate e.g. 0.15' })
  gstRate!: number;

  @Field(() => Float, { description: 'Final guest retail price incl. GST in PKR' })
  finalPrice!: number;

  @Field(() => Boolean)
  isTemporary!: boolean;

  @Field(() => Int, { nullable: true })
  expiryDays?: number | null;

  @Field(() => Boolean, { description: 'Real-time kitchen availability (86 switch)' })
  isAvailable!: boolean;

  @Field(() => [String])
  dietaryTags!: string[];
}
