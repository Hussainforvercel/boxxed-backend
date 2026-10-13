/** DI token for the shared ioredis connection (throttler, OTP, refresh families). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
