import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

@InputType({
  description: 'Payload to register a new permanent or temporary dish to the menu catalog',
})
export class CreateVendorMenuItemInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => String)
  @IsString()
  description!: string;

  @Field(() => String, { defaultValue: 'Mains' })
  @IsString()
  category!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  basePrice!: number;

  @Field(() => Float, { defaultValue: 0.15 })
  @IsNumber()
  gstRate!: number;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isTemporary!: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 7 })
  @IsOptional()
  @IsNumber()
  expiryDays?: number;

  @Field(() => [String], { defaultValue: ['Halal'] })
  @IsArray()
  dietaryTags!: string[];
}
