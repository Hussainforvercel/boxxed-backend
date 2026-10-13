import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

@InputType({ description: 'Payload for creating a new mystery box drop' })
export class CreateDropInput {
  @Field(() => String)
  @IsUUID()
  branchId!: string;

  @Field(() => String)
  @IsNotEmpty()
  title!: string;

  @Field(() => String)
  @IsNotEmpty()
  categoryTag!: string;

  @Field(() => String)
  @IsNotEmpty()
  headlineItem!: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @Min(100)
  priceMinor!: number;

  @Field(() => Int)
  @IsInt()
  @Min(100)
  originalPriceMinor!: number;

  @Field(() => String, { defaultValue: '50% OFF' })
  @IsString()
  @IsOptional()
  discountTier: string = '50% OFF';

  @Field(() => Int)
  @IsInt()
  @Min(1)
  totalQuantity!: number;

  @Field(() => Date)
  @IsDate()
  pickupStart!: Date;

  @Field(() => Date)
  @IsDate()
  pickupEnd!: Date;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  pickupSlotDuration?: string;
}
