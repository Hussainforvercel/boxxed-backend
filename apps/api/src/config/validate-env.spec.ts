import { parseDurationSeconds } from './duration';
import { validateEnv } from './validate-env';

const VALID = {
  NODE_ENV: 'development',
  APP_ENV: 'local',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ISSUER: 'boxxed-api',
  JWT_AUDIENCE: 'boxxed-app',
  OTP_HMAC_SECRET: 'o'.repeat(32),
  SMS_PROVIDER: 'console',
  GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: 'ios.apps.googleusercontent.com',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'no-reply@boxxed.test',
  LEGAL_TERMS_VERSION: '2026-09-01',
  LEGAL_TERMS_URL: 'https://boxxed.test/terms',
  LEGAL_PRIVACY_VERSION: '2026-09-01',
  LEGAL_PRIVACY_URL: 'https://boxxed.test/privacy',
};

const PROD = {
  ...VALID,
  APP_ENV: 'production',
  NODE_ENV: 'production',
  CORS_ORIGINS: 'https://boxxed.app',
  SMS_DAILY_CAP: '500',
};

describe('validateEnv', () => {
  it('accepts a minimal local environment and applies defaults', () => {
    const env = validateEnv({ ...VALID });
    expect(env.PORT).toBe(3000);
    expect(env.GRAPHQL_MAX_COMPLEXITY).toBe(1000);
    expect(env.GRAPHQL_MAX_DEPTH).toBe(8);
    expect(env.JWT_ACCESS_TTL).toBe('15m');
    expect(env.JWT_REFRESH_TTL).toBe('30d');
    expect(env.OTP_TTL_SECONDS).toBe(300);
    expect(env.OTP_MAX_ATTEMPTS).toBe(5);
    expect(env.OTP_RESEND_SECONDS).toBe(30);
    expect(env.OTP_LOCK_SECONDS).toBe(900);
    expect(env.SMTP_SECURE).toBe(false);
  });

  it.each(Object.keys(VALID))('fails naming %s when it is missing', (name) => {
    const raw: Record<string, unknown> = { ...VALID };
    delete raw[name];
    expect(() => validateEnv(raw)).toThrow(new RegExp(`${name} is required`));
  });

  it('treats empty values as unset', () => {
    expect(validateEnv({ ...VALID, SENTRY_DSN: '' }).SENTRY_DSN).toBeUndefined();
    expect(() => validateEnv({ ...VALID, DATABASE_URL: '' })).toThrow(/DATABASE_URL is required/);
  });

  it('reports invalid values', () => {
    expect(() => validateEnv({ ...VALID, REDIS_URL: 'http://nope' })).toThrow(
      /REDIS_URL is invalid/,
    );
    expect(() => validateEnv({ ...VALID, JWT_ACCESS_TTL: '15 minutes' })).toThrow(
      /JWT_ACCESS_TTL is invalid/,
    );
  });

  it('never echoes secret values in the error', () => {
    const secret = 'short-secret-value';
    expect(() => validateEnv({ ...VALID, JWT_ACCESS_SECRET: secret })).toThrow(
      /JWT_ACCESS_SECRET is invalid/,
    );
    try {
      validateEnv({ ...VALID, JWT_ACCESS_SECRET: secret });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it.each(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'OTP_HMAC_SECRET'])(
    'refuses %s shorter than 32 bytes',
    (name) => {
      expect(() => validateEnv({ ...VALID, [name]: 'x'.repeat(31) })).toThrow(
        new RegExp(`${name} is invalid`),
      );
    },
  );

  it('refuses identical access and refresh secrets', () => {
    const same = 's'.repeat(40);
    expect(() =>
      validateEnv({ ...VALID, JWT_ACCESS_SECRET: same, JWT_REFRESH_SECRET: same }),
    ).toThrow(/JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET/);
  });

  it('requires OTP_TEST_CODE and OTP_TEST_DESTINATIONS together, with a 6-digit code', () => {
    expect(() => validateEnv({ ...VALID, OTP_TEST_CODE: '123456' })).toThrow(
      /OTP_TEST_DESTINATIONS is required/,
    );
    expect(() => validateEnv({ ...VALID, OTP_TEST_DESTINATIONS: 'qa@boxxed.test' })).toThrow(
      /OTP_TEST_CODE is required/,
    );
    expect(() =>
      validateEnv({ ...VALID, OTP_TEST_DESTINATIONS: 'qa@boxxed.test', OTP_TEST_CODE: '12ab' }),
    ).toThrow(/OTP_TEST_CODE is invalid/);
  });

  it('requires CORS_ORIGINS and SMS_DAILY_CAP outside local', () => {
    const staging = () => validateEnv({ ...VALID, APP_ENV: 'staging' });
    expect(staging).toThrow(/CORS_ORIGINS is required/);
    expect(staging).toThrow(/SMS_DAILY_CAP is required/);
  });

  describe('production', () => {
    it('refuses SMS_PROVIDER=console', () => {
      expect(() => validateEnv(PROD)).toThrow(/SMS_PROVIDER must not be "console"/);
    });

    it('refuses OTP_TEST_CODE / OTP_TEST_DESTINATIONS', () => {
      expect(() =>
        validateEnv({ ...PROD, OTP_TEST_CODE: '123456', OTP_TEST_DESTINATIONS: 'qa@boxxed.test' }),
      ).toThrow(/OTP_TEST_CODE and OTP_TEST_DESTINATIONS must be unset in production/);
    });

    it('refuses CORS_ORIGINS="*"', () => {
      expect(() => validateEnv({ ...PROD, CORS_ORIGINS: '*' })).toThrow(
        /CORS_ORIGINS must not be "\*"/,
      );
    });
  });
});

describe('parseDurationSeconds', () => {
  it.each([
    ['45s', 45],
    ['15m', 900],
    ['2h', 7200],
    ['30d', 2_592_000],
  ])('%s → %i', (value, seconds) => {
    expect(parseDurationSeconds(value)).toBe(seconds);
  });

  it('throws on anything else', () => {
    expect(() => parseDurationSeconds('15')).toThrow();
  });
});
