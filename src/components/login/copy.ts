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

/**
 * Spec §4 gives one wording for the start-over link regardless of framing, so
 * — like `EMAIL_SUBTITLE` — it exists once and both entries point at it. Two
 * segments because only the second is accent-coloured; the whole line is the
 * tap target.
 */
const START_NEW_LEAD = 'New here?';
const START_NEW_ACTION = 'Create a hero';

/**
 * Everything about `/login` that changes with how the user arrived — the four
 * strings and the one decision. Named "framing" rather than "copy" because
 * `showStartNewLink` is not a string: it is the same editorial judgement as the
 * strings around it (does THIS framing offer a way to start over?), and keeping
 * it here is what makes that judgement compulsory — see `LOGIN_COPY`.
 *
 * The module, the export `LOGIN_COPY` and the `copy` variable at each render site
 * deliberately keep the older "copy" name: renaming them reaches files outside
 * the ones that needed to change for the flag, and is ticketed separately.
 */
type LoginFraming = {
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
  /**
   * Whether the link out to `/onboarding/welcome` belongs on this framing.
   *
   * Required, and read as `copy.showStartNewLink` rather than compared as
   * `intent === 'signin'` at the render site, because of what happens when a
   * third intent is added: `Record<LoginIntent, LoginFraming>` fails to compile
   * until someone decides, while an inline comparison would silently withhold
   * the link — and this link is a user's only route back to the welcome screen
   * (`welcome.tsx:42` uses `router.replace('/login')`, so there is no back
   * stack).
   */
  showStartNewLink: boolean;
  /** Muted lead-in of the start-over link. */
  startNewLead: string;
  /** Accent-coloured second half, naming what onboarding asks for next. */
  startNewAction: string;
};

export const LOGIN_COPY: Record<LoginIntent, LoginFraming> = {
  signin: {
    chooserTitle: 'Welcome back',
    // Takes (and ignores) the hero name so both intents share one call
    // signature — the caller resolves copy by intent and never branches.
    chooserSubtitle: () => 'Your hero, quest history, and guild are waiting.',
    emailTitle: 'Sign in with email',
    emailSubtitle: EMAIL_SUBTITLE,
    // A returning user who has no account yet is exactly who this is for, and
    // it is the only route back to the welcome screen from here.
    showStartNewLink: true,
    startNewLead: START_NEW_LEAD,
    startNewAction: START_NEW_ACTION,
  },
  convert: {
    chooserTitle: 'Save your progress',
    // `||`, not `??`: this is a "no usable name" check, not a "no name"
    // check. `Character.name` is typed `string` with no non-empty
    // constraint, so `''` is representable, and `''`, `null` and
    // `undefined` all want the same fallback — "Keep  and everything
    // you've earned." is not a sentence. Correct by construction, so it
    // does not rest on which callers can currently produce an empty name.
    chooserSubtitle: (heroName) =>
      `Keep ${heroName || FALLBACK_HERO_NAME} and everything you've earned.`,
    emailTitle: 'Sign up with email',
    emailSubtitle: EMAIL_SUBTITLE,
    // This framing IS "keep what you have". The link leads to a confirmation
    // whose primary action signs the user out, deletes all four provisional keys
    // and resets onboarding, so on a screen headlined "Save your progress" it
    // opens the way to destroying exactly the progress the headline promises to
    // save — and the user arrived here from `quest-completed-signup.tsx`, one tap
    // into the flow it would restart.
    showStartNewLink: false,
    // Carried even though nothing renders it under this framing: the table is
    // exhaustive by type, and the FLAG is what withholds the link — not the
    // absence of words for it. Pointed at the same constants, so flipping the
    // flag on can never surface stale or drifted copy.
    startNewLead: START_NEW_LEAD,
    startNewAction: START_NEW_ACTION,
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
