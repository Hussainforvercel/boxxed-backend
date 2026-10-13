import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { StaffRole } from '../../../../generated/prisma/enums';

@InputType({ description: 'Payload for inviting a branch staff member' })
export class InviteBranchStaffInput {
  @Field(() => String)
  @IsUUID()
  branchId!: string;

  @Field(() => String)
  @IsNotEmpty()
  name!: string;

  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => StaffRole, { defaultValue: StaffRole.KITCHEN_STAFF })
  @IsEnum(StaffRole)
  @IsOptional()
  role: StaffRole = StaffRole.KITCHEN_STAFF;
}

@InputType({ description: 'Payload for adjusting operational throttles' })
export class UpdateBranchThrottleInput {
  @Field(() => String)
  @IsUUID()
  branchId!: string;

  @Field(() => Boolean)
  @IsBoolean()
  isThrottled!: boolean;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(120)
  prepBufferMinutes!: number;
}
