import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Master canonical menu item' })
export class AdminMasterMenuItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  restaurantId!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  specNarrative!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Int)
  basePriceMinor!: number;

  @Field(() => Int)
  gstRateBasisPoints!: number;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType({ description: 'Branch-level catalog item availability override' })
export class AdminBranchMenuOverrideModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  branchId!: string;

  @Field(() => String)
  masterMenuItemId!: string;

  @Field(() => Boolean)
  isAvailable!: boolean;

  @Field(() => Int, { nullable: true })
  customPriceMinor?: number | null;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => AdminMasterMenuItemModel, { nullable: true })
  masterItem?: AdminMasterMenuItemModel;
}
