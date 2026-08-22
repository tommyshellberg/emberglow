import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * React Query only knows about "window focus" in the browser. On React
 * Native it has to be told from AppState, or `refetchOnWindowFocus` never
 * fires. Returns an unsubscribe function.
 */
export function bindFocusManagerToAppState(): () => void {
  const subscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    }
  );
  return () => subscription.remove();
}
