import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { parseDurationSeconds } from './duration';

import type { EnvironmentVariables } from './env.schema';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  issuer: string;
  audience: string;
}

export interface OtpConfig {
  hmacSecret: string;
  ttlSeconds: number;
  maxAttempts: number;
  resendSeconds: number;
  lockSeconds: number;
  /** Staging E2E allow-list (normalized destinations); empty when unset. */
  testDestinations: ReadonlySet<string>;
  testCode: string | undefined;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  pass: string | undefined;
  from: string;
}

export interface LegalDocumentConfig {
  version: string;
  url: string;
}

/** Local default for the SMS circuit breaker; required explicitly elsewhere (env.schema). */
const LOCAL_SMS_DAILY_CAP = 1000;

/** The only way services read configuration (process.env is banned outside src/config). */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get nodeEnv(): EnvironmentVariables['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get appEnv(): EnvironmentVariables['APP_ENV'] {
    return this.config.get('APP_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get logLevel(): EnvironmentVariables['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get corsOrigins(): string[] | '*' {
    const raw = this.config.get('CORS_ORIGINS', { infer: true }) ?? '*';
    return raw.trim() === '*' ? '*' : raw.split(',').map((origin) => origin.trim());
  }

  get trustProxyHops(): number {
    return this.config.get('TRUST_PROXY_HOPS', { infer: true });
  }

  get graphqlMaxComplexity(): number {
    return this.config.get('GRAPHQL_MAX_COMPLEXITY', { infer: true });
  }

  get graphqlMaxDepth(): number {
    return this.config.get('GRAPHQL_MAX_DEPTH', { infer: true });
  }

  get jwt(): JwtConfig {
    return {
      accessSecret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      refreshSecret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      accessTtlSeconds: parseDurationSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true })),
      refreshTtlSeconds: parseDurationSeconds(this.config.get('JWT_REFRESH_TTL', { infer: true })),
      issuer: this.config.get('JWT_ISSUER', { infer: true }),
      audience: this.config.get('JWT_AUDIENCE', { infer: true }),
    };
  }

  get otp(): OtpConfig {
    const destinations = this.config.get('OTP_TEST_DESTINATIONS', { infer: true }) ?? '';
    return {
      hmacSecret: this.config.get('OTP_HMAC_SECRET', { infer: true }),
      ttlSeconds: this.config.get('OTP_TTL_SECONDS', { infer: true }),
      maxAttempts: this.config.get('OTP_MAX_ATTEMPTS', { infer: true }),
      resendSeconds: this.config.get('OTP_RESEND_SECONDS', { infer: true }),
      lockSeconds: this.config.get('OTP_LOCK_SECONDS', { infer: true }),
      testDestinations: new Set(
        destinations
          .split(',')
          .map((destination) => destination.trim().toLowerCase())
          .filter((destination) => destination.length > 0),
      ),
      testCode: this.config.get('OTP_TEST_CODE', { infer: true }),
    };
  }

  get smsProvider(): EnvironmentVariables['SMS_PROVIDER'] {
    return this.config.get('SMS_PROVIDER', { infer: true });
  }

  get smsDailyCap(): number {
    return this.config.get('SMS_DAILY_CAP', { infer: true }) ?? LOCAL_SMS_DAILY_CAP;
  }

  /** Accepted `aud` values for Google ID tokens: Android/web-issued and iOS-issued. */
  get googleAudiences(): string[] {
    return [
      this.config.get('GOOGLE_WEB_CLIENT_ID', { infer: true }),
      this.config.get('GOOGLE_IOS_CLIENT_ID', { infer: true }),
    ];
  }

  get smtp(): SmtpConfig {
    return {
      host: this.config.get('SMTP_HOST', { infer: true }),
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      user: this.config.get('SMTP_USER', { infer: true }),
      pass: this.config.get('SMTP_PASS', { infer: true }),
      from: this.config.get('MAIL_FROM', { infer: true }),
    };
  }

  get legal(): { terms: LegalDocumentConfig; privacy: LegalDocumentConfig } {
    return {
      terms: {
        version: this.config.get('LEGAL_TERMS_VERSION', { infer: true }),
        url: this.config.get('LEGAL_TERMS_URL', { infer: true }),
      },
      privacy: {
        version: this.config.get('LEGAL_PRIVACY_VERSION', { infer: true }),
        url: this.config.get('LEGAL_PRIVACY_URL', { infer: true }),
      },
    };
  }
}
