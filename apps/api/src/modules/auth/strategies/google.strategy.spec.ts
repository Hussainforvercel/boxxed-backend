import { generateKeyPairSync } from 'node:crypto';

import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { ErrorCode } from '@boxxed/shared';

import { GoogleIdTokenVerifier } from './google-id-token.verifier';
import { GoogleStrategy } from './google.strategy';
import { DomainError } from '../../../common/errors/domain-error';

import type { AppConfig } from '../../../config/app-config.service';

// Real signature/audience/issuer checks from google-auth-library; only Google's public-cert
// download is replaced with a locally generated key.
const WEB = 'web-client.apps.googleusercontent.com';
const IOS = 'ios-client.apps.googleusercontent.com';
const KID = 'test-kid';

const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = (key: typeof google): string =>
  key.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const jwt = new JwtService();

interface TokenOptions {
  aud?: string;
  iss?: string;
  expiresIn?: number;
  email?: string | undefined;
  emailVerified?: boolean;
  key?: typeof google;
}

function idToken(options: TokenOptions = {}): string {
  const payload: Record<string, unknown> = {
    sub: '1098765432',
    email_verified: options.emailVerified ?? true,
    ...('email' in options ? { email: options.email } : { email: 'Ali@Gmail.com' }),
  };
  return jwt.sign(payload, {
    privateKey: pem(options.key ?? google),
    algorithm: 'RS256',
    keyid: KID,
    audience: options.aud ?? WEB,
    issuer: options.iss ?? 'https://accounts.google.com',
    expiresIn: options.expiresIn ?? 3600,
  });
}

describe('GoogleStrategy with the real google-auth-library verifier', () => {
  let strategy: GoogleStrategy;

  beforeAll(() => {
    const cert = google.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockResolvedValue({ certs: { [KID]: cert }, format: 'PEM' } as never);
    const config = { googleAudiences: [WEB, IOS] } as AppConfig;
    strategy = new GoogleStrategy(new GoogleIdTokenVerifier(config));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  async function expectInvalid(token: string): Promise<void> {
    const error = await strategy.verify({ idToken: token }).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(ErrorCode.GOOGLE_TOKEN_INVALID);
  }

  it.each([
    ['web (Android)', WEB],
    ['iOS', IOS],
  ])('accepts a token issued for the %s client id', async (_name, aud) => {
    await expect(strategy.verify({ idToken: idToken({ aud }) })).resolves.toEqual({
      provider: 'GOOGLE',
      subject: '1098765432',
      email: 'ali@gmail.com',
    });
  });

  it('accepts the bare accounts.google.com issuer', async () => {
    await expect(
      strategy.verify({ idToken: idToken({ iss: 'accounts.google.com' }) }),
    ).resolves.toMatchObject({ subject: '1098765432' });
  });

  it('rejects a token for another audience', async () => {
    await expectInvalid(idToken({ aud: 'someone-elses-app.apps.googleusercontent.com' }));
  });

  it('rejects a token from another issuer', async () => {
    await expectInvalid(idToken({ iss: 'https://evil.example.com' }));
  });

  // google-auth-library tolerates 300 s of clock skew, so expire well beyond it.
  it('rejects an expired token', async () => {
    await expectInvalid(idToken({ expiresIn: -3600 }));
  });

  it('rejects a token signed by a key Google does not publish', async () => {
    await expectInvalid(idToken({ key: attacker }));
  });

  it('rejects garbage', async () => {
    await expectInvalid('not.a.token');
  });

  it('rejects an unverified or missing email', async () => {
    await expectInvalid(idToken({ emailVerified: false }));
    await expectInvalid(idToken({ email: undefined }));
  });
});
