import { buildApi, currentEnv, freePort, startApi } from '../utils/built-api';

// The real `node dist/main.js` must exit before listening when the configuration is unsafe
// (docs/06 §10, Phase 1A acceptance criterion). Unit coverage: validate-env.spec.ts.
const PRODUCTION = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  CORS_ORIGINS: 'https://boxxed.app',
  SMS_DAILY_CAP: '500',
  OTP_TEST_CODE: '',
  OTP_TEST_DESTINATIONS: '',
  SENTRY_DSN: '',
};

/** The "  - …" lines of the "Invalid environment configuration" error. */
const problems = (output: string): string[] =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));

async function boot(
  env: Record<string, string | undefined>,
): Promise<{ code: number | null; output: string }> {
  const api = startApi({ ...currentEnv(), PORT: String(await freePort()), ...env });
  const code = await api.exited;
  return { code, output: api.output() };
}

describe('boot-time configuration checks (built API process)', () => {
  beforeAll(() => {
    buildApi();
  }, 120_000);

  it('refuses SMS_PROVIDER=console in production', async () => {
    const { code, output } = await boot({ ...PRODUCTION, SMS_PROVIDER: 'console' });
    expect(code).toBe(1);
    expect(problems(output)).toEqual(['- SMS_PROVIDER must not be "console" in production']);
  });

  it('refuses OTP_TEST_CODE / OTP_TEST_DESTINATIONS in production', async () => {
    // A production SMS vendor doesn't exist yet (Q-A2), so console's refusal is expected too.
    const { code, output } = await boot({
      ...PRODUCTION,
      OTP_TEST_CODE: '424242',
      OTP_TEST_DESTINATIONS: 'qa@boxxed.test',
    });
    expect(code).toBe(1);
    expect(problems(output)).toEqual([
      '- SMS_PROVIDER must not be "console" in production',
      '- OTP_TEST_CODE and OTP_TEST_DESTINATIONS must be unset in production',
    ]);
  });

  it('the current environment boots-validates cleanly (baseline for the cases below)', async () => {
    const api = startApi({ ...currentEnv(), PORT: String(await freePort()) });
    const deadline = Date.now() + 15_000;
    while (
      !api.output().includes('Nest application successfully started') &&
      Date.now() < deadline
    ) {
      if (api.child.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 100));
    }
    api.child.kill('SIGTERM');
    await api.exited;
    expect(problems(api.output())).toEqual([]);
    expect(api.output()).toContain('Nest application successfully started');
  });

  it('refuses a missing auth secret and names it without printing secret values', async () => {
    const env = currentEnv();
    const { code, output } = await boot({ JWT_REFRESH_SECRET: undefined });
    expect(code).toBe(1);
    expect(problems(output)).toEqual(['- JWT_REFRESH_SECRET is required']);
    for (const name of ['JWT_ACCESS_SECRET', 'OTP_HMAC_SECRET'] as const) {
      expect(output).not.toContain(env[name] ?? '<unset>');
    }
  });

  it('refuses identical access and refresh secrets', async () => {
    const same = 'x'.repeat(48);
    const { code, output } = await boot({ JWT_ACCESS_SECRET: same, JWT_REFRESH_SECRET: same });
    expect(code).toBe(1);
    expect(problems(output)).toEqual(['- JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET']);
  });
});
