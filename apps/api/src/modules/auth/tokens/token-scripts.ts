import type Redis from 'ioredis';

/**
 * Compare-and-set rotation of a refresh family.
 * KEYS = family   ARGV = presented jti, new jti, ttl seconds, user id
 * Returns 1 = rotated, 0 = no such family (revoked/expired/other user), -1 = reuse (deleted).
 */
const ROTATE = `
local current = redis.call('HGET', KEYS[1], 'currentJti')
if not current then return 0 end
if redis.call('HGET', KEYS[1], 'userId') ~= ARGV[4] then return 0 end
if current ~= ARGV[1] then
  redis.call('DEL', KEYS[1])
  return -1
end
redis.call('HSET', KEYS[1], 'currentJti', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1
`;

export type RotateOutcome = 'rotated' | 'missing' | 'reused';

export async function rotateFamily(
  redis: Redis,
  familyKey: string,
  presentedJti: string,
  newJti: string,
  ttlSeconds: number,
  userId: string,
): Promise<RotateOutcome> {
  const result = (await redis.eval(
    ROTATE,
    1,
    familyKey,
    presentedJti,
    newJti,
    ttlSeconds,
    userId,
  )) as number;
  return result === 1 ? 'rotated' : result === -1 ? 'reused' : 'missing';
}
