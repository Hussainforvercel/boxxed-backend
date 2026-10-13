import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EnvironmentVariables } from './env.schema';

/**
 * Validates process env at boot (ConfigModule `validate`). Throws with every problem listed by
 * variable name so the process exits before it starts listening (docs/06 §10).
 * Messages name variables only, never their values (they may be secrets).
 */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  // `FOO=` in an env file means "unset": optional values stay optional, required ones fail.
  const defined = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''));
  const env = plainToInstance(EnvironmentVariables, defined, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });

  const problems = errors.map((error) => {
    const value = raw[error.property];
    const reason = value === undefined || value === '' ? 'is required' : 'is invalid';
    return `  - ${error.property} ${reason}`;
  });
  problems.push(...crossFieldProblems(env), ...productionProblems(env));

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return env;
}

function crossFieldProblems(env: EnvironmentVariables): string[] {
  const problems: string[] = [];
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('  - JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET');
  }
  if (env.OTP_TEST_CODE && !env.OTP_TEST_DESTINATIONS) {
    problems.push('  - OTP_TEST_DESTINATIONS is required when OTP_TEST_CODE is set');
  }
  if (env.OTP_TEST_DESTINATIONS && !env.OTP_TEST_CODE) {
    problems.push('  - OTP_TEST_CODE is required when OTP_TEST_DESTINATIONS is set');
  }
  return problems;
}

function productionProblems(env: EnvironmentVariables): string[] {
  if (env.APP_ENV !== 'production') return [];
  const problems: string[] = [];
  if (env.NODE_ENV !== 'production') problems.push('  - NODE_ENV must be "production"');
  if (env.CORS_ORIGINS === '*') problems.push('  - CORS_ORIGINS must not be "*" in production');
  if (env.SMS_PROVIDER === 'console') {
    problems.push('  - SMS_PROVIDER must not be "console" in production');
  }
  if (env.OTP_TEST_CODE !== undefined || env.OTP_TEST_DESTINATIONS !== undefined) {
    problems.push('  - OTP_TEST_CODE and OTP_TEST_DESTINATIONS must be unset in production');
  }
  return problems;
}
