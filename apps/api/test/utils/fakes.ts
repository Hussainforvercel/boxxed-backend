import type { MailMessage } from '../../src/infra/mail/mail.service';
import type { SmsProvider } from '../../src/infra/sms/sms-provider';
import type { GoogleIdTokenClaims } from '../../src/modules/auth/strategies/google-id-token.verifier';

const CODE_PATTERN = /\b(\d{6})\b/;

/** Captures mail instead of sending it (replaces MailService). */
export class FakeMail {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  lastCodeFor(to: string): string {
    const message = this.sent.filter((mail) => mail.to === to).at(-1);
    const code = CODE_PATTERN.exec(message?.text ?? '')?.[1];
    if (!code) throw new Error(`no OTP email captured for ${to}`);
    return code;
  }
}

/** Captures SMS instead of sending it (replaces the SMS_PROVIDER). */
export class FakeSms implements SmsProvider {
  readonly sent: { to: string; text: string }[] = [];

  async send(to: string, text: string): Promise<void> {
    this.sent.push({ to, text });
  }

  lastCodeFor(to: string): string {
    const sms = this.sent.filter((message) => message.to === to).at(-1);
    const code = CODE_PATTERN.exec(sms?.text ?? '')?.[1];
    if (!code) throw new Error(`no OTP SMS captured for ${to}`);
    return code;
  }
}

/**
 * Stub for GoogleIdTokenVerifier: a token is valid iff registered here. The real verifier's
 * signature/audience checks are covered by google.strategy.spec.ts.
 */
export class FakeGoogleVerifier {
  private readonly tokens = new Map<string, GoogleIdTokenClaims>();

  register(idToken: string, claims: GoogleIdTokenClaims): void {
    this.tokens.set(idToken, claims);
  }

  async verify(idToken: string): Promise<GoogleIdTokenClaims | null> {
    return this.tokens.get(idToken) ?? null;
  }
}

export interface TestFakes {
  mail: FakeMail;
  sms: FakeSms;
  google: FakeGoogleVerifier;
}

/** Forgets captured messages (call between tests). */
export function clearFakes(fakes: TestFakes): void {
  fakes.mail.sent.length = 0;
  fakes.sms.sent.length = 0;
}

export function createFakes(): TestFakes {
  return { mail: new FakeMail(), sms: new FakeSms(), google: new FakeGoogleVerifier() };
}
