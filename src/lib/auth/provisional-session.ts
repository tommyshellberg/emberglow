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
