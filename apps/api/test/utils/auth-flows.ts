import { gql } from './graphql';
import { normalizeEmail, normalizePhone } from '../../src/common/validation/transforms';

import type { TestFakes } from './fakes';
import type { GqlOptions, GraphQLResponseBody } from './graphql';
import type { INestApplication } from '@nestjs/common';

export const USER_FIELDS = `
  id email emailVerified phoneE164 phoneVerified fullName role onboardingStep
  consents { kind granted version }
`;
export const AUTH_PAYLOAD = `accessToken accessTokenExpiresAt refreshToken isNewUser user { ${USER_FIELDS} }`;

export const REQUEST_OTP = `mutation ($input: RequestOtpInput!) {
  requestOtp(input: $input) { channel maskedDestination expiresAt resendAvailableAt codeLength }
}`;
export const VERIFY_OTP = `mutation ($input: VerifyOtpInput!) { verifyOtp(input: $input) { ${AUTH_PAYLOAD} } }`;
export const SIGN_IN_WITH_GOOGLE = `mutation ($input: SignInWithGoogleInput!) {
  signInWithGoogle(input: $input) { ${AUTH_PAYLOAD} }
}`;
export const REFRESH_SESSION = `mutation ($input: RefreshSessionInput!) {
  refreshSession(input: $input) { ${AUTH_PAYLOAD} }
}`;
export const SIGN_OUT = `mutation ($input: SignOutInput!) { signOut(input: $input) }`;
export const ME = `{ me { ${USER_FIELDS} } }`;
export const UPDATE_PROFILE = `mutation ($input: UpdateProfileInput!) {
  updateProfile(input: $input) { ${USER_FIELDS} }
}`;
export const LEGAL_DOCUMENTS = `{ legalDocuments { kind version url } }`;
export const ACCEPT_CONSENTS = `mutation ($input: AcceptConsentsInput!) {
  acceptConsents(input: $input) { ${USER_FIELDS} }
}`;

export interface UserResult {
  id: string;
  email: string | null;
  emailVerified: boolean;
  phoneE164: string | null;
  phoneVerified: boolean;
  fullName: string | null;
  role: string;
  onboardingStep: 'PROFILE' | 'CONSENT' | 'COMPLETE';
  consents: { kind: string; granted: boolean; version: string }[];
}

export interface AuthPayloadResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  isNewUser: boolean;
  user: UserResult;
}

type Channel = 'EMAIL' | 'PHONE';

/** requestOtp → capture the delivered code → verifyOtp. Fails the test on any error. */
export async function signInWithOtp(
  app: INestApplication,
  fakes: TestFakes,
  channel: Channel,
  destination: string,
  options: GqlOptions = {},
): Promise<AuthPayloadResult> {
  const requested = await gql(app, REQUEST_OTP, {
    ...options,
    variables: { input: { channel, destination } },
  });
  expectNoErrors(requested);
  // Delivery goes to the normalized destination, whatever the client typed.
  const code =
    channel === 'EMAIL'
      ? fakes.mail.lastCodeFor(normalizeEmail(destination))
      : fakes.sms.lastCodeFor(normalizePhone(destination));
  const verified = await gql<{ verifyOtp: AuthPayloadResult }>(app, VERIFY_OTP, {
    ...options,
    variables: { input: { channel, destination, code } },
  });
  expectNoErrors(verified);
  return (verified.data as { verifyOtp: AuthPayloadResult }).verifyOtp;
}

export function expectNoErrors(body: GraphQLResponseBody<unknown>): void {
  if (body.errors) throw new Error(`unexpected GraphQL errors: ${JSON.stringify(body.errors)}`);
}
