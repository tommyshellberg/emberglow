import { type NavigationTarget } from '@/lib/navigation/navigation-state-resolver';

/**
 * The root segments of the screens the resolver can send you to.
 *
 * A Record rather than a Set so the compiler enforces membership both ways:
 * adding a case to NavigationTarget breaks this object until someone decides
 * whether the gate owns that screen. A Set would accept the omission silently,
 * and the symptom — a user stranded on a screen nothing evicts them from — is
 * the kind that only shows up on a device.
 *
 * Deliberately excluded: 'quest-result' lives at /(app)/quest/[id], inside the
 * app group, so it is never a root segment; 'app' and 'loading' are not screens.
 */
type ResolverOwnedSegment = Exclude<
  NavigationTarget['type'],
  'app' | 'loading' | 'quest-result'
>;

const RESOLVER_OWNED_SEGMENTS: Record<ResolverOwnedSegment, true> = {
  login: true,
  onboarding: true,
  'pending-quest': true,
  'cooperative-pending-quest': true,
  'active-quest': true,
  'quest-completed-signup': true,
  'streak-celebration': true,
  'first-quest-result': true,
  'no-hero': true,
};

/**
 * The screens a user without a full account may move between under their own
 * steam: the onboarding funnel, `/login`, and the post-first-quest signup
 * prompt.
 *
 * The resolver names exactly one of these at a time, because it derives a
 * destination from stores and store state cannot express "the user just tapped
 * 'Have an account? Log in'". Holding it to that single answer is what made
 * three links inert: the tap navigated, the gate re-ran, the resolver still
 * named the screen the user had just left, and the gate replaced them back onto
 * it fast enough to look like a dead button. Every one of `welcome.tsx`'s login
 * link, `login-form.tsx`'s "Create a hero" link and
 * `quest-completed-signup.tsx`'s "Create account" button hit this.
 *
 * So for these three the resolver's answer is read as a default rather than a
 * mandate. That is safe precisely here and nowhere else: every branch that can
 * name one of these screens is a LATE one (Priorities 3-5), reached only once
 * streak celebration, pending quests and quest results have all declined to
 * claim the user. Those higher-priority screens stay strictly matched below —
 * they are consequences of state the user cannot opt out of, and a running
 * quest must still evict someone sitting on `/login`.
 *
 * `quest-completed-signup` now has TWO of those branches, which the original
 * "Priority 3-4" phrasing did not contemplate: the onboarding one (Priority 3,
 * step VIEWING_SIGNUP_PROMPT) and the provisional-conversion gate (Priority 5),
 * which fires with onboarding COMPLETE. The conclusion is unchanged — Priority
 * 5 is later still — but the premise is not "the last branch", it is "after
 * everything the user cannot opt out of".
 *
 * Known hole, deliberately left open: `onboarding` is in this zone, so a gated
 * guest who reaches `/onboarding` satisfies the gate and is not evicted from
 * it. That is reachable via plain `/login` → "Create a hero" when `character`
 * is null (`login-form.tsx` deliberately leaves stray keys alone). It is not a
 * lock — re-running onboarding mints fresh provisional keys, and the gate
 * catches them again on the way out — but the gate is described elsewhere as a
 * "hard wall" and it is not one at this seam.
 *
 * Letting the user actually REACH `/login?intent=convert` exposes that the
 * `convert` framing withholds its way back on purpose (`copy.ts:105-110` — that
 * link is destructive, and this screen promises to save the progress it would
 * destroy). So there is currently no non-destructive route back to the signup
 * prompt: emberglow#359.
 *
 * `Partial`, not `Record`: membership is a subset by design, and the compiler
 * still rejects a segment that is not resolver-owned. The "did you decide about
 * this new target?" enforcement lives on `RESOLVER_OWNED_SEGMENTS` above, so it
 * does not need repeating here.
 */
const PRE_ACCOUNT_ZONE: Partial<Record<ResolverOwnedSegment, true>> = {
  onboarding: true,
  login: true,
  'quest-completed-signup': true,
};

/**
 * Resolver-owned screens that ALSO have their own entry points, and so must
 * survive the Priority 6 'app' fall-through.
 *
 * `RESOLVER_OWNED_SEGMENTS` encodes "only the resolver puts you here", which
 * lets target 'app' read any membership as a stale state-driven arrival and
 * evict. That inference is sound for screens with no other way in. It is false
 * for `/streak-celebration`: three affordances push it on purpose — the play
 * screen header and journal (`StreakCounter`) and the profile stats card — and
 * the resolver only names it while `shouldShowStreakCelebration` is true. Tap
 * the flame on any other day and the resolver answers 'app', so the gate
 * replaced the user back onto Play before the screen could be read
 * (emberglow#365, captured on device 2026-07-28).
 *
 * Same defect shape as PRE_ACCOUNT_ZONE above — store state cannot express
 * "the user just tapped" — but a distinct carve-out, because that zone answers
 * "which screens satisfy each other" while this one answers "which screens the
 * absence of a destination is no reason to leave".
 *
 * The safety this gives up is real and is paid for elsewhere: the gate used to
 * be the fallback that landed an auto-shown celebration back home when
 * `handleContinue` cleared the flag and `router.back()` had nowhere to go. That
 * screen now guarantees its own exit rather than leaning on eviction, which is
 * where the guarantee belonged — the gate cannot tell the two arrivals apart,
 * and the screen does not need to.
 *
 * Scoped to target 'app' only. Every higher-priority target still evicts from
 * here (see the strict cases below): a pending quest outranks reading your
 * streak, and those are consequences of state the user cannot opt out of.
 */
