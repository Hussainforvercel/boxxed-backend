import { Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

import { Onboarded } from '../../src/common/decorators/onboarded.decorator';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import {
  ACCEPT_CONSENTS,
  LEGAL_DOCUMENTS,
  ME,
  REFRESH_SESSION,
  SIGN_IN_WITH_GOOGLE,
  signInWithOtp,
  UPDATE_PROFILE,
} from '../utils/auth-flows';
import { createTestApp } from '../utils/create-test-app';
import { clearFakes, createFakes } from '../utils/fakes';
import { errorOf, gql } from '../utils/graphql';
import { resetState } from '../utils/reset-state';

import type { AuthPayloadResult, UserResult } from '../utils/auth-flows';
import type { INestApplication } from '@nestjs/common';

/** Test-only operation guarded by @Onboarded(), like every PROVISIONAL domain operation. */
@Resolver()
class OnboardedProbeResolver {
  @Onboarded()
  @Query(() => String)
  onboardedProbe(): string {
    return 'ok';
  }
}

@Module({ providers: [OnboardedProbeResolver] })
class OnboardedProbeModule {}

const PROBE = '{ onboardedProbe }';

describe('onboarding: PROFILE → CONSENT → COMPLETE, no phone (DEC-3)', () => {
  const fakes = createFakes();
  let app: INestApplication;
  let versions: { termsVersion: string; privacyVersion: string };

  const updateProfile = (token: string, fullName: string) =>
    gql<{ updateProfile: UserResult }>(app, UPDATE_PROFILE, {
      token,
      variables: { input: { fullName } },
    });
  const acceptConsents = (token: string, overrides: Record<string, unknown> = {}) =>
    gql<{ acceptConsents: UserResult }>(app, ACCEPT_CONSENTS, {
      token,
      variables: { input: { ...versions, whatsappMarketing: false, ...overrides } },
    });

  beforeAll(async () => {
    app = await createTestApp({}, { fakes, imports: [OnboardedProbeModule] });
    fakes.google.register('google-token', {
      sub: 'g-onboarding',
      email: 'google.user@gmail.com',
      emailVerified: true,
    });
    const docs = await gql<{ legalDocuments: { kind: string; version: string; url: string }[] }>(
      app,
      LEGAL_DOCUMENTS,
    );
    const version = (kind: string): string =>
      docs.data?.legalDocuments.find((doc) => doc.kind === kind)?.version ?? '';
    versions = { termsVersion: version('TERMS'), privacyVersion: version('PRIVACY') };
  });

  beforeEach(async () => {
    await resetState(app);
    clearFakes(fakes);
  });

  afterAll(async () => {
    await resetState(app);
    await app.close();
  });

  it('legalDocuments is public and lists Terms and Privacy with URLs', async () => {
    const docs = await gql(app, LEGAL_DOCUMENTS);
    expect(docs.data?.['legalDocuments']).toEqual([
      expect.objectContaining({ kind: 'TERMS', url: expect.stringMatching(/^https?:\/\//) }),
      expect.objectContaining({ kind: 'PRIVACY', url: expect.stringMatching(/^https?:\/\//) }),
    ]);
  });

  async function completeOnboarding(session: AuthPayloadResult): Promise<void> {
    const token = session.accessToken;
    expect(session.user.onboardingStep).toBe('PROFILE');
    expect(errorOf(await gql(app, PROBE, { token }))).toMatchObject({
      code: 'ONBOARDING_INCOMPLETE',
      onboardingStep: 'PROFILE',
    });

    const named = await updateProfile(token, '  Ali Raza  ');
    expect(named.data?.updateProfile).toMatchObject({
      fullName: 'Ali Raza',
      onboardingStep: 'CONSENT',
    });
    expect(errorOf(await gql(app, PROBE, { token }))).toMatchObject({
      code: 'ONBOARDING_INCOMPLETE',
      onboardingStep: 'CONSENT',
    });

    const consented = await acceptConsents(token, { whatsappMarketing: true });
    expect(consented.data?.acceptConsents).toMatchObject({
      onboardingStep: 'COMPLETE',
      phoneE164: null,
      phoneVerified: false,
    });
    expect(consented.data?.acceptConsents.consents).toEqual(
      expect.arrayContaining([
        { kind: 'TERMS', granted: true, version: versions.termsVersion },
        { kind: 'PRIVACY', granted: true, version: versions.privacyVersion },
        { kind: 'WHATSAPP_MARKETING', granted: true, version: versions.privacyVersion },
      ]),
    );

    // The access token still says PROFILE; the guard re-checks the DB and lets it through.
    expect(await gql(app, PROBE, { token })).toEqual({ data: { onboardedProbe: 'ok' } });
    const refreshed = await gql<{ refreshSession: AuthPayloadResult }>(app, REFRESH_SESSION, {
      variables: { input: { refreshToken: session.refreshToken } },
    });
    const claims = JSON.parse(
      Buffer.from(
        refreshed.data?.refreshSession.accessToken.split('.')[1] ?? '',
        'base64url',
      ).toString(),
    ) as { onb: string };
    expect(claims.onb).toBe('COMPLETE');

    const row = await app.get(PrismaService).user.findUniqueOrThrow({
      where: { id: session.user.id },
    });
    expect(row.phoneVerifiedAt).toBeNull();
    expect(row.onboardingStep).toBe('COMPLETE');
  }

  it('an email user reaches COMPLETE with name + terms and no phone', async () => {
    await completeOnboarding(await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com'));
  });

  it('a Google user reaches COMPLETE with name + terms and no phone', async () => {
    const google = await gql<{ signInWithGoogle: AuthPayloadResult }>(app, SIGN_IN_WITH_GOOGLE, {
      variables: { input: { idToken: 'google-token' } },
    });
    expect(google.errors).toBeUndefined();
    await completeOnboarding(google.data?.signInWithGoogle as AuthPayloadResult);
  });

  it('does not depend on screen order: consents first, then the name → COMPLETE', async () => {
    const { accessToken: token } = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    const consented = await acceptConsents(token);
    expect(consented.data?.acceptConsents.onboardingStep).toBe('PROFILE');
    const named = await updateProfile(token, 'Ali Raza');
    expect(named.data?.updateProfile.onboardingStep).toBe('COMPLETE');
  });

  it('rejects a stale legal version (the client must refetch legalDocuments)', async () => {
    const { accessToken: token } = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    await updateProfile(token, 'Ali Raza');
    const stale = await acceptConsents(token, { termsVersion: '1999-01-01' });
    expect(errorOf(stale)).toMatchObject({
      code: 'BAD_USER_INPUT',
      fields: { termsVersion: ['is out of date'] },
    });
    const me = await gql<{ me: UserResult }>(app, ME, { token });
    expect(me.data?.me).toMatchObject({ onboardingStep: 'CONSENT', consents: [] });
  });

  it('writes consent rows only when the state changes', async () => {
    const session = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    await acceptConsents(session.accessToken);
    await acceptConsents(session.accessToken);
    await acceptConsents(session.accessToken, { whatsappMarketing: true });
    const rows = await app.get(PrismaService).consentRecord.findMany({
      where: { userId: session.user.id },
    });
    expect(rows.map((row) => `${row.kind}:${row.granted}`).sort()).toEqual([
      'PRIVACY:true',
      'TERMS:true',
      'WHATSAPP_MARKETING:false',
      'WHATSAPP_MARKETING:true',
    ]);
  });

  it('validates the name (2–80 characters after trimming)', async () => {
    const { accessToken: token } = await signInWithOtp(app, fakes, 'EMAIL', 'you@example.com');
    expect(errorOf(await updateProfile(token, '  A  '))).toMatchObject({
      code: 'BAD_USER_INPUT',
      fields: { fullName: expect.any(Array) },
    });
    expect(errorOf(await updateProfile(token, 'x'.repeat(81)))).toMatchObject({
      code: 'BAD_USER_INPUT',
    });
  });

  it('the database refuses COMPLETE without a name, and a user without any contact', async () => {
    const prisma = app.get(PrismaService);
    await expect(
      prisma.user.create({ data: { email: 'x@example.com', onboardingStep: 'COMPLETE' } }),
    ).rejects.toThrow(/user_complete_requires_identity/);
    await expect(prisma.user.create({ data: {} })).rejects.toThrow(/user_has_contact/);
    // …but COMPLETE with a name and no phone is fine (DEC-3).
    await expect(
      prisma.user.create({
        data: { email: 'y@example.com', fullName: 'Y Z', onboardingStep: 'COMPLETE' },
      }),
    ).resolves.toMatchObject({ phoneE164: null });
  });
});
