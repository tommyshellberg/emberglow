/**
 * Pure client-side XP forecasting. The server owns the awarded value; this only
 * drives the on-screen "62 XP · up to 93 if locked" hint and the live "1.18× XP"
 * multiplier. Formula mirrors the server:
 *   finalXP = ceil(baseXP × (multiplier + 0.5 × lockedFraction))
 * where multiplier = 1 + perkBonus and lockedFraction is clamped to [0, 1].
 */

export const forecastPresenceXP = ({
  baseXP,
  multiplier,
}: {
  baseXP: number;
  multiplier: number;
}): { current: number; maxIfLocked: number } => ({
  current: Math.ceil(baseXP * multiplier),
  maxIfLocked: Math.ceil(baseXP * (multiplier + 0.5)),
});

export const liveMultiplier = ({
  multiplier,
  lockedMs,
  totalDurationMs,
}: {
  multiplier: number;
  lockedMs: number;
  totalDurationMs: number;
}): number => {
  const safeTotal = totalDurationMs > 0 ? totalDurationMs : 1;
  const lockedFraction = Math.max(0, Math.min(1, lockedMs / safeTotal));
  return multiplier + 0.5 * lockedFraction;
};
