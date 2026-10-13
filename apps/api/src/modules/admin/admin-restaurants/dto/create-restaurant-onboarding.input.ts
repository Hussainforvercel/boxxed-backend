import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { BillingCadence } from '../../../../generated/prisma/enums';

@InputType({ description: 'Day operating schedule input' })
export class BranchScheduleDayInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Field(() => String)
  @IsNotEmpty()
  openTime!: string;

  @Field(() => String)
  @IsNotEmpty()
  closeTime!: string;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isClosed: boolean = false;
}

@InputType({ description: 'Initial master dish input' })
export class CreateInitialMasterItemInput {
  @Field(() => String)
  @IsNotEmpty()
  name!: string;

  @Field(() => String)
  @IsNotEmpty()
  specNarrative!: string;

  @Field(() => String)
  @IsNotEmpty()
  category!: string;

  @Field(() => Int)
  @IsInt()
  @Min(100) // At least PKR 1.00 minor
  basePriceMinor!: number;

  @Field(() => Int, { defaultValue: 800 })
  @IsInt()
  @Min(0)
  @Max(5000)
  @IsOptional()
  gstRateBasisPoints: number = 800;
}

@InputType({ description: 'Payload for complete multi-step restaurant onboarding wizard' })
export class CreateRestaurantOnboardingInput {
  // Step 1: Restaurant Identity
  @Field(() => String)
  @IsNotEmpty()
  name!: string;

  @Field(() => String)
  @IsNotEmpty()
  cuisine!: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => String)
  @IsNotEmpty()
  contactName!: string;

  @Field(() => String)
  @IsEmail()
  contactEmail!: string;

  @Field(() => String)
  @IsNotEmpty()
  contactPhone!: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  altPhone?: string;

  // Step 2: First Branch
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  branchName?: string;

  @Field(() => String)
  @IsNotEmpty()
  locationArea!: string;

  @Field(() => String)
  @IsNotEmpty()
  address!: string;

  @Field(() => Number, { defaultValue: 24.8607 })
  @IsNumber()
  @IsOptional()
  latitude: number = 24.8607;

  @Field(() => Number, { defaultValue: 67.0011 })
  @IsNumber()
  @IsOptional()
  longitude: number = 67.0011;

  @Field(() => Number, { defaultValue: 1.0 })
  @IsNumber()
  @IsOptional()
  geofenceRadiusKm: number = 1.0;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  branchPhone?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  branchEmail?: string;

  @Field(() => [BranchScheduleDayInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchScheduleDayInput)
  @IsOptional()
  schedules?: BranchScheduleDayInput[];

  // Step 3: Partnership & Billing
  @Field(() => Int, { defaultValue: 1500 })
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  commissionRateBasisPoints: number = 1500; // 15%

  @Field(() => Int, { defaultValue: 2500000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyFeeMinor: number = 2500000; // PKR 25,000

  @Field(() => Int, { defaultValue: 2500000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  onboardingFeeMinor: number = 2500000;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  @IsOptional()
  onboardingFeeSettled: boolean = false;

  @Field(() => BillingCadence, { defaultValue: BillingCadence.FOUR_WEEKS })
  @IsEnum(BillingCadence)
  @IsOptional()
  billingCadence: BillingCadence = BillingCadence.FOUR_WEEKS;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  gstRegistrationNumber?: string;

  @Field(() => Int, { defaultValue: 800 })
  @IsInt()
  @Min(0)
  @Max(5000)
  @IsOptional()
  gstRateBasisPoints: number = 800; // 8%

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  ntnNumber?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  hqLedgerNotes?: string;

  // Step 4: Initial Master Menu Dishes
  @Field(() => [CreateInitialMasterItemInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInitialMasterItemInput)
  @IsOptional()
  masterMenuItems?: CreateInitialMasterItemInput[];
}
