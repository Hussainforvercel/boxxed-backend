import type { OtpChannel, OtpTarget } from './otp.types';

/** Redis keys for OTP state. Everything lives under `otp:` (docs/12 §Redis). */
export const otpKeys = {
  challenge: ({ purpose, channel, destination }: OtpTarget): string =>
    `otp:${purpose}:${channel}:${destination}`,
  lock: (channel: OtpChannel, destination: string): string => `otp:lock:${channel}:${destination}`,
  cooldown: (channel: OtpChannel, destination: string): string =>
    `otp:cooldown:${channel}:${destination}`,
  destinationHour: (channel: OtpChannel, destination: string): string =>
    `otp:rl:dest:h:${channel}:${destination}`,
  destinationDay: (channel: OtpChannel, destination: string): string =>
    `otp:rl:dest:d:${channel}:${destination}`,
  ipSendHour: (ip: string): string => `otp:rl:ip:send:${ip}`,
  ipVerifyHour: (ip: string): string => `otp:rl:ip:verify:${ip}`,
  /** Global SMS circuit breaker, per UTC day. */
  smsDay: (now: Date): string => `otp:rl:sms:${now.toISOString().slice(0, 10)}`,
};
