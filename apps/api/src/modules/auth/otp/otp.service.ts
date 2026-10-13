import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import Redis from 'ioredis';

import { ErrorCode, OTP_LENGTH } from '@boxxed/shared';

import { maskDestination } from './mask';
import { otpKeys } from './otp-keys';
import { otpEmail, otpSmsText } from './otp-messages';
import { consumeChallenge, consumeLimits, recordFailure } from './otp-scripts';
import { OtpChannel } from './otp.types';
import { DomainError } from '../../../common/errors/domain-error';
import { AppConfig } from '../../../config/app-config.service';
import { MailService } from '../../../infra/mail/mail.service';
import { REDIS_CLIENT } from '../../../infra/redis/redis.constants';
import { SMS_PROVIDER } from '../../../infra/sms/sms-provider';

import type { Counter } from './otp-scripts';
import type { OtpChallengeIssued, OtpTarget } from './otp.types';
import type { SmsProvider } from '../../../infra/sms/sms-provider';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Send/verify limits from docs/06 §5 (on top of the generic throttler). */
export const OTP_LIMITS = {
  destinationPerHour: 5,
  destinationPerDay: 10,
  ipSendsPerHour: 10,
  ipVerifiesPerHour: 30,
} as const;

const RATE_LIMITED_MESSAGE = 'Too many attempts. Try again later.';

/**
 * One-time codes for email and phone (docs/06 §5). Only HMAC(secret, target + code) is stored,
 * with a TTL; the plain code exists only in memory long enough to deliver it. No user lookup
 * happens here, so the response never depends on whether an account exists.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {}

  async request(target: OtpTarget, ip: string): Promise<OtpChallengeIssued> {
    const { channel, destination } = target;
    const otp = this.config.otp;
    await this.enforceSendLimits(target, ip);

    const testCode = otp.testCode && otp.testDestinations.has(destination) ? otp.testCode : null;
    const code =
      testCode ??
      randomInt(0, 10 ** OTP_LENGTH)
        .toString()
        .padStart(OTP_LENGTH, '0');
    const key = otpKeys.challenge(target);
    // A new code replaces the previous one and resets its attempt count.
    await this.redis
      .multi()
      .del(key)
      .hset(key, { hash: this.hash(target, code), attempts: 0 })
      .expire(key, otp.ttlSeconds)
      .exec();

    if (!testCode) {
      try {
        await this.deliver(target, code);
      } catch (error) {
        // Let the user retry right away; the send still counts against the limits.
        await this.redis.del(key, otpKeys.cooldown(channel, destination));
        throw error;
      }
    }

    const now = Date.now();
    return {
      channel,
      maskedDestination: maskDestination(channel, destination),
      expiresAt: new Date(now + otp.ttlSeconds * 1000),
      resendAvailableAt: new Date(now + otp.resendSeconds * 1000),
      codeLength: OTP_LENGTH,
    };
  }

  /** Resolves when the code is right (and consumes it); throws an OTP_* DomainError otherwise. */
  async verify(target: OtpTarget, code: string, ip: string): Promise<void> {
    const { channel, destination } = target;
    const { maxAttempts, lockSeconds } = this.config.otp;
    const lockKey = otpKeys.lock(channel, destination);
    const verifyLimit = await consumeLimits(
      this.redis,
      [lockKey],
      [{ key: otpKeys.ipVerifyHour(ip), limit: OTP_LIMITS.ipVerifiesPerHour, windowMs: HOUR_MS }],
    );
    if (!verifyLimit.allowed) {
      const retryAfterSeconds = toSeconds(verifyLimit.retryAfterMs);
      if (verifyLimit.key === lockKey) throw attemptsExceeded(retryAfterSeconds);
      throw new DomainError(ErrorCode.RATE_LIMITED, RATE_LIMITED_MESSAGE, { retryAfterSeconds });
    }

    const key = otpKeys.challenge(target);
    const stored = await this.redis.hget(key, 'hash');
    if (!stored) throw expired();

    const submitted = this.hash(target, code);
    if (timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(submitted, 'hex'))) {
      if (await consumeChallenge(this.redis, key, submitted)) return;
      throw expired(); // replaced or used concurrently
    }

    const remaining = await recordFailure(this.redis, key, lockKey, maxAttempts, lockSeconds);
    if (remaining < 0) throw expired();
    if (remaining === 0) throw attemptsExceeded(lockSeconds);
    throw new DomainError(ErrorCode.OTP_INVALID, 'That code is not right.', {
      attemptsRemaining: remaining,
    });
  }

  private async enforceSendLimits({ channel, destination }: OtpTarget, ip: string): Promise<void> {
    const now = new Date();
    const counters: Counter[] = [
      {
        key: otpKeys.cooldown(channel, destination),
        limit: 1,
        windowMs: this.config.otp.resendSeconds * 1000,
      },
      {
        key: otpKeys.destinationHour(channel, destination),
        limit: OTP_LIMITS.destinationPerHour,
        windowMs: HOUR_MS,
      },
      {
        key: otpKeys.destinationDay(channel, destination),
        limit: OTP_LIMITS.destinationPerDay,
        windowMs: DAY_MS,
      },
      { key: otpKeys.ipSendHour(ip), limit: OTP_LIMITS.ipSendsPerHour, windowMs: HOUR_MS },
    ];
    const smsDayKey = otpKeys.smsDay(now);
    if (channel === OtpChannel.PHONE) {
      counters.push({
        key: smsDayKey,
        limit: this.config.smsDailyCap,
        windowMs: msToUtcMidnight(now),
      });
    }

    // A locked destination is reported as RATE_LIMITED here: requestOtp's contract (docs/09).
    const result = await consumeLimits(this.redis, [otpKeys.lock(channel, destination)], counters);
    if (result.allowed) return;
    if (result.key === smsDayKey) this.alertSmsCap();
    throw new DomainError(ErrorCode.RATE_LIMITED, RATE_LIMITED_MESSAGE, {
      retryAfterSeconds: toSeconds(result.retryAfterMs),
    });
  }

  private async deliver({ channel, destination }: OtpTarget, code: string): Promise<void> {
    const ttlMinutes = Math.round(this.config.otp.ttlSeconds / 60);
    if (channel === OtpChannel.EMAIL) {
      await this.mail.send(otpEmail(destination, code, ttlMinutes));
    } else {
      await this.sms.send(destination, otpSmsText(code, ttlMinutes));
    }
  }

  /** Bound to purpose, channel and destination, so a hash is useless for any other target. */
  private hash({ purpose, channel, destination }: OtpTarget, code: string): string {
    return createHmac('sha256', this.config.otp.hmacSecret)
      .update(`${purpose}:${channel}:${destination}:${code}`)
      .digest('hex');
  }

  private alertSmsCap(): void {
    this.logger.error({ msg: 'SMS daily cap reached; phone OTP is refused until UTC midnight' });
    Sentry.captureMessage('SMS daily cap reached', 'error');
  }
}

function toSeconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

function msToUtcMidnight(now: Date): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1000, midnight - now.getTime());
}

function expired(): DomainError {
  return new DomainError(ErrorCode.OTP_EXPIRED, 'This code has expired. Request a new one.');
}

function attemptsExceeded(retryAfterSeconds: number): DomainError {
  return new DomainError(ErrorCode.OTP_ATTEMPTS_EXCEEDED, RATE_LIMITED_MESSAGE, {
    retryAfterSeconds,
  });
}
