import { EmailOtpStrategy, PhoneOtpStrategy } from './otp-strategies';

import type { OtpService } from '../otp/otp.service';

describe('OTP strategies', () => {
  const verify = jest.fn(async () => undefined);
  const otp = { verify } as unknown as OtpService;

  beforeEach(() => verify.mockClear());

  it('email: delegates to OtpService and proves the email', async () => {
    const identity = await new EmailOtpStrategy(otp).verify({
      destination: 'you@example.com',
      code: '123456',
      ip: '203.0.113.1',
    });
    expect(verify).toHaveBeenCalledWith(
      { purpose: 'SIGN_IN', channel: 'EMAIL', destination: 'you@example.com' },
      '123456',
      '203.0.113.1',
    );
    expect(identity).toEqual({
      provider: 'EMAIL_OTP',
      subject: 'you@example.com',
      email: 'you@example.com',
    });
  });

  it('phone: delegates to OtpService and proves the phone', async () => {
    const identity = await new PhoneOtpStrategy(otp).verify({
      destination: '+923001234567',
      code: '123456',
      ip: '203.0.113.1',
    });
    expect(verify).toHaveBeenCalledWith(
      { purpose: 'SIGN_IN', channel: 'PHONE', destination: '+923001234567' },
      '123456',
      '203.0.113.1',
    );
    expect(identity).toEqual({
      provider: 'PHONE_OTP',
      subject: '+923001234567',
      phoneE164: '+923001234567',
    });
  });

  it('propagates OTP errors', async () => {
    verify.mockRejectedValueOnce(new Error('OTP_INVALID'));
    await expect(
      new EmailOtpStrategy(otp).verify({ destination: 'a@b.co', code: '1', ip: 'x' }),
    ).rejects.toThrow('OTP_INVALID');
  });
});
