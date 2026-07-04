import {
  usePathname,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';

import { isAlreadyAtTarget } from '@/lib/navigation/is-already-at-target';
import { useNavigationTarget } from '@/lib/navigation/navigation-state-resolver';

export default function NavigationGate() {
  const router = useRouter();
  const target = useNavigationTarget();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until navigation tree is ready
    // Note: We only check rootNavigationState?.key, not router.canGoBack
    // because canGoBack will be false when app first opens from notification
    if (!rootNavigationState?.key) {
      return;
    }

    // Redirecting to where we already are makes expo-router REPLACE the root
    // layout's own internal `__root` screen, which remounts this component and
    // every provider above it. Deriving "should I move?" from the router's
    // current location (rather than from a ref remembering past redirects) keeps
    // this gate idempotent, so a remount can't restart the redirect.
    if (isAlreadyAtTarget(target, segments, pathname)) {
      return;
    }

    // Logged on every navigation this gate actually performs. The gate is the
    // sole owner of state-derived navigation, so a screen appearing twice means
    // either two lines here or a call site pushing what the store already
    // implies — and neither is visible from the resolver's logs alone.
    console.log(
      '🧭 [NavigationGate] navigating to',
      target.type,
      'from',
      pathname,
      JSON.stringify(segments)
    );

    switch (target.type) {
      case 'pending-quest':
        // Use push instead of replace so cancel button can navigate back
        router.push('/pending-quest');
        break;
      case 'cooperative-pending-quest':
        router.push('/cooperative-pending-quest');
        break;
      case 'active-quest':
        router.replace('/active-quest');
        break;
      case 'first-quest-result':
        router.replace(`/first-quest-result?outcome=${target.outcome}`);
        break;
      case 'quest-result':
        router.replace(`/(app)/quest/${target.questId}` as any);
        break;
      case 'onboarding':
        router.replace('/onboarding');
        break;
      case 'login':
        router.replace('/login');
        break;
      case 'app':
        router.replace('/(app)');
        break;
      case 'quest-completed-signup':
        router.replace('/quest-completed-signup');
        break;
      case 'streak-celebration':
        router.replace('/streak-celebration');
        break;
      case 'loading':
        break;
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = target;
        console.warn('[NavigationGate] Unhandled target type:', _exhaustive);
    }
  }, [router, target, rootNavigationState?.key, segments, pathname]);

  return null; // renders nothing, just side-effects
}
