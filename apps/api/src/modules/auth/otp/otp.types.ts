/** Delivery channel of a one-time code. Also the GraphQL `OtpChannel` enum. */
export const OtpChannel = { EMAIL: 'EMAIL', PHONE: 'PHONE' } as const;
export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

/** Why a code was issued. Phase 2 adds LINK_PHONE (DEC-3); keys are separate per purpose. */
export type OtpPurpose = 'SIGN_IN';

export interface OtpTarget {
  purpose: OtpPurpose;
  channel: OtpChannel;
  /** Normalized: lowercased email or E.164 phone. */
  destination: string;
}

export interface OtpChallengeIssued {
  channel: OtpChannel;
  maskedDestination: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  codeLength: number;
}
