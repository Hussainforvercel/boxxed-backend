import { ErrorCode } from '@boxxed/shared';

import { ConsentService } from './consent.service';
import { DomainError } from '../../common/errors/domain-error';

import type { AppConfig } from '../../config/app-config.service';
import type { ConsentRecord } from '../../generated/prisma/client';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { OnboardingService } from '../users/onboarding.service';

const V = '2026-09-01';
const config = {
  legal: {
    terms: { version: V, url: 'https://x/terms' },
    privacy: { version: V, url: 'https://x/privacy' },
  },
} as AppConfig;

function record(kind: ConsentRecord['kind'], granted: boolean, version = V): ConsentRecord {
  return {
    id: kind,
    userId: 'u1',
    kind,
    granted,
    version,
    source: 'onboarding',
    createdAt: new Date(),
  };
}

function setup(existing: ConsentRecord[] = []): {
  service: ConsentService;
  createMany: jest.Mock;
  recompute: jest.Mock;
} {
  const createMany = jest.fn(async () => ({ count: 0 }));
  const tx = {
    user: { findUniqueOrThrow: jest.fn(async () => ({ id: 'u1', onboardingStep: 'CONSENT' })) },
    consentRecord: { findMany: jest.fn(async () => existing), createMany },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;
  const recompute = jest.fn(async () => ({ id: 'u1' }));
  const onboarding = { recompute } as unknown as OnboardingService;
  return { service: new ConsentService(prisma, onboarding, config), createMany, recompute };
}

const INPUT = { termsVersion: V, privacyVersion: V, whatsappMarketing: false };

describe('ConsentService', () => {
  it('lists the configured legal documents', () => {
    expect(setup().service.legalDocuments()).toEqual([
      { kind: 'TERMS', version: V, url: 'https://x/terms' },
      { kind: 'PRIVACY', version: V, url: 'https://x/privacy' },
    ]);
  });

  it('rejects a stale version with BAD_USER_INPUT naming the field', async () => {
    const { service, createMany } = setup();
    const error = await service
      .accept('u1', { ...INPUT, termsVersion: '2025-01-01' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(ErrorCode.BAD_USER_INPUT);
    expect((error as DomainError).extensions['fields']).toEqual({
      termsVersion: ['is out of date'],
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('writes one record per kind the first time, then recomputes the step', async () => {
    const { service, createMany, recompute } = setup();
    await service.accept('u1', INPUT);
    const rows = (createMany.mock.calls[0] as [{ data: { kind: string; granted: boolean }[] }])[0]
      .data;
    expect(rows.map((row) => [row.kind, row.granted])).toEqual([
      ['TERMS', true],
      ['PRIVACY', true],
      ['WHATSAPP_MARKETING', false],
    ]);
    expect(recompute).toHaveBeenCalledWith('u1', expect.anything());
  });

  it('appends nothing when nothing changed', async () => {
    const { service, createMany } = setup([
      record('TERMS', true),
      record('PRIVACY', true),
      record('WHATSAPP_MARKETING', false),
    ]);
    await service.accept('u1', INPUT);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('appends only the kind that changed', async () => {
    const { service, createMany } = setup([
      record('TERMS', true),
      record('PRIVACY', true),
      record('WHATSAPP_MARKETING', false),
    ]);
    await service.accept('u1', { ...INPUT, whatsappMarketing: true });
    const rows = (createMany.mock.calls[0] as [{ data: { kind: string }[] }])[0].data;
    expect(rows.map((row) => row.kind)).toEqual(['WHATSAPP_MARKETING']);
  });

  it('re-records Terms accepted under an older version', async () => {
    const { service, createMany } = setup([
      record('TERMS', true, '2025-01-01'),
      record('PRIVACY', true),
      record('WHATSAPP_MARKETING', false, '2025-01-01'),
    ]);
    await service.accept('u1', INPUT);
    const rows = (createMany.mock.calls[0] as [{ data: { kind: string }[] }])[0].data;
    expect(rows.map((row) => row.kind)).toEqual(['TERMS']);
  });
});
