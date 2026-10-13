import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

import { OTP_LENGTH } from '@boxxed/shared';

import { IsOtpDestination, normalizeDestination } from './is-otp-destination';
import { OtpChannel } from '../models/otp-channel.enum';

/** Signed JWTs are a few KB at most; anything bigger is not a token. */
const MAX_TOKEN_LENGTH = 4096;

@InputType()
export class RequestOtpInput {
  @Field(() => OtpChannel)
  @IsIn(Object.values(OtpChannel))
  channel!: OtpChannel;

  /** An email, or a phone in international format (normalized to E.164). */
  @Field()
  @Transform(normalizeDestination)
  @IsOtpDestination()
  destination!: string;
}

@InputType()
export class VerifyOtpInput extends RequestOtpInput {
  @Field()
  @IsString()
  @Length(OTP_LENGTH, OTP_LENGTH)
  @Matches(/^\d+$/, { message: 'must contain digits only' })
  code!: string;
}

@InputType()
export class SignInWithGoogleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TOKEN_LENGTH)
  idToken!: string;
}

@InputType()
export class RefreshSessionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TOKEN_LENGTH)
  refreshToken!: string;
}

@InputType()
export class SignOutInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TOKEN_LENGTH)
  refreshToken!: string;
}
