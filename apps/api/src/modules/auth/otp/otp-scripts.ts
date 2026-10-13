import type Redis from 'ioredis';

/**
 * Atomically: fail if any guard key exists, else fail if any counter is at its limit, else
 * increment every counter (setting its window on first use). Nothing is consumed when a
 * request is rejected, and concurrent requests can't both slip under a limit.
 *
 * KEYS = guard keys…, counter keys…   ARGV[1] = guard count, then (limit, windowMs) per counter
 * Returns {0, 0} when allowed, or {blockingKeyIndex (1-based), remainingMs}.
 */
const CONSUME_LIMITS = `
local guards = tonumber(ARGV[1])
for i = 1, guards do
  local ttl = redis.call('PTTL', KEYS[i])
  if ttl > 0 then return {i, ttl} end
end
for i = guards + 1, #KEYS do
  local count = tonumber(redis.call('GET', KEYS[i]) or '0')
  if count >= tonumber(ARGV[2 * (i - guards)]) then
    return {i, redis.call('PTTL', KEYS[i])}
  end
end
for i = guards + 1, #KEYS do
  if redis.call('INCR', KEYS[i]) == 1 then
    redis.call('PEXPIRE', KEYS[i], ARGV[2 * (i - guards) + 1])
  end
end
return {0, 0}
`;

/** Deletes the challenge only if it still holds this hash (one success per code). 1 = consumed. */
const CONSUME_CHALLENGE = `
if redis.call('HGET', KEYS[1], 'hash') == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return 1
end
return 0
`;

/**
 * Counts a wrong code. At the limit the challenge is deleted and the destination locked.
 * KEYS = challenge, lock   ARGV = maxAttempts, lockSeconds
 * Returns attempts remaining; 0 = now locked; -1 = no challenge.
 */
const RECORD_FAILURE = `
if redis.call('EXISTS', KEYS[1]) == 0 then return -1 end
local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
local max = tonumber(ARGV[1])
if attempts >= max then
  redis.call('DEL', KEYS[1])
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
  return 0
end
return max - attempts
`;

export interface Counter {
  key: string;
  limit: number;
  windowMs: number;
}

export type LimitResult = { allowed: true } | { allowed: false; key: string; retryAfterMs: number };

export async function consumeLimits(
  redis: Redis,
  guards: string[],
  counters: Counter[],
): Promise<LimitResult> {
  const keys = [...guards, ...counters.map((counter) => counter.key)];
  const args = [guards.length, ...counters.flatMap((counter) => [counter.limit, counter.windowMs])];
  const [index, remainingMs] = (await redis.eval(
    CONSUME_LIMITS,
    keys.length,
    ...keys,
    ...args,
  )) as [number, number];
  const key = keys[index - 1];
  if (index === 0 || key === undefined) return { allowed: true };
  return { allowed: false, key, retryAfterMs: remainingMs };
}

export async function consumeChallenge(redis: Redis, key: string, hash: string): Promise<boolean> {
  return (await redis.eval(CONSUME_CHALLENGE, 1, key, hash)) === 1;
}

export async function recordFailure(
  redis: Redis,
  challengeKey: string,
  lockKey: string,
  maxAttempts: number,
  lockSeconds: number,
): Promise<number> {
  return (await redis.eval(
    RECORD_FAILURE,
    2,
    challengeKey,
    lockKey,
    maxAttempts,
    lockSeconds,
  )) as number;
}