const USER_REACHABLE_SEGMENTS: Partial<Record<ResolverOwnedSegment, true>> = {
  'streak-celebration': true,
};

/**
 * Answers "is where we are good enough for `target`?" so NavigationGate can skip
 * a redirect.
 *
 * For most targets that means exactly "is the router already showing it". The
 * exception is the pre-account zone, where several screens each satisfy the
 * others (see `PRE_ACCOUNT_ZONE`) — hence "good enough" rather than "already
 * there". The name predates that distinction and is kept for now to hold this
 * fix to one logical change; renaming reaches the gate and both test files.
 *
 * This is the gate's ONLY loop guard, and it must be derivable purely from the
 * router's CURRENT location. It cannot be a ref or state remembering past
 * redirects: expo-router mounts the root layout as a screen inside an internal
 * navigator, so redirecting to the route we already occupy replaces that screen
 * and remounts the whole tree — wiping any memory the gate kept and re-arming
 * the redirect. Location is the only thing that survives a remount.
 *
 * @param target   Where the resolver says we should be.
 * @param segments `useSegments()`. Groups are included and dynamic segments are
 *                 placeholders, e.g. `['(app)']` for `/(app)/index`, or
 *                 `['(app)', 'quest', '[id]']` for `/(app)/quest/abc123`.
 * @param pathname `usePathname()`. Groups are stripped and dynamic segments are
 *                 resolved, e.g. `/` for `/(app)/index`, or `/quest/abc123`.
 * @returns true when no navigation is needed.
 */
export function isAlreadyAtTarget(
  target: NavigationTarget,
  segments: string[],
  pathname: string
): boolean {
  switch (target.type) {
    // Not a destination — never suppress, never navigate.
    case 'loading':
      return false;

    // 'app' is the resolver's Priority 6 fall-through, returned whenever nothing
    // special is happening. It is the ABSENCE of a destination, not a
    // destination: a reason to leave a screen the resolver owns, and no reason
    // to move anywhere else. Matching it against the (app) group instead would
    // evict the user from every root-level route they reached by tapping —
    // the whole cooperative and scheduled-quest flows live outside that group.
    case 'app': {
      const [root] = segments;

      // No segments means the navigator has not settled: that is no location
      // at all, not a wrong one, and no location is not a reason to navigate.
      // Redirecting here re-arms the loop this helper exists to kill, because
      // the remount that redirect causes empties segments again. `segments` is
      // a dependency of the gate's effect, so the real decision is only
      // deferred until they populate a tick later.
      if (root === undefined) {
        return true;
      }

      // Screens the user can reach on purpose (see USER_REACHABLE_SEGMENTS)
      // are resolver-owned but not resolver-exclusive: 'app' is the absence of
      // a destination, which is no reason to take one away from them.
      if (Object.hasOwn(USER_REACHABLE_SEGMENTS, root)) {
        return true;
      }

      return !Object.hasOwn(RESOLVER_OWNED_SEGMENTS, root);
    }

    // The quest id is part of the destination, and useSegments() flattens it to
    // the literal '[id]', so identity has to come from the resolved pathname.
    case 'quest-result': {
      if (pathname === `/quest/${target.questId}`) {
        return true;
      }

      // Mid-remount transient (captured on device 2026-07-16): the router is
      // already on (app)/quest/[id] but the id param has not materialized into
      // the resolved pathname, which reads bare '/quest'. Navigating now is
      // what arms the redirect loop — the replace can only land above the
      // unsettled child state, remounting the root and re-creating this same
      // transient. Like empty segments in the 'app' case, this is "no location
      // yet", not a wrong location; pathname is a dependency of the gate's
      // effect, so the decision is only deferred until the id resolves.
      return pathname === '/quest' && segments[segments.length - 1] === '[id]';
    }

    // The pre-account zone (see PRE_ACCOUNT_ZONE): any member satisfies any
    // other, so the gate stops policing moves the user made on purpose.
    //
    // Empty segments still navigate, and that is the opposite of the 'app' case
    // above on purpose. There, no location meant "no reason to move". Here it
    // means the launch redirect has not happened yet, and it is the whole reason
    // this gate exists — suppressing it would strand a cold start on the root
    // route. `Object.hasOwn` with `segments[0]` undefined is already false, so
    // that falls out rather than needing its own branch.
    case 'login':
    case 'onboarding':
    case 'quest-completed-signup':
      return Object.hasOwn(PRE_ACCOUNT_ZONE, segments[0]);

    case 'pending-quest':
      return segments[0] === 'pending-quest';
    case 'cooperative-pending-quest':
      return segments[0] === 'cooperative-pending-quest';
    case 'active-quest':
      return segments[0] === 'active-quest';
    case 'streak-celebration':
      return segments[0] === 'streak-celebration';
    case 'first-quest-result':
      return segments[0] === 'first-quest-result';

    // A hero-less account sitting in the app group must still be evicted to
    // /no-hero. But tapping the screen's "Choose your hero" button resets
    // onboarding and navigates to /onboarding/welcome WITHOUT changing any
    // resolver input — serverUser is unchanged, so the resolver still answers
    // 'no-hero' on the next render. A strict segments[0] === 'no-hero' match
    // read that as "not there yet" and replaced the user straight back onto
    // /no-hero, making the button inert (same dead-link shape as
    // PRE_ACCOUNT_ZONE above, just not initiated from inside that zone).
    case 'no-hero':
      return (
        segments[0] === 'no-hero' ||
        Object.hasOwn(PRE_ACCOUNT_ZONE, segments[0])
      );

    default: {
      const _exhaustive: never = target;
      return false;
    }
  }
}
