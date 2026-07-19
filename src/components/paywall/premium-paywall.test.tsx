import React from 'react';
import RevenueCatUI from 'react-native-purchases-ui';

import { render, waitFor } from '@/lib/test-utils';

import { PremiumPaywall } from './premium-paywall';

// Override the global jest-setup mock: the component branches on the
// PAYWALL_RESULT enum, which the global mock does not provide.
jest.mock('react-native-purchases-ui', () => ({
  PAYWALL_RESULT: {
    NOT_PRESENTED: 'NOT_PRESENTED',
    ERROR: 'ERROR',
    CANCELLED: 'CANCELLED',
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
  },
  presentPaywall: jest.fn(),
}));

const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockPosthogCapture }),
}));

jest.mock('@/lib/services/revenuecat-service', () => ({
  revenueCatService: {
    refreshCustomerInfo: jest.fn().mockResolvedValue({}),
    hasPremiumAccess: jest.fn().mockResolvedValue(true),
    enableTestMode: jest.fn(),
  },
}));

jest.mock('@/lib/services/user', () => ({
  refreshPremiumStatus: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

const mockPresentPaywall = RevenueCatUI.presentPaywall as jest.Mock;

describe('PremiumPaywall analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('captures paywall_viewed and purchase_completed when purchased', async () => {
    mockPresentPaywall.mockResolvedValue('PURCHASED');
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <PremiumPaywall
        isVisible
        onClose={onClose}
        onSuccess={onSuccess}
        source="skill_tree"
      />
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(mockPosthogCapture).toHaveBeenCalledWith('paywall_viewed', {
      source: 'skill_tree',
    });
    expect(mockPosthogCapture).toHaveBeenCalledWith('purchase_completed', {
      source: 'skill_tree',
      method: 'paywall',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('captures purchase_cancelled when the user dismisses the paywall', async () => {
    mockPresentPaywall.mockResolvedValue('CANCELLED');
    const onClose = jest.fn();

    render(<PremiumPaywall isVisible onClose={onClose} source="home" />);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(mockPosthogCapture).toHaveBeenCalledWith('paywall_viewed', {
      source: 'home',
    });
    expect(mockPosthogCapture).toHaveBeenCalledWith('purchase_cancelled', {
      source: 'home',
      method: 'paywall',
    });
  });

  it('captures nothing when not visible', async () => {
    render(<PremiumPaywall isVisible={false} onClose={jest.fn()} />);

    expect(mockPresentPaywall).not.toHaveBeenCalled();
    expect(mockPosthogCapture).not.toHaveBeenCalled();
  });
});
