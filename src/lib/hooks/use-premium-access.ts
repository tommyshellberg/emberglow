import { useCallback, useEffect, useState } from 'react';

import { revenueCatService } from '@/lib/services/revenuecat-service';
import { usePremiumAccessStore } from '@/store/premium-access-store';

export function usePremiumAccess() {
  // Entitlement state is shared across every mounted instance of this hook
  // (home, settings, skill tree, ...), so a purchase completed on one screen
  // unlocks the others without a remount. Only the paywall visibility is
  // per-screen state.
  const hasPremiumAccess = usePremiumAccessStore(
    (state) => state.hasPremiumAccess
  );
  const isLoading = usePremiumAccessStore((state) => state.isLoading);
  const [showPaywall, setShowPaywall] = useState(false);

  const checkPremiumAccess = useCallback(async () => {
    try {
      const hasAccess = await revenueCatService.hasPremiumAccess();
      usePremiumAccessStore.getState().setHasPremiumAccess(hasAccess);
      return hasAccess;
    } catch (error) {
      console.error('Failed to check premium access:', error);
      usePremiumAccessStore.getState().setHasPremiumAccess(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkPremiumAccess();
  }, [checkPremiumAccess]);

  const requirePremium = useCallback(
    (callback?: () => void) => {
      if (hasPremiumAccess) {
        if (callback) {
          callback();
        }
        return true;
      } else {
        setShowPaywall(true);
        return false;
      }
    },
    [hasPremiumAccess]
  );

  const handlePaywallClose = useCallback(() => {
    setShowPaywall(false);
  }, []);

  const handlePaywallSuccess = useCallback(async () => {
    console.log('[usePremiumAccess] Paywall success - updating premium status');
    setShowPaywall(false);
    await checkPremiumAccess();
  }, [checkPremiumAccess]);

  // Force refresh premium status (useful for when app returns from background)
  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremiumAccess] Refreshing premium status...');
    return checkPremiumAccess();
  }, [checkPremiumAccess]);

  return {
    hasPremiumAccess,
    isLoading,
    showPaywall,
    requirePremium,
    handlePaywallClose,
    handlePaywallSuccess,
    checkPremiumAccess,
    refreshPremiumStatus,
  };
}
