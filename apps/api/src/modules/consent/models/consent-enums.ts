import { registerEnumType } from '@nestjs/graphql';

import { ConsentKind } from '../../../generated/prisma/enums';

/** The documents a user can open (D-4 footer, D-8). WhatsApp consent has no document. */
export const LegalDocumentKind = { TERMS: 'TERMS', PRIVACY: 'PRIVACY' } as const;
export type LegalDocumentKind = (typeof LegalDocumentKind)[keyof typeof LegalDocumentKind];

registerEnumType(ConsentKind, { name: 'ConsentKind' });
registerEnumType(LegalDocumentKind, { name: 'LegalDocumentKind' });

export { ConsentKind };
