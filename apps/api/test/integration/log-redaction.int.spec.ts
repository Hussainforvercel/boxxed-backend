import { Client } from 'pg';

import { buildApi, currentEnv, freePort, startApi, waitUntilReady } from '../utils/built-api';

import type { RunningApi } from '../utils/built-api';

// Runs the real built API (pino JSON logs to stdout, LOG_LEVEL=trace) through the email,
// phone, Google, refresh and sign-out flows, then scans everything it printed: no OTP code,
// token, email or phone may appear (docs/06 §9, Phase 1A acceptance criterion).
const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';
const EMAIL = `log-redaction-${Date.now()}@example.com`;
const PHONE = '+923001239876'; // on the OTP test allow-list: fixed code, no SMS
const PHONE_CODE = '739154';
const GOOGLE_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.not-a-real-google-signature';

interface Mail {
  ID: string;
}

async function emailedCode(to: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: Mail[] };
    const latest = messages[0];
    if (latest) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${latest.ID}`)).json()) as {
        Text: string;
      };
      const code = /\b(\d{6})\b/.exec(message.Text)?.[1];
      if (code) return code;
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`no email reached Mailpit for ${to}`);
}

async function deleteMail(to: string): Promise<void> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const { messages } = (await search.json()) as { messages: Mail[] };
  if (messages.length === 0) return;
  await fetch(`${MAILPIT}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ IDs: messages.map((message) => message.ID) }),
  });
}

describe('no secrets or contact details in the logs (built API process)', () => {
  let api: RunningApi;
  let baseUrl: string;
  const secrets: string[] = [EMAIL, PHONE, PHONE.slice(3), PHONE_CODE, GOOGLE_TOKEN];

  async function call(
    query: string,
    variables: object,
    token?: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return (await response.json()) as Record<string, unknown>;
  }

  beforeAll(async () => {
    buildApi();
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    api = startApi({
      ...currentEnv(),
      PORT: String(port),
      LOG_LEVEL: 'trace',
      OTP_TEST_DESTINATIONS: PHONE,
      OTP_TEST_CODE: PHONE_CODE,
    });
    await waitUntilReady(baseUrl, api);
  }, 120_000);

  afterAll(async () => {
    if (api.child.exitCode === null) api.child.kill('SIGTERM');
    await api.exited;
    await deleteMail(EMAIL).catch(() => undefined);
    const db = new Client({ connectionString: process.env['DATABASE_URL'] });
    await db.connect();
    await db.query('DELETE FROM "User" WHERE email = $1 OR "phoneE164" = $2', [EMAIL, PHONE]);
    await db.end();
  });

  it('runs every auth flow without leaking codes, tokens, emails or phones', async () => {
    const request = 'mutation ($input: RequestOtpInput!) { requestOtp(input: $input) { channel } }';
    const verify = `mutation ($input: VerifyOtpInput!) {
      verifyOtp(input: $input) { accessToken refreshToken user { id } } }`;
    const refresh = `mutation ($input: RefreshSessionInput!) {
      refreshSession(input: $input) { accessToken refreshToken } }`;

    // Email: a real random code delivered through SMTP (Mailpit); one wrong try first.
    await call(request, { input: { channel: 'EMAIL', destination: EMAIL } });
    const emailCode = await emailedCode(EMAIL);
    secrets.push(emailCode);
    await call(verify, {
      input: {
        channel: 'EMAIL',
        destination: EMAIL,
        code: emailCode === '000000' ? '111111' : '000000',
      },
    });
    const signedIn = (await call(verify, {
      input: { channel: 'EMAIL', destination: EMAIL, code: emailCode },
    })) as { data: { verifyOtp: { accessToken: string; refreshToken: string } } };
    const { accessToken, refreshToken } = signedIn.data.verifyOtp;
    secrets.push(accessToken, refreshToken);

    await call('{ me { id email } }', {}, accessToken);
    const rotated = (await call(refresh, { input: { refreshToken } })) as {
      data: { refreshSession: { accessToken: string; refreshToken: string } };
    };
    secrets.push(rotated.data.refreshSession.accessToken, rotated.data.refreshSession.refreshToken);
    await call(refresh, { input: { refreshToken } }); // reuse → security event is logged

    // Phone (allow-listed test destination) and a rejected Google token.
    await call(request, { input: { channel: 'PHONE', destination: PHONE } });
    const phone = (await call(verify, {
      input: { channel: 'PHONE', destination: PHONE, code: PHONE_CODE },
    })) as { data: { verifyOtp: { accessToken: string; refreshToken: string } } };
    secrets.push(phone.data.verifyOtp.accessToken, phone.data.verifyOtp.refreshToken);
    await call(
      'mutation ($input: SignInWithGoogleInput!) { signInWithGoogle(input: $input) { accessToken } }',
      { input: { idToken: GOOGLE_TOKEN } },
    );
    await call(
      'mutation ($input: SignOutInput!) { signOut(input: $input) }',
      { input: { refreshToken: phone.data.verifyOtp.refreshToken } },
      phone.data.verifyOtp.accessToken,
    );

    api.child.kill('SIGTERM');
    await api.exited;
    const output = api.output();

    // The logs were really captured…
    expect(output).toContain('"msg":"graphql operation"');
    expect(output).toContain('refresh token reuse detected');
    expect(output).toContain('OTP_INVALID');
    // …and hold none of the secrets or contact details.
    for (const secret of secrets) {
      expect({ secret, found: output.includes(secret) }).toEqual({ secret, found: false });
    }
  });
});
