import { Field, ObjectType } from '@nestjs/graphql';

import { LegalDocumentKind } from './consent-enums';

@ObjectType()
export class LegalDocument {
  @Field(() => LegalDocumentKind)
  kind!: LegalDocumentKind;

  /** Sent back unchanged in `acceptConsents`; a stale one is rejected. */
  @Field()
  version!: string;

  @Field()
  url!: string;
}
