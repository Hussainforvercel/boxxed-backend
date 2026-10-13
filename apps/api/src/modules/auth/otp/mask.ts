import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { OtpChannel } from './otp.types';

const DOTS = '•••';

/** "you@example.com" → "you@ex•••.com" (docs/09 OtpChallenge). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const lastDot = domain.lastIndexOf('.');
  const name = lastDot > 0 ? domain.slice(0, lastDot) : domain;
  const tld = lastDot > 0 ? domain.slice(lastDot) : '';
  const shownLocal = local.length > 3 ? `${local.slice(0, 3)}${DOTS}` : local;
  return `${shownLocal}@${name.slice(0, 2)}${DOTS}${tld}`;
}

/** "+923001234567" → "+92 300 •••4567". */
export function maskPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return `${DOTS}${e164.slice(-4)}`;
  const national = parsed.nationalNumber;
  return `+${parsed.countryCallingCode} ${national.slice(0, 3)} ${DOTS}${national.slice(-4)}`;
}

export function maskDestination(channel: OtpChannel, destination: string): string {
  return channel === OtpChannel.EMAIL ? maskEmail(destination) : maskPhone(destination);
}
