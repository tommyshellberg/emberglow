/**
 * Emberglow spacing and radii, ported from the design handoff
 * (.claude/skills/emberglow-design/tokens/spacing.css).
 *
 * Keys follow the CSS --space-N naming (4pt base), which also matches
 * Tailwind's scale: spacing[4] === 16 === `p-4`.
 */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Radii — soft, lantern-like rounding. Cards lg, buttons pill, sheets xl. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;
