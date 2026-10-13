import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CustomerService } from './customer.service';
import { CustomerDropModel } from './models/customer-drop.model';
import { CustomerReservationModel } from './models/customer-reservation.model';
import { Public } from '../../common/decorators/public.decorator';
import { DropStatus } from '../../generated/prisma/enums';
import { TokenService } from '../auth/tokens/token.service';

interface GraphQLContext {
  req?: {
    headers?: Record<string, string | string[] | undefined>;
  };
}

@Resolver()
export class CustomerResolver {
  constructor(
    private readonly customerService: CustomerService,
    private readonly tokenService: TokenService,
  ) {}

  private async extractUserIdFromContext(context: GraphQLContext): Promise<string | null> {
    const authHeader = context.req?.headers?.authorization || context.req?.headers?.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const claims = await this.tokenService.verifyAccess(token);
      if (claims?.sub) return claims.sub;
    }
    return null;
  }

  @Public()
  @Query(() => [CustomerDropModel], {
    name: 'drops',
    description: 'Public Discover feed of available drops',
  })
  async drops(
    @Args('branchId', { nullable: true }) branchId?: string,
    @Args('status', { type: () => DropStatus, nullable: true }) status?: DropStatus,
  ): Promise<CustomerDropModel[]> {
    return this.customerService.getDrops(branchId, status);
  }

  @Public()
  @Query(() => CustomerDropModel, {
    name: 'drop',
    nullable: true,
    description: 'Single drop details by ID or SKU',
  })
  async drop(@Args('id') id: string): Promise<CustomerDropModel | null> {
    return this.customerService.getDropById(id);
  }

  @Public()
  @Mutation(() => CustomerReservationModel, {
    name: 'createReservation',
    description: 'Reserve a box drop with 3-minute Redis hold and instant stock lock',
  })
  async createReservation(
    @Args('dropId') dropId: string,
    @Args('quantity', { type: () => Int, nullable: true, defaultValue: 1 }) quantity = 1,
    @Context() context: GraphQLContext,
  ): Promise<CustomerReservationModel> {
    const userId = await this.extractUserIdFromContext(context);
    return this.customerService.createReservation(userId, dropId, quantity);
  }

  @Public()
  @Mutation(() => CustomerReservationModel, {
    name: 'holdDrop',
    description: 'Alias for createReservation for mobile hold flow',
  })
  async holdDrop(
    @Args('dropId') dropId: string,
    @Args('quantity', { type: () => Int, nullable: true, defaultValue: 1 }) quantity = 1,
    @Context() context: GraphQLContext,
  ): Promise<CustomerReservationModel> {
    const userId = await this.extractUserIdFromContext(context);
    return this.customerService.createReservation(userId, dropId, quantity);
  }
}
