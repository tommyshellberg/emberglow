import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import {
  type NavigationTarget,
  useNavigationTarget,
} from '@/lib/navigation/navigation-state-resolver';

export default function NavigationGate() {
  const router = useRouter();
  const target = useNavigationTarget();
  const last = useRef<NavigationTarget | null>(null);
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation tree is ready
    // Note: We only check rootNavigationState?.key, not router.canGoBack
    // because canGoBack will be false when app first opens from notification
    if (!rootNavigationState?.key) {
      console.log('[NavigationGate] Waiting for navigation to be ready');
      return;
    }

    if (JSON.stringify(last.current) === JSON.stringify(target)) {
      console.log('[NavigationGate] Target unchanged, skipping redirect');
      return;
    }

    console.log(
      '[NavigationGate] Target changed from',
      last.current?.type,
      'to',
      target.type
    );
    last.current = target;

    console.log('[NavigationGate] Executing redirect for target:', target);

    switch (target.type) {
      case 'pending-quest':
        console.log('[NavigationGate] Redirecting to pending-quest');
        // Use push instead of replace so cancel button can navigate back
        router.push('/pending-quest');
        break;
      case 'cooperative-pending-quest':
        console.log('[NavigationGate] Redirecting to cooperative-pending-quest');
        router.push('/cooperative-pending-quest');
        break;
      case 'first-quest-result':
        console.log('[NavigationGate] Redirecting to first-quest-result');
        router.replace(`/first-quest-result?outcome=${target.outcome}`);
        break;
      case 'quest-result':
        console.log(
          '[NavigationGate] Redirecting to quest result:',
          target.questId
        );
        router.replace(`/(app)/quest/${target.questId}` as any);
        break;
      case 'onboarding':
        console.log('[NavigationGate] Redirecting to onboarding');
        router.replace('/onboarding');
        break;
      case 'login':
        console.log('[NavigationGate] Redirecting to login');
        router.replace('/login');
        break;
      case 'app':
        console.log('[NavigationGate] Redirecting to app');
        router.replace('/(app)');
        break;
      case 'quest-completed-signup':
        console.log('[NavigationGate] Redirecting to quest-completed-signup');
        router.replace('/quest-completed-signup');
        break;
      case 'streak-celebration':
        console.log('[NavigationGate] Redirecting to streak-celebration');
        router.replace('/streak-celebration');
        break;
      case 'loading':
        console.log('[NavigationGate] Target is loading, waiting...');
        break;
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = target;
        console.warn('[NavigationGate] Unhandled target type:', _exhaustive);
    }
  }, [router, target, rootNavigationState?.key]);

  return null; // renders nothing, just side-effects
}
