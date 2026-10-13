import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

@InputType({ description: 'Configuration payload to create or publish a new box drop' })
export class CreateVendorBoxInput {
  @Field(() => String, { defaultValue: 'SERIES 01' })
  @IsString()
  seriesCode!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Field(() => String)
  @IsString()
  subtitle!: string;

  @Field(() => String)
  @IsString()
  description!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  price!: number;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  originalValue!: number;

  @Field(() => Int)
  @IsNumber()
  @IsPositive()
  totalQuantity!: number;

  @Field(() => String, { defaultValue: '7:30 – 10:30 PM' })
  @IsString()
  pickupWindow!: string;

  @Field(() => String, { defaultValue: '10:15 PM' })
  @IsString()
  windowCloseTime!: string;

  @Field(() => String, { defaultValue: 'ACTIVE' })
  @IsString()
  status!: string;

  @Field(() => String, { defaultValue: 'Feast' })
  @IsString()
  category!: string;

  @Field(() => String, { defaultValue: 'Rack A1 – A4' })
  @IsString()
  rackAllocation!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
