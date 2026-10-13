import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType({ description: 'Payload for adding a canonical dish to master catalog' })
export class CreateMasterMenuItemInput {
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
  @Min(100)
  basePriceMinor!: number;

  @Field(() => Int, { defaultValue: 800 })
  @IsInt()
  @Min(0)
  @Max(3000)
  @IsOptional()
  gstRateBasisPoints: number = 800;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
