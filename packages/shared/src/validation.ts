/**
 * Validation limits shared by class-validator DTOs (API, source of truth) and
 * react-hook-form rules (mobile). docs/05-mobile-architecture.md §5.
 */
export const OTP_LENGTH = 6;

export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 80;

/** Pragmatic client-side check; the server's @IsEmail() is authoritative. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
