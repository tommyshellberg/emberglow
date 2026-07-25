/**
 * The server's exact `outcome` literals for `POST /v1/auth/social` (see
 * `resolveSocialUser` in `unquest-server/src/services/social-auth/resolve-user.js`,
 * whose JSDoc enumerates the same five values). Kept in one place so the
 * mobile client can't drift from the server's vocabulary by re-typing a
 * literal by hand at each call site (Task 13's routing switch, this
 * component's `existing-account-login` notice, analytics properties, ...).
 */
export const SOCIAL_SIGNIN_OUTCOMES = {
  /** Branch 1 — known provider identity, ordinary sign-in. */
  LOGIN: 'login',
  /** Branch 2 collision — verified email matched a different, non-provisional
   * account; the user is signed into THAT existing account rather than
   * erroring (deliberate divergence from the magic-link 409 behavior). */
  EXISTING_ACCOUNT_LOGIN: 'existing-account-login',
  /** Branch 2 no-collision — the current provisional user was converted to a
   * full account in place (`_id` preserved). */
  CONVERTED: 'converted',
  /** Branch 3 — verified email auto-linked the provider identity to an
   * existing full (non-provisional) account. */
  LINKED: 'linked',
  /** Branch 4 — brand-new full account created. */
  CREATED: 'created',
} as const;

export type SocialSignInOutcome =
  (typeof SOCIAL_SIGNIN_OUTCOMES)[keyof typeof SOCIAL_SIGNIN_OUTCOMES];
