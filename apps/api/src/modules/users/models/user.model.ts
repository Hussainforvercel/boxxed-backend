import { Field, ID, ObjectType } from '@nestjs/graphql';

import { OnboardingStep, UserRole } from './user-enums';

import type { User } from '../../../generated/prisma/client';

/** The signed-in user (docs/09). `consents` is resolved by the consent module. */
@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field()
  emailVerified!: boolean;

  @Field(() => String, { nullable: true })
  phoneE164!: string | null;

  @Field()
  phoneVerified!: boolean;

  @Field(() => String, { nullable: true })
  fullName!: string | null;

  @Field(() => UserRole)
  role!: UserRole;

  /** Routing on the client always uses this, never `isNewUser`. */
  @Field(() => OnboardingStep)
  onboardingStep!: OnboardingStep;

  static from(user: User): UserModel {
    return Object.assign(new UserModel(), {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      phoneE164: user.phoneE164,
      phoneVerified: user.phoneVerifiedAt !== null,
      fullName: user.fullName,
      role: user.role,
      onboardingStep: user.onboardingStep,
    });
  }
}
