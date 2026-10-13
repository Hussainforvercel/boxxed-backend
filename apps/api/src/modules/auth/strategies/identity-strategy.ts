import type { AuthProvider } from '../../../generated/prisma/enums';

/** A proven identity. `subject` is unique per provider (docs/06 §5). */
export interface VerifiedIdentity {
  provider: AuthProvider;
  subject: string;
  /** Normalized; present only when the provider proved ownership. */
  email?: string;
  phoneE164?: string;
}

/**
 * One class per sign-in provider. Adding one (e.g. Apple, DEC-2) = a new AuthProvider value, a
 * new strategy and one mutation; AuthService and TokenService don't change.
 */
export interface IdentityStrategy<TInput> {
  readonly provider: AuthProvider;
  verify(input: TInput): Promise<VerifiedIdentity>;
}
