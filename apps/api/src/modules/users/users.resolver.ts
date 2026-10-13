import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { UpdateProfileInput } from './dto/update-profile.input';
import { UserModel } from './models/user.model';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { AuthUser } from '../../common/auth/auth-user';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  /** Launch routing, D-7, D-8. */
  @Query(() => UserModel)
  async me(@CurrentUser() caller: AuthUser): Promise<UserModel> {
    return UserModel.from(await this.users.getById(caller.id));
  }

  /** D-7: name only (DEC-3). Advances PROFILE → CONSENT (or COMPLETE if consents exist). */
  @Mutation(() => UserModel)
  async updateProfile(
    @CurrentUser() caller: AuthUser,
    @Args('input') input: UpdateProfileInput,
  ): Promise<UserModel> {
    return UserModel.from(await this.users.updateProfile(caller.id, input.fullName));
  }
}
