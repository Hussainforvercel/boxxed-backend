import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Trims strings; leaves anything else for the validators to reject. */
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Parses any international format ("+92 300 123-4567") to E.164, so one number can't be
 * counted as many by the per-destination limits. Returns the input unchanged when it can't
 * be parsed; @IsPhoneE164 then rejects it.
 */
export function normalizePhone(value: string): string {
  return parsePhoneNumberFromString(value.trim())?.number ?? value;
}
