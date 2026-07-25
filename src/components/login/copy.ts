/**
 * Copy for `/login`, keyed by how the user arrived (`LoginIntent`).
 *
 * The screen is the same either way — social options, an "or" divider, and an
 * email path — only the framing changes. Keeping both variants side by side
 * here (rather than inline ternaries at each render site) makes the pairs
 * reviewable as pairs, and keeps the two intents from drifting apart.
 *
 * This module is deliberately free of store access: the caller passes the
 * hero name in, so the table stays a pure function of its inputs.
 */
import type { LoginIntent } from './types';

/**
 * Shown instead of the hero's name when the character store has none —
 * `character` is `null` until onboarding creates one.
 */
const FALLBACK_HERO_NAME = 'your hero';

/**
 * Identical for both intents in the spec, so it exists once. A second
 * hand-typed copy is how the two would drift.
 */
const EMAIL_SUBTITLE =
  "We'll send a sign-in link to your email. No password needed.";

type LoginCopy = {
  /** Chooser (social-first) step heading. */
  chooserTitle: string;
  /**
   * Chooser subheading. A function rather than a template so the
   * missing-hero fallback lives with the string that needs it instead of
   * being re-implemented at every call site. Callers can pass
   * `character?.name` straight through, including when it is `null`.
   */
  chooserSubtitle: (heroName?: string | null) => string;
  /** Email step heading. */
  emailTitle: string;
  /** Email step subheading. */
  emailSubtitle: string;
};

export const LOGIN_COPY: Record<LoginIntent, LoginCopy> = {
  signin: {
    chooserTitle: 'Welcome back',
    // Takes (and ignores) the hero name so both intents share one call
    // signature — the caller resolves copy by intent and never branches.
    chooserSubtitle: () => 'Your hero, quest history, and guild are waiting.',
    emailTitle: 'Sign in with email',
    emailSubtitle: EMAIL_SUBTITLE,
  },
  convert: {
    chooserTitle: 'Save your progress',
    // `||`, not `??`: a character with an empty-string name is reachable,
    // and "Keep  and everything you've earned." is not a sentence.
    chooserSubtitle: (heroName) =>
      `Keep ${heroName || FALLBACK_HERO_NAME} and everything you've earned.`,
    emailTitle: 'Sign up with email',
    emailSubtitle: EMAIL_SUBTITLE,
  },
};

/**
 * Applied when no intent is supplied, or the supplied one is unusable —
 * shared with `LoginForm`'s prop default so "no framing given" resolves the
 * same way whether it arrives as a URL param or as an omitted prop.
 */
export const DEFAULT_LOGIN_INTENT: LoginIntent = 'signin';

/**
 * Narrows an unvalidated value (a `useLocalSearchParams` entry is
 * `string | string[] | undefined`) to an intent the copy table can be keyed
 * with. Anything else — an unknown string, a repeated param's array, a
 * missing param — takes the default framing.
 *
 * Membership is tested against `LOGIN_COPY`'s own keys so a new intent is
 * parseable the moment it has copy, with `hasOwnProperty` rather than `in`:
 * `'toString' in LOGIN_COPY` is true, and indexing the table with it would
 * hand the caller `Object.prototype.toString` in place of copy.
 */
export function parseLoginIntent(value: unknown): LoginIntent {
  return typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(LOGIN_COPY, value)
    ? (value as LoginIntent)
    : DEFAULT_LOGIN_INTENT;
}
