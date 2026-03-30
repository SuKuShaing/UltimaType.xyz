export const MATCH_TIMEOUT_MS = 300_000; // 5 minutos
export const DISCONNECT_GRACE_PERIOD_MS = 30_000; // 30 segundos

// 0 = "Hasta terminar el texto" (usa MATCH_TIMEOUT_MS como safety net)
export const TIME_LIMIT_OPTIONS = [0, 30_000, 60_000, 120_000, 180_000, 240_000, 300_000] as const;

export type TimeLimitOption = (typeof TIME_LIMIT_OPTIONS)[number];

export function isValidTimeLimit(value: number): value is TimeLimitOption {
  return (TIME_LIMIT_OPTIONS as readonly number[]).includes(value);
}
