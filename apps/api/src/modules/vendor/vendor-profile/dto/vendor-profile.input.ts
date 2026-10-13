import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType({ description: 'Update restaurant merchant profile' })
export class UpdateVendorProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  executiveChef?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  managerName?: string;
}
