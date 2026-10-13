import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { LegalDocumentKind } from './models/consent-enums';
import { DomainError } from '../../common/errors/domain-error';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { OnboardingService } from '../users/onboarding.service';

import type { AcceptConsentsInput } from './dto/accept-consents.input';
import type { ConsentState } from './models/consent-state.model';
import type { LegalDocument } from './models/legal-document.model';
import type { ConsentRecord, Prisma, User } from '../../generated/prisma/client';
import type { ConsentKind } from '../../generated/prisma/enums';

interface Decision {
  kind: ConsentKind;
  version: string;
  granted: boolean;
}

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
    private readonly config: AppConfig,
  ) {}

  /** The current Terms and Privacy documents (URLs + versions from config, Q-G1). */
  legalDocuments(): LegalDocument[] {
    const { terms, privacy } = this.config.legal;
    return [
      { kind: LegalDocumentKind.TERMS, ...terms },
      { kind: LegalDocumentKind.PRIVACY, ...privacy },
    ];
  }

  /**
   * D-8 / P-6. The versions must be the current ones (else BAD_USER_INPUT: the client refetches
   * `legalDocuments`). Appends a record only for a kind whose state changes, then re-derives
   * the onboarding step. WhatsApp marketing is versioned with the Privacy policy.
   */
  async accept(userId: string, input: AcceptConsentsInput): Promise<User> {
    const { terms, privacy } = this.config.legal;
    const stale: Record<string, string[]> = {};
    if (input.termsVersion !== terms.version) stale['termsVersion'] = ['is out of date'];
    if (input.privacyVersion !== privacy.version) stale['privacyVersion'] = ['is out of date'];
    if (Object.keys(stale).length > 0) {
      throw new DomainError(ErrorCode.BAD_USER_INPUT, 'The legal documents have changed.', {
        fields: stale,
      });
    }

    const decisions: Decision[] = [
      { kind: 'TERMS', version: terms.version, granted: true },
      { kind: 'PRIVACY', version: privacy.version, granted: true },
      { kind: 'WHATSAPP_MARKETING', version: privacy.version, granted: input.whatsappMarketing },
    ];
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const source = user.onboardingStep === 'COMPLETE' ? 'settings' : 'onboarding';
      const latest = await latestByKind(tx, userId);
      const changed = decisions.filter((decision) =>
        hasChanged(latest.get(decision.kind), decision),
      );
      if (changed.length > 0) {
        await tx.consentRecord.createMany({
          data: changed.map((decision) => ({ userId, source, ...decision })),
        });
      }
      return this.onboarding.recompute(userId, tx);
    });
  }

  async currentConsents(userId: string): Promise<ConsentState[]> {
    const latest = await latestByKind(this.prisma, userId);
    return [...latest.values()].map((record) => ({
      kind: record.kind,
      granted: record.granted,
      version: record.version,
      updatedAt: record.createdAt,
    }));
  }
}

async function latestByKind(
  db: Pick<Prisma.TransactionClient, 'consentRecord'>,
  userId: string,
): Promise<Map<ConsentKind, ConsentRecord>> {
  const records = await db.consentRecord.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const latest = new Map<ConsentKind, ConsentRecord>();
  for (const record of records) if (!latest.has(record.kind)) latest.set(record.kind, record);
  return latest;
}

function hasChanged(latest: ConsentRecord | undefined, decision: Decision): boolean {
  if (!latest || latest.granted !== decision.granted) return true;
  // Marketing opt-in/out is about the choice itself, not the policy version it was made under.
  return decision.kind !== 'WHATSAPP_MARKETING' && latest.version !== decision.version;
}
