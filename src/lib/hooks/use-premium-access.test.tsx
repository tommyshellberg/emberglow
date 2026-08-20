import { act, renderHook, waitFor } from '@testing-library/react-native';

import { revenueCatService } from '@/lib/services/revenuecat-service';

import { usePremiumAccess } from './use-premium-access';

jest.mock('@/lib/services/revenuecat-service', () => ({
  revenueCatService: {
    hasPremiumAccess: jest.fn(),
  },
}));

const mockHasPremiumAccess = revenueCatService.hasPremiumAccess as jest.Mock;

describe('usePremiumAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unlocks premium on every mounted screen after a purchase in one of them', async () => {
    // The home screen, settings, and the skill tree each call this hook
    // independently. A purchase completed via the paywall on one screen must
    // update all of them without a remount (i.e. without restarting the app).
    mockHasPremiumAccess.mockResolvedValue(false);

    const purchasingScreen = renderHook(() => usePremiumAccess());
    const otherScreen = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(otherScreen.result.current.isLoading).toBe(false);
    });
    expect(otherScreen.result.current.hasPremiumAccess).toBe(false);

    // The subscription goes through: RevenueCat now reports an entitlement.
    mockHasPremiumAccess.mockResolvedValue(true);
    await act(async () => {
      await purchasingScreen.result.current.handlePaywallSuccess();
    });

    expect(purchasingScreen.result.current.hasPremiumAccess).toBe(true);
    expect(otherScreen.result.current.hasPremiumAccess).toBe(true);
  });

  it('denies premium and finishes loading when the entitlement check fails', async () => {
    const { usePremiumAccessStore } = jest.requireActual(
      '@/store/premium-access-store'
    );
    // Seed true so the assertion proves the failure path actively revokes,
    // rather than passing against the store's false default.
    usePremiumAccessStore.setState({ hasPremiumAccess: true, isLoading: true });
    mockHasPremiumAccess.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasPremiumAccess).toBe(false);
    // Callers gate on the returned value too, so a failed check must not
    // report access.
    await expect(result.current.checkPremiumAccess()).resolves.toBe(false);
  });
});
