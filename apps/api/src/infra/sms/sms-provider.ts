/** DI token for the active SmsProvider (chosen by SMS_PROVIDER). */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * The only way the API sends SMS. The production vendor is an open question (Q-A2); adding it
 * means one class implementing this and one SMS_PROVIDER value.
 */
export interface SmsProvider {
  send(e164: string, text: string): Promise<void>;
}
