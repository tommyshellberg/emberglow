/**
 * Thrown by the native social sign-in wrappers (`getGoogleCredential`,
 * `getAppleCredential`) when the user dismisses the provider's sign-in UI
 * instead of completing it. Callers (e.g. the sign-in screen) should catch
 * this specifically to no-op instead of surfacing an error toast.
 */
export class SocialSignInCancelled extends Error {
  constructor() {
    super('Social sign-in was cancelled');
    this.name = 'SocialSignInCancelled';
  }
}

/**
 * The hero the colliding account already owns, exactly as the server sends it
 * — no normalisation on the way in, so the confirmation sheet decides its own
 * copy from the real wire values.
 *
 * Every field is optional because every field is genuinely absent-able. In
 * particular `name` can be the EMPTY STRING: the server reads this off a
 * nullable `character` subdocument with `character?.name || ''` fallbacks
 * (see `resolveSocialUser`), and it creates full accounts with no character
 * at all — so a user who signed up via Google, never picked a hero, and then
 * hits this path arrives here with `name: ''`. Whatever renders this must
 * handle empty-and-present, not just missing.
 */
export type ExistingAccountSummary = {
  name?: string;
  level?: number;
  dailyQuestStreak?: number;
};

/**
 * The verified social identity's email already owns a full account. Nothing
 * has been mutated server-side — re-post the same credential with
 * `confirmExistingAccount: true` to proceed and abandon the provisional hero.
 *
 * Distinguished from the generic 409 (email-in-use) by `details.reason` being
 * exactly 'existing-account-confirmation-required', NOT by status code: both
 * are 409 and the magic-link path already owns that status. Any other reason —
 * or no `details` at all — is re-thrown untranslated, so it keeps reaching the
 * caller's generic error copy.
 */
export class ExistingAccountConfirmationRequired extends Error {
  readonly account: ExistingAccountSummary;

  constructor(account: ExistingAccountSummary) {
    super('Existing account requires confirmation');
    this.name = 'ExistingAccountConfirmationRequired';
    this.account = account;
  }
}
