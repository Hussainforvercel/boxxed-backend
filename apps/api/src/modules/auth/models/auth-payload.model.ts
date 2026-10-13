import { Field, ObjectType } from '@nestjs/graphql';

import { UserModel } from '../../users/models/user.model';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field()
  accessTokenExpiresAt!: Date;

  @Field()
  refreshToken!: string;

  @Field(() => UserModel)
  user!: UserModel;

  /** Analytics and copy only; routing uses `user.onboardingStep`. */
  @Field()
  isNewUser!: boolean;
}
