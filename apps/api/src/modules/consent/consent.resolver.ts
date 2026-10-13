import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { ConsentService } from './consent.service';
import { AcceptConsentsInput } from './dto/accept-consents.input';
import { ConsentState } from './models/consent-state.model';
import { LegalDocument } from './models/legal-document.model';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserModel } from '../users/models/user.model';

import type { AuthUser } from '../../common/auth/auth-user';

@Resolver(() => UserModel)
export class ConsentResolver {
  constructor(private readonly consent: ConsentService) {}

  /** D-4 footer, D-8. */
  @Public()
  @Query(() => [LegalDocument])
  legalDocuments(): LegalDocument[] {
    return this.consent.legalDocuments();
  }

  /** D-8, P-6. Advances CONSENT → COMPLETE once Terms + Privacy are current. */
  @Mutation(() => UserModel)
  async acceptConsents(
    @CurrentUser() caller: AuthUser,
    @Args('input') input: AcceptConsentsInput,
  ): Promise<UserModel> {
    return UserModel.from(await this.consent.accept(caller.id, input));
  }

  @ResolveField(() => [ConsentState])
  consents(@Parent() user: UserModel): Promise<ConsentState[]> {
    return this.consent.currentConsents(user.id);
  }
}
