import { Test } from '@nestjs/testing';

import type { AppConfig } from './app-config.service';

const ENV = {
  NODE_ENV: 'test',
  APP_ENV: 'local',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ISSUER: 'boxxed-api',
  JWT_AUDIENCE: 'boxxed-app',
  OTP_HMAC_SECRET: 'o'.repeat(32),
  SMS_PROVIDER: 'console',
  GOOGLE_WEB_CLIENT_ID: 'web',
  GOOGLE_IOS_CLIENT_ID: 'ios',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'no-reply@boxxed.test',
  LEGAL_TERMS_VERSION: '2026-09-01',
  LEGAL_TERMS_URL: 'https://boxxed.test/terms',
  LEGAL_PRIVACY_VERSION: '2026-09-01',
  LEGAL_PRIVACY_URL: 'https://boxxed.test/privacy',
};

/**
 * Loads AppConfigModule against a given process.env (it validates at import time) and runs
 * the assertions while that env is still in place, as it is in a running process.
 */
async function withConfig(
  env: Record<string, string>,
  assert: (config: AppConfig) => void,
): Promise<void> {
  const saved = process.env;
  process.env = { ...env };
  try {
    await jest.isolateModulesAsync(async () => {
      const { AppConfigModule } = await import('./config.module');
      const { AppConfig: Service } = await import('./app-config.service');
      const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule] }).compile();
      assert(moduleRef.get(Service));
    });
  } finally {
    process.env = saved;
  }
}

describe('AppConfig through AppConfigModule', () => {
  it('treats empty variables as unset (defaults apply, no raw "")', async () => {
    const empty = {
      SMS_DAILY_CAP: '',
      OTP_TEST_CODE: '',
      OTP_TEST_DESTINATIONS: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    };
    await withConfig({ ...ENV, ...empty }, (config) => {
      expect(config.smsDailyCap).toBe(1000);
      expect(config.otp.testCode).toBeUndefined();
      expect(config.otp.testDestinations.size).toBe(0);
      expect(config.smtp.user).toBeUndefined();
    });
  });

  it('returns typed values', async () => {
    const env = {
      ...ENV,
      SMS_DAILY_CAP: '250',
      SMTP_SECURE: 'true',
      OTP_TEST_CODE: '424242',
      OTP_TEST_DESTINATIONS: 'QA@Boxxed.test, +923001230000',
    };
    await withConfig(env, (config) => {
      expect(config.smsDailyCap).toBe(250);
      expect(config.smtp).toMatchObject({ port: 1025, secure: true });
      expect(config.jwt).toMatchObject({ accessTtlSeconds: 900, refreshTtlSeconds: 2_592_000 });
      expect([...config.otp.testDestinations]).toEqual(['qa@boxxed.test', '+923001230000']);
      expect(config.googleAudiences).toEqual(['web', 'ios']);
    });
  });
});
