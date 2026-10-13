import { Field, Int, ObjectType } from '@nestjs/graphql';

import { OtpChannel } from './otp-channel.enum';

/** Returned for any destination, known or not (no account enumeration). */
@ObjectType()
export class OtpChallenge {
  @Field(() => OtpChannel)
  channel!: OtpChannel;

  /** "you@ex•••.com", "+92 300 •••4567". */
  @Field()
  maskedDestination!: string;

  @Field()
  expiresAt!: Date;

  /** Drives the "Resend in 00:30" countdown from an absolute time. */
  @Field()
  resendAvailableAt!: Date;

  @Field(() => Int)
  codeLength!: number;
}
