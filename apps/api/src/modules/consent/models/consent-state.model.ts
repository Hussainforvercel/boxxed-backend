import { Field, ObjectType } from '@nestjs/graphql';

import { ConsentKind } from './consent-enums';

/** The latest decision per kind (ConsentRecord is append-only). */
@ObjectType()
export class ConsentState {
  @Field(() => ConsentKind)
  kind!: ConsentKind;

  @Field()
  granted!: boolean;

  @Field()
  version!: string;

  @Field()
  updatedAt!: Date;
}
