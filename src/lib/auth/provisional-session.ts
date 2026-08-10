import { getItem } from '@/lib/storage';

/**
 * Is a guest (provisional) session on disk?
 *
 * Deliberately its OWN module rather than a member of `@/lib/auth`'s index:
 * that module pulls in the auth store, Sentry, OneSignal, RevenueCat and four
 * zustand stores, and the screens asking this question (login.tsx,
 * first-quest-result.tsx) only need two MMKV reads. Keeping it separate also
 * means a suite that stubs `@/lib/auth` wholesale still runs the REAL check
 * against its own storage fixture, instead of a jest.fn that would agree with
 * whatever the test asserted.
 *
 * ## Why these two keys, and only these two
 *
 * `provisionalUserId` and `provisionalAccessToken` are the two keys that BOTH
 * conversion paths clear (`verifyMagicLink` / `socialSignIn` in
 * `src/api/auth.ts`), so their absence is what "this guest now has a real
 * account" looks like on disk.
 *
 * `provisionalRefreshToken` is NOT part of the check and must never be added:
 * conversion deliberately leaves it behind, so counting it would wall every
 * converted user behind the signup screen forever. That is the drift this
 * helper exists to make impossible — the check used to be spelled out at each
 * call site with a prose comment promising they matched.
 *
 * `provisionalEmail` is also excluded, and that is the deliberate difference
 * from the THREE-key check used by the resolver's onboarding-sync effect
 * (`navigation-state-resolver.ts`) and `profile-hooks.ts`. Those two ask a
 * broader question — "is there any provisional residue at all" — and are
 * intentionally left on their own spelling: migrating them silently changes
 * behaviour on paths this branch never exercised.
 */
export const hasProvisionalSession = (): boolean =>
  !!(getItem('provisionalUserId') || getItem('provisionalAccessToken'));

/**
 * The provisional session a conversion was supposed to SAVE turned out to be
 * dead: the server answered 401 for its refresh token. `endProvisionalSession`
 * has already told the user and armed the wipe, so the conversion is abandoned
 * rather than completed — see `freshProvisionalAccessToken` in `@/api/auth`,
 * which is the only thing that throws this.
 *
 * Lives HERE rather than next to its thrower for the same reason
 * `@/lib/auth/social/errors.ts` exists: the sign-in UIs branch on
 * `instanceof`, and their test suites mock `@/api/auth` wholesale. From this
 * dependency-light module they get the REAL class without loading axios,
 * OneSignal and four stores — so the branch is exercised against the same
 * prototype chain production uses, instead of a hand-written double that would
 * keep passing if the real class ever stopped being constructible.
 */
export class ProvisionalSessionExpired extends Error {
  constructor() {
    super('The provisional session expired before it could be converted');
    this.name = 'ProvisionalSessionExpired';
  }
}

/**
 * The provisional session could not be REFRESHED, and nothing was proven about
 * whether it is still alive: a network flake, a 5xx, a timeout, a malformed
 * refresh body. Thrown by `freshProvisionalAccessToken` in `@/api/auth`.
 *
 * Unlike `ProvisionalSessionExpired` this leaves the session completely
 * untouched — no alert, no wipe — so the two error types must not be handled
 * the same way. The conversion is abandoned rather than attempted, because the
 * only token we could send is one the conversion endpoints (`auth.optional`)
 * silently ignore: they would answer 200 and mint a brand-new account, filing
 * the hero this screen promises to keep under nobody. Retrying is the correct
 * user action, so callers SHOULD show retryable copy — the opposite of the
 * expired case.
 */
export class ProvisionalRefreshUnavailable extends Error {
  constructor() {
    super('The provisional session could not be refreshed');
    this.name = 'ProvisionalRefreshUnavailable';
  }
}
