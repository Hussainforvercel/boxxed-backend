import { ErrorCode } from '@boxxed/shared';

import { AuthService } from './auth.service';
import { DomainError } from '../../common/errors/domain-error';

import type { OtpService } from './otp/otp.service';
import type { GoogleStrategy } from './strategies/google.strategy';
import type { EmailOtpStrategy, PhoneOtpStrategy } from './strategies/otp-strategies';
import type { TokenService } from './tokens/token.service';
import type { User } from '../../generated/prisma/client';
import type { UsersService } from '../users/users.service';

const USER: User = {
  id: 'u1',
  email: 'you@example.com',
  emailVerifiedAt: new Date(),
  phoneE164: null,
  phoneVerifiedAt: null,
  fullName: null,
  role: 'CUSTOMER',
  onboardingStep: 'PROFILE',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};
const EXPIRES = new Date();

function setup(): {
  service: AuthService;
  users: { resolveIdentity: jest.Mock; findById: jest.Mock };
  tokens: Record<string, jest.Mock>;
  email: { verify: jest.Mock };
  phone: { verify: jest.Mock };
} {
  const users = {
    resolveIdentity: jest.fn(async () => ({ user: USER, isNewUser: true })),
    findById: jest.fn(async (): Promise<User | null> => USER),
  };
  const tokens = {
    createSession: jest.fn(async () => ({
      accessToken: 'a',
      accessTokenExpiresAt: EXPIRES,
      refreshToken: 'r',
    })),
    rotate: jest.fn(async () => ({ userId: 'u1', refreshToken: 'r2' })),
    signAccess: jest.fn(async () => ({ accessToken: 'a2', accessTokenExpiresAt: EXPIRES })),
    revoke: jest.fn(async () => undefined),
    revokeAllForUser: jest.fn(async () => undefined),
  };
  const email = { verify: jest.fn(async () => ({ provider: 'EMAIL_OTP', subject: 'e' })) };
  const phone = { verify: jest.fn(async () => ({ provider: 'PHONE_OTP', subject: 'p' })) };
  const service = new AuthService(
    {} as OtpService,
    tokens as unknown as TokenService,
    users as unknown as UsersService,
    email as unknown as EmailOtpStrategy,
    phone as unknown as PhoneOtpStrategy,
    {} as GoogleStrategy,
  );
  return { service, users, tokens, email, phone };
}

describe('AuthService', () => {
  it('verifyOtp picks the strategy by channel and signs in', async () => {
    const { service, email, phone, users } = setup();
    const payload = await service.verifyOtp(
      { channel: 'PHONE', destination: '+923001234567' },
      '123456',
      '1.2.3.4',
    );
    expect(phone.verify).toHaveBeenCalledWith({
      destination: '+923001234567',
      code: '123456',
      ip: '1.2.3.4',
    });
    expect(email.verify).not.toHaveBeenCalled();
    expect(users.resolveIdentity).toHaveBeenCalledWith({ provider: 'PHONE_OTP', subject: 'p' });
    expect(payload).toMatchObject({ accessToken: 'a', refreshToken: 'r', isNewUser: true });
    expect(payload.user).toMatchObject({ id: 'u1', emailVerified: true, phoneVerified: false });
  });

  it('refreshSession signs a fresh access token from the current user', async () => {
    const { service, tokens } = setup();
    const payload = await service.refreshSession('r');
    expect(tokens.signAccess).toHaveBeenCalledWith(USER);
    expect(payload).toMatchObject({ accessToken: 'a2', refreshToken: 'r2', isNewUser: false });
  });

  it('refreshSession for a deleted user revokes everything and fails', async () => {
    const { service, users, tokens } = setup();
    users.findById.mockResolvedValueOnce(null);
    const error = await service.refreshSession('r').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(ErrorCode.REFRESH_INVALID);
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('signOut always resolves true and only revokes for the caller', async () => {
    const { service, tokens } = setup();
    await expect(service.signOut('r', 'u1')).resolves.toBe(true);
    expect(tokens.revoke).toHaveBeenCalledWith('r', 'u1');
  });
});
