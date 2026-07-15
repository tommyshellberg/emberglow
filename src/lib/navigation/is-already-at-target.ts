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
  'quest-completed-signup': true,
  'streak-celebration': true,
  'first-quest-result': true,
};

/**
 * Answers "is the router already showing `target`?" so NavigationGate can skip a
 * redundant redirect.
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

    // 'app' is the resolver's Priority 5 fall-through, returned whenever nothing
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

      return !Object.hasOwn(RESOLVER_OWNED_SEGMENTS, root);
    }

    // The quest id is part of the destination, and useSegments() flattens it to
    // the literal '[id]', so identity has to come from the resolved pathname.
    case 'quest-result':
      return pathname === `/quest/${target.questId}`;

    case 'login':
      return segments[0] === 'login';
    case 'onboarding':
      return segments[0] === 'onboarding';
    case 'pending-quest':
      return segments[0] === 'pending-quest';
    case 'cooperative-pending-quest':
      return segments[0] === 'cooperative-pending-quest';
    case 'quest-completed-signup':
      return segments[0] === 'quest-completed-signup';
    case 'streak-celebration':
      return segments[0] === 'streak-celebration';
    case 'first-quest-result':
      return segments[0] === 'first-quest-result';

    default: {
      const _exhaustive: never = target;
      return false;
    }
  }
}
