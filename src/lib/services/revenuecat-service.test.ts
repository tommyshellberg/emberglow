import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { posthogClient } from '@/lib/posthog';

import { revenueCatService } from './revenuecat-service';

// Override the global jest-setup mock: the service's paywall flow needs the
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
  presentPaywallIfNeeded: jest.fn(),
}));

const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;
const mockPresentPaywall = RevenueCatUI.presentPaywall as jest.Mock;

const testPackage = {
  identifier: 'monthly',
  product: {
    identifier: 'emberglow_monthly',
    price: 4.99,
    currencyCode: 'USD',
  },
} as any;

describe('RevenueCatService analytics', () => {
  beforeAll(() => {
    revenueCatService.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('purchasePackage', () => {
    it('captures purchase_initiated and purchase_completed on success', async () => {
      (mockPurchases.purchasePackage as jest.Mock).mockResolvedValue({
        customerInfo: {},
      });

      await revenueCatService.purchasePackage(testPackage);

      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_initiated', {
        package_id: 'monthly',
        product_id: 'emberglow_monthly',
        price: 4.99,
        currency: 'USD',
      });
      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_completed', {
        package_id: 'monthly',
        product_id: 'emberglow_monthly',
        price: 4.99,
        currency: 'USD',
      });
    });

    it('captures purchase_cancelled when the user cancels', async () => {
      (mockPurchases.purchasePackage as jest.Mock).mockRejectedValue(
        Object.assign(new Error('cancelled'), { userCancelled: true })
      );

      await expect(
        revenueCatService.purchasePackage(testPackage)
      ).rejects.toThrow();

      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_cancelled', {
        package_id: 'monthly',
      });
      expect(posthogClient.capture).not.toHaveBeenCalledWith(
        'purchase_completed',
        expect.anything()
      );
    });

    it('captures purchase_failed with the error code on failure', async () => {
      (mockPurchases.purchasePackage as jest.Mock).mockRejectedValue(
        Object.assign(new Error('store blew up'), { code: 'STORE_PROBLEM' })
      );

      await expect(
        revenueCatService.purchasePackage(testPackage)
      ).rejects.toThrow();

      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_failed', {
        package_id: 'monthly',
        error_code: 'STORE_PROBLEM',
      });
    });
  });

  describe('restorePurchases', () => {
    it('captures attempted and succeeded on success', async () => {
      (mockPurchases.restorePurchases as jest.Mock).mockResolvedValue({});

      await revenueCatService.restorePurchases();

      expect(posthogClient.capture).toHaveBeenCalledWith(
        'restore_purchases_attempted'
      );
      expect(posthogClient.capture).toHaveBeenCalledWith(
        'restore_purchases_succeeded'
      );
    });

    it('captures attempted and failed on failure', async () => {
      (mockPurchases.restorePurchases as jest.Mock).mockRejectedValue(
        new Error('network')
      );

      await expect(revenueCatService.restorePurchases()).rejects.toThrow();

      expect(posthogClient.capture).toHaveBeenCalledWith(
        'restore_purchases_attempted'
      );
      expect(posthogClient.capture).toHaveBeenCalledWith(
        'restore_purchases_failed'
      );
    });
  });

  describe('presentPaywall', () => {
    it('captures paywall_viewed and purchase_completed when purchased', async () => {
      mockPresentPaywall.mockResolvedValue('PURCHASED');
      (mockPurchases.getCustomerInfo as jest.Mock).mockResolvedValue({});

      await revenueCatService.presentPaywall('settings');

      expect(posthogClient.capture).toHaveBeenCalledWith('paywall_viewed', {
        source: 'settings',
      });
      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_completed', {
        source: 'settings',
        method: 'paywall',
      });
    });

    it('captures paywall_viewed and purchase_cancelled when cancelled', async () => {
      mockPresentPaywall.mockResolvedValue('CANCELLED');

      await revenueCatService.presentPaywall('settings');

      expect(posthogClient.capture).toHaveBeenCalledWith('paywall_viewed', {
        source: 'settings',
      });
      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_cancelled', {
        source: 'settings',
        method: 'paywall',
      });
    });
  });
});
