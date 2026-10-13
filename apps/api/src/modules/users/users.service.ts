import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { OnboardingService } from './onboarding.service';
import { DomainError } from '../../common/errors/domain-error';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

import type { User } from '../../generated/prisma/client';
import type { VerifiedIdentity } from '../auth/strategies/identity-strategy';

export interface ResolvedUser {
  user: User;
  isNewUser: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Sign in required');
    return user;
  }

  /**
   * Sign-in-or-sign-up for a proven identity (docs/06 §5): the identity's user; else the user
   * owning the same verified contact (linked); else a new user at PROFILE. A unique-constraint
   * race with a parallel first sign-in is retried once and then finds the winner's rows.
   */
  async resolveIdentity(identity: VerifiedIdentity): Promise<ResolvedUser> {
    try {
      return await this.prisma.$transaction((tx) => this.resolveIn(tx, identity));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.prisma.$transaction((tx) => this.resolveIn(tx, identity));
    }
  }

  async updateProfile(userId: string, fullName: string): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { fullName } });
      return this.onboarding.recompute(userId, tx);
    });
  }

  private async resolveIn(
    tx: Prisma.TransactionClient,
    identity: VerifiedIdentity,
  ): Promise<ResolvedUser> {
    const { provider, subject } = identity;
    const existing = await tx.authIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      include: { user: true },
    });
    if (existing) {
      await tx.authIdentity.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() },
      });
      return { user: await markVerified(tx, existing.user, identity), isNewUser: false };
    }

    const owner = await findContactOwner(tx, identity);
    if (owner) {
      await tx.authIdentity.create({ data: { userId: owner.id, provider, subject } });
      return { user: await markVerified(tx, owner, identity), isNewUser: false };
    }

    const now = new Date();
    const user = await tx.user.create({
      data: {
        email: identity.email ?? null,
        emailVerifiedAt: identity.email ? now : null,
        phoneE164: identity.phoneE164 ?? null,
        phoneVerifiedAt: identity.phoneE164 ? now : null,
        identities: { create: { provider, subject } },
      },
    });
    return { user, isNewUser: true };
  }
}

/**
 * The user already holding this identity's proven contact. Only verified contacts link
 * (Q-A4 default); an unverified holder is a conflict, never a silent takeover.
 */
async function findContactOwner(
  tx: Prisma.TransactionClient,
  { email, phoneE164 }: VerifiedIdentity,
): Promise<User | null> {
  const owner = email
    ? await tx.user.findUnique({ where: { email } })
    : phoneE164
      ? await tx.user.findUnique({ where: { phoneE164 } })
      : null;
  if (!owner) return null;
  const verified = email ? owner.emailVerifiedAt !== null : owner.phoneVerifiedAt !== null;
  if (!verified || owner.deletedAt !== null) {
    throw new DomainError(
      ErrorCode.IDENTITY_CONFLICT,
      'This contact is linked to another account.',
    );
  }
  return owner;
}

/** Records proof of the contact this sign-in used, if the user didn't have it verified yet. */
async function markVerified(
  tx: Prisma.TransactionClient,
  user: User,
  { email, phoneE164 }: VerifiedIdentity,
): Promise<User> {
  const now = new Date();
  const data: Prisma.UserUpdateInput = {};
  if (email && user.email === email && !user.emailVerifiedAt) data.emailVerifiedAt = now;
  if (phoneE164 && user.phoneE164 === phoneE164 && !user.phoneVerifiedAt) {
    data.phoneVerifiedAt = now;
  }
  if (Object.keys(data).length === 0) return user;
  return tx.user.update({ where: { id: user.id }, data });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
