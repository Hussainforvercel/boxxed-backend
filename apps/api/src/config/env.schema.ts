import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export const APP_ENVS = ['local', 'staging', 'production'] as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
/** Production vendors are added here once chosen (Q-A2). `console` is refused in production. */
export const SMS_PROVIDERS = ['console'] as const;

/** `15m`, `30d`… parsed by `parseDuration`. */
export const DURATION_PATTERN = /^\d+[smhd]$/;
/** Secrets are at least 32 bytes (docs/12). */
export const MIN_SECRET_LENGTH = 32;

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/**
 * Environment for Phases 0–1. Variables for later phases are added with the phase that uses
 * them. Full list: docs/12-deployment.md#environment-variables.
 */
export class EnvironmentVariables {
  @IsIn(NODE_ENVS)
  NODE_ENV!: (typeof NODE_ENVS)[number];

  @IsIn(APP_ENVS)
  APP_ENV!: (typeof APP_ENVS)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  DATABASE_URL!: string;

  @IsUrl({ protocols: ['redis', 'rediss'], require_tld: false })
  REDIS_URL!: string;

  @IsIn(LOG_LEVELS)
  LOG_LEVEL: (typeof LOG_LEVELS)[number] = 'info';

  /** Comma-separated origins, or "*". Required outside local. */
  @ValidateIf((env: EnvironmentVariables) => env.APP_ENV !== 'local')
  @IsString()
  CORS_ORIGINS?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY_HOPS = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  GRAPHQL_MAX_COMPLEXITY = 1000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  GRAPHQL_MAX_DEPTH = 8;

  @IsOptional()
  @IsUrl()
  SENTRY_DSN?: string;

  // ── Tokens (docs/06 §5) ──────────────────────────────────────────────

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_REFRESH_SECRET!: string;

  @Matches(DURATION_PATTERN)
  JWT_ACCESS_TTL = '15m';

  @Matches(DURATION_PATTERN)
  JWT_REFRESH_TTL = '30d';

  @IsString()
  JWT_ISSUER!: string;

  @IsString()
  JWT_AUDIENCE!: string;

  // ── OTP ──────────────────────────────────────────────────────────────

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  OTP_HMAC_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(30)
  OTP_TTL_SECONDS = 300;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  OTP_MAX_ATTEMPTS = 5;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  OTP_RESEND_SECONDS = 30;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  OTP_LOCK_SECONDS = 900;

  /** Comma-separated emails / E.164 phones that get OTP_TEST_CODE (staging E2E; never prod). */
  @IsOptional()
  @IsString()
  OTP_TEST_DESTINATIONS?: string;

  @IsOptional()
  @Matches(/^\d{6}$/)
  OTP_TEST_CODE?: string;

  // ── SMS ──────────────────────────────────────────────────────────────

  @IsIn(SMS_PROVIDERS)
  SMS_PROVIDER!: (typeof SMS_PROVIDERS)[number];

  /** Global SMS-per-UTC-day circuit breaker. Required outside local (local default: 1000). */
  @ValidateIf(
    (env: EnvironmentVariables) => env.APP_ENV !== 'local' || env.SMS_DAILY_CAP !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SMS_DAILY_CAP?: number;

  // ── Google (docs/12 §Google Sign-In setup) ───────────────────────────

  @IsString()
  GOOGLE_WEB_CLIENT_ID!: string;

  @IsString()
  GOOGLE_IOS_CLIENT_ID!: string;

  // ── Mail ─────────────────────────────────────────────────────────────

  @IsString()
  SMTP_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT!: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  /** true = implicit TLS (465); false = STARTTLS when offered (587) or plain (local catcher). */
  @Transform(toBoolean)
  @IsBoolean()
  SMTP_SECURE = false;

  @IsEmail()
  MAIL_FROM!: string;

  // ── Legal documents (Q-G1: placeholders are fine outside production) ─

  @IsString()
  @Matches(/^[\w.-]{1,32}$/)
  LEGAL_TERMS_VERSION!: string;

  @IsUrl({ require_tld: false })
  LEGAL_TERMS_URL!: string;

  @IsString()
  @Matches(/^[\w.-]{1,32}$/)
  LEGAL_PRIVACY_VERSION!: string;

  @IsUrl({ require_tld: false })
  LEGAL_PRIVACY_URL!: string;
}
