import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

import type { Prisma, User } from '../../generated/prisma/client';
import type { ConsentKind, OnboardingStep } from '../../generated/prisma/enums';

export interface OnboardingFacts {
  fullName: string | null;
  /** The current TERMS and PRIVACY versions are both granted. */
  requiredConsentsGranted: boolean;
}

/**
 * The onboarding rule (DEC-3): a name, then the current Terms + Privacy. A verified phone is
 * never part of it. Derived from facts, so the D-7/D-8 order (Q-D2) doesn't matter.
 */
export function deriveStep({ fullName, requiredConsentsGranted }: OnboardingFacts): OnboardingStep {
  if (!fullName) return 'PROFILE';
  return requiredConsentsGranted ? 'COMPLETE' : 'CONSENT';
}

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /** Re-derives and stores `onboardingStep`. Call inside the transaction that changed a fact. */
  async recompute(userId: string, db: Db = this.prisma): Promise<User> {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const { terms, privacy } = this.config.legal;
    const [termsOk, privacyOk] = await Promise.all([
      this.isGranted(db, userId, 'TERMS', terms.version),
      this.isGranted(db, userId, 'PRIVACY', privacy.version),
    ]);
    const step = deriveStep({
      fullName: user.fullName,
      requiredConsentsGranted: termsOk && privacyOk,
    });
    if (step === user.onboardingStep) return user;
    return db.user.update({ where: { id: userId }, data: { onboardingStep: step } });
  }

  private async isGranted(
    db: Db,
    userId: string,
    kind: ConsentKind,
    version: string,
  ): Promise<boolean> {
    const latest = await db.consentRecord.findFirst({
      where: { userId, kind },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return latest?.granted === true && latest.version === version;
  }
}
