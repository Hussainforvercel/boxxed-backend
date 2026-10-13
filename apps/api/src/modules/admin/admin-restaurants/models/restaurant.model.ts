import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import {
  BillingCadence,
  BranchStatus,
  PartnerStatus,
  SubscriptionTier,
} from '../../../../generated/prisma/enums';

registerEnumType(PartnerStatus, { name: 'PartnerStatus' });
registerEnumType(SubscriptionTier, { name: 'SubscriptionTier' });
registerEnumType(BillingCadence, { name: 'BillingCadence' });
registerEnumType(BranchStatus, { name: 'BranchStatus' });

@ObjectType({ description: 'Branch operating schedule day' })
export class BranchOperatingScheduleModel {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  dayOfWeek!: number;

  @Field(() => String)
  openTime!: string;

  @Field(() => String)
  closeTime!: string;

  @Field(() => Boolean)
  isClosed!: boolean;
}

@ObjectType({ description: 'Master menu catalog dish' })
export class MasterMenuItemModel {
  @Field(() => ID)
  id!: string;

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

  @Field(() => Boolean)
  isActive!: boolean;
}

@ObjectType({ description: 'Physical branch node' })
export class BranchModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  internalCode!: string;

  @Field(() => String)
  locationArea!: string;

  @Field(() => String)
  address!: string;

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

  @Field(() => [BranchOperatingScheduleModel], { nullable: 'itemsAndList' })
  schedules?: BranchOperatingScheduleModel[];
}

@ObjectType({ description: 'Partner restaurant entity' })
export class RestaurantModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  avatarLetter!: string;

  @Field(() => String, { nullable: true })
  avatarBg?: string | null;

  @Field(() => String)
  partnerNumber!: string;

  @Field(() => String)
  cuisine!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => PartnerStatus)
  status!: PartnerStatus;

  @Field(() => SubscriptionTier)
  subscription!: SubscriptionTier;

  @Field(() => String)
  contactName!: string;

  @Field(() => String)
  contactEmail!: string;

  @Field(() => String)
  contactPhone!: string;

  @Field(() => String, { nullable: true })
  altPhone?: string | null;

  @Field(() => Date)
  onboardingDate!: Date;

  @Field(() => Int)
  onboardingFeeMinor!: number;

  @Field(() => Boolean)
  onboardingFeeSettled!: boolean;

  @Field(() => Int)
  commissionRateBasisPoints!: number;

  @Field(() => Int)
  monthlyFeeMinor!: number;

  @Field(() => BillingCadence)
  billingCadence!: BillingCadence;

  @Field(() => String, { nullable: true })
  gstRegistrationNumber?: string | null;

  @Field(() => Int)
  gstRateBasisPoints!: number;

  @Field(() => String, { nullable: true })
  ntnNumber?: string | null;

  @Field(() => String, { nullable: true })
  hqLedgerNotes?: string | null;

  @Field(() => [BranchModel], { nullable: 'itemsAndList' })
  branches?: BranchModel[];

  @Field(() => [MasterMenuItemModel], { nullable: 'itemsAndList' })
  masterMenuItems?: MasterMenuItemModel[];

  @Field(() => Int, { defaultValue: 0 })
  branchesCount?: number;
}
