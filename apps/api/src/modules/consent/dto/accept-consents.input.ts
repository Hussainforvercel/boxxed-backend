import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsString, MaxLength } from 'class-validator';

@InputType()
export class AcceptConsentsInput {
  /** The TERMS version from `legalDocuments` the user saw. */
  @Field()
  @IsString()
  @MaxLength(32)
  termsVersion!: string;

  /** The PRIVACY version from `legalDocuments` the user saw. */
  @Field()
  @IsString()
  @MaxLength(32)
  privacyVersion!: string;

  /** Optional marketing consent (D-8 checkbox). */
  @Field()
  @IsBoolean()
  whatsappMarketing!: boolean;
}
