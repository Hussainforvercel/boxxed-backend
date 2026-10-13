import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

import { FULL_NAME_MAX_LENGTH, FULL_NAME_MIN_LENGTH } from '@boxxed/shared';

import { trim } from '../../../common/validation/transforms';

@InputType()
export class UpdateProfileInput {
  /** "As on ID" (D-7): shown at the pickup counter. */
  @Field()
  @Transform(trim)
  @IsString()
  @Length(FULL_NAME_MIN_LENGTH, FULL_NAME_MAX_LENGTH)
  fullName!: string;
}
