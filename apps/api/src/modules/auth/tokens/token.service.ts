import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import { ErrorCode } from '@boxxed/shared';

import { rotateFamily } from './token-scripts';
import { DomainError } from '../../../common/errors/domain-error';
import { AppConfig } from '../../../config/app-config.service';
import { REDIS_CLIENT } from '../../../infra/redis/redis.constants';

import type {
  AccessClaims,
  AccessToken,
  RefreshClaims,
  SessionTokens,
  TokenSubject,
} from './token.types';

const ALGORITHM = 'HS256';
/** Clock skew tolerated between API processes and devices (docs/06 §4). */
export const CLOCK_TOLERANCE_SECONDS = 30;

const familyKey = (familyId: string): string => `rt:fam:${familyId}`;
const userFamiliesKey = (userId: string): string => `rt:user:${userId}`;

/**
 * Access + refresh JWTs with separate secrets. Refresh tokens belong to a family stored in
 * Redis; each use rotates the family's current jti, and presenting any older jti (reuse, i.e.
 * a stolen token) deletes the whole family (docs/06 §5). Redis must be `noeviction`.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfig,
  ) {}

  /** Starts a new session (a new refresh family). Other sessions are untouched (Q-A7). */
  async createSession(subject: TokenSubject): Promise<SessionTokens> {
    const familyId = randomUUID();
    const jti = randomUUID();
    const ttl = this.config.jwt.refreshTtlSeconds;
    await this.redis
      .multi()
      .hset(familyKey(familyId), {
        userId: subject.id,
        currentJti: jti,
        createdAt: new Date().toISOString(),
      })
      .expire(familyKey(familyId), ttl)
      .sadd(userFamiliesKey(subject.id), familyId)
      .expire(userFamiliesKey(subject.id), ttl)
      .exec();
    const refreshToken = await this.signRefresh({ sub: subject.id, fid: familyId, jti });
    return { ...(await this.signAccess(subject)), refreshToken };
  }

  /**
   * Rotates a refresh token. Returns the user id and the family's new refresh token; the caller
   * signs a fresh access token from current user data. Throws REFRESH_INVALID otherwise.
   */
  async rotate(refreshToken: string): Promise<{ userId: string; refreshToken: string }> {
    const claims = await this.verifyRefresh(refreshToken);
    if (!claims) throw refreshInvalid();

    const newJti = randomUUID();
    const ttl = this.config.jwt.refreshTtlSeconds;
    const outcome = await rotateFamily(
      this.redis,
      familyKey(claims.fid),
      claims.jti,
      newJti,
      ttl,
      claims.sub,
    );
    if (outcome === 'reused') {
      await this.redis.srem(userFamiliesKey(claims.sub), claims.fid);
      this.logger.warn({
        msg: 'refresh token reuse detected; family revoked',
        event: 'auth.refresh_reuse',
        userId: claims.sub,
        familyId: claims.fid,
      });
    }
    if (outcome !== 'rotated') throw refreshInvalid();

    await this.redis.expire(userFamiliesKey(claims.sub), ttl);
    return {
      userId: claims.sub,
      refreshToken: await this.signRefresh({ sub: claims.sub, fid: claims.fid, jti: newJti }),
    };
  }

  /** Revokes the token's family if it verifies and belongs to `userId`; silent otherwise. */
  async revoke(refreshToken: string, userId: string): Promise<void> {
    const claims = await this.verifyRefresh(refreshToken);
    if (!claims || claims.sub !== userId) return;
    await this.redis
      .multi()
      .del(familyKey(claims.fid))
      .srem(userFamiliesKey(userId), claims.fid)
      .exec();
  }

  /** Signs the user out everywhere (account-level events, e.g. deletion in Phase 7). */
  async revokeAllForUser(userId: string): Promise<void> {
    const families = await this.redis.smembers(userFamiliesKey(userId));
    await this.redis.del(...families.map(familyKey), userFamiliesKey(userId));
  }

  async signAccess(subject: TokenSubject): Promise<AccessToken> {
    const { accessSecret, accessTtlSeconds, issuer, audience } = this.config.jwt;
    const claims: AccessClaims = {
      sub: subject.id,
      role: subject.role,
      onb: subject.onboardingStep,
    };
    const accessToken = await this.jwt.signAsync(claims, {
      secret: accessSecret,
      expiresIn: accessTtlSeconds,
      issuer,
      audience,
      algorithm: ALGORITHM,
    });
    return { accessToken, accessTokenExpiresAt: new Date(Date.now() + accessTtlSeconds * 1000) };
  }

  /** Verifies an access token (signature, exp, iss, aud). Null when invalid for any reason. */
  async verifyAccess(token: string): Promise<AccessClaims | null> {
    const { accessSecret, issuer, audience } = this.config.jwt;
    try {
      return await this.jwt.verifyAsync<AccessClaims & object>(token, {
        secret: accessSecret,
        issuer,
        audience,
        algorithms: [ALGORITHM],
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
    } catch {
      return null;
    }
  }

  private async signRefresh(claims: RefreshClaims): Promise<string> {
    const { refreshSecret, refreshTtlSeconds, issuer, audience } = this.config.jwt;
    return this.jwt.signAsync(claims, {
      secret: refreshSecret,
      expiresIn: refreshTtlSeconds,
      issuer,
      audience,
      algorithm: ALGORITHM,
    });
  }

  private async verifyRefresh(token: string): Promise<RefreshClaims | null> {
    const { refreshSecret, issuer, audience } = this.config.jwt;
    try {
      const claims = await this.jwt.verifyAsync<RefreshClaims & object>(token, {
        secret: refreshSecret,
        issuer,
        audience,
        algorithms: [ALGORITHM],
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      const valid = [claims.sub, claims.fid, claims.jti].every((part) => typeof part === 'string');
      return valid ? claims : null;
    } catch {
      return null;
    }
  }
}

function refreshInvalid(): DomainError {
  return new DomainError(ErrorCode.REFRESH_INVALID, 'Your session has ended. Sign in again.');
}
