import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Bank account details for automated disbursement' })
export class VendorBankDetailsModel {
  @Field(() => String, { nullable: true })
  bankName?: string | null;

  @Field(() => String, { nullable: true })
  accountTitle?: string | null;

  @Field(() => String, { nullable: true })
  accountNumber?: string | null;

  @Field(() => String, { nullable: true })
  iban?: string | null;
}

@ObjectType({ description: 'Branch kitchen station node' })
export class VendorBranchStationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  area!: string;

  @Field(() => String)
  address!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => Boolean)
  isPrimary!: boolean;

  @Field(() => String)
  status!: string; // "ONLINE" | "BUSY" | "CLOSED"

  @Field(() => String)
  kitchenHours!: string;

  @Field(() => Int)
  activeBoxes!: number;

  @Field(() => Int)
  pendingPickups!: number;
}

@ObjectType({ description: 'Merchant trading profile and station registry' })
export class VendorRestaurantProfileModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  partnerId!: string;

  @Field(() => String)
  cuisine!: string;

  @Field(() => String)
  district!: string;

  @Field(() => String)
  address!: string;

  @Field(() => String)
  primaryPhone!: string;

  @Field(() => String, { nullable: true })
  altPhone?: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  executiveChef!: string;

  @Field(() => String)
  managerName!: string;

  @Field(() => String)
  stationId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Int)
  verificationPercent!: number;

  @Field(() => String)
  activeDropWindow!: string;

  @Field(() => Float)
  gstRate!: number; // 0.15 = 15%

  @Field(() => VendorBankDetailsModel)
  bankDetails!: VendorBankDetailsModel;

  @Field(() => [VendorBranchStationModel])
  branches!: VendorBranchStationModel[];
}
