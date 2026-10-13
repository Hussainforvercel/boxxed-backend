const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

/** Parses `15m` / `30d` (validated by DURATION_PATTERN in env.schema) to seconds. */
export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match?.[1] || !match[2]) throw new Error(`Invalid duration: ${value}`);
  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
}
