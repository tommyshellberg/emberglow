import { create } from 'zustand';

// Deliberately NOT persisted: entitlements are re-verified against RevenueCat
// on every launch, so a cached value could grant premium after a subscription
// lapses.
type PremiumAccessState = {
  hasPremiumAccess: boolean;
  // True until the first entitlement check completes after launch.
  isLoading: boolean;
  setHasPremiumAccess: (hasPremiumAccess: boolean) => void;
};

export const usePremiumAccessStore = create<PremiumAccessState>((set) => ({
  hasPremiumAccess: false,
  isLoading: true,
  setHasPremiumAccess: (hasPremiumAccess) =>
    set({ hasPremiumAccess, isLoading: false }),
}));
