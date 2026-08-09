import { Env } from '@env';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { posthogClient } from '@/lib/posthog';

import { RevenueCatService, revenueCatService } from './revenuecat-service';

// `Env` is `Constants.expoConfig?.extra ?? {}`, and under Jest expoConfig has
// no `extra` — so every Env.* value is undefined by default. Without this stub
// the iOS and Android branches of initialize() both configure RevenueCat with
// `{ apiKey: undefined }` and no assertion can tell them apart.
jest.mock('expo-constants', () => {
  const actual = jest.requireActual('expo-constants');
  const actualDefault = actual.default ?? actual;
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actualDefault,
      expoConfig: {
        ...(actualDefault.expoConfig ?? {}),
        extra: {
          ...(actualDefault.expoConfig?.extra ?? {}),
          REVENUECAT_APPLE_API_KEY: 'test-apple-api-key',
          REVENUECAT_GOOGLE_API_KEY: 'test-google-api-key',
        },
      },
    },
  };
});

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

/**
 * A never-initialized instance. The exported singleton is initialized once for
 * the whole file, so every "not initialized" guard and the platform key
 * selection in initialize() are otherwise unreachable.
 */
function freshService(): RevenueCatService {
  (RevenueCatService as unknown as { instance?: RevenueCatService }).instance =
    undefined;
  return RevenueCatService.getInstance();
}

function silenceConsole() {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
}

describe('RevenueCatService.initialize', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.restoreAllMocks();
  });

  // Guard the guard: if the two keys were ever the same value, the two tests
  // below would pass against an implementation that always picks one of them.
  it('has distinct API keys per platform to assert against', () => {
    expect(Env.REVENUECAT_APPLE_API_KEY).toBeTruthy();
    expect(Env.REVENUECAT_GOOGLE_API_KEY).toBeTruthy();
    expect(Env.REVENUECAT_APPLE_API_KEY).not.toBe(
      Env.REVENUECAT_GOOGLE_API_KEY
    );
  });

  it('configures with the Apple key on iOS', () => {
    Platform.OS = 'ios';

    freshService().initialize();

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.configure).toHaveBeenCalledWith({
      apiKey: Env.REVENUECAT_APPLE_API_KEY,
    });
  });

  it('configures with the Google key on Android', () => {
    Platform.OS = 'android';

    freshService().initialize();

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.configure).toHaveBeenCalledWith({
      apiKey: Env.REVENUECAT_GOOGLE_API_KEY,
    });
  });

  it('does not configure on a platform with no key', () => {
    // Expo web has neither key. Configuring there with the wrong platform's
    // key is worse than not configuring at all.
    Platform.OS = 'web';

    freshService().initialize();

    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('turns on verbose SDK logging only in development', () => {
    const originalDev = __DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      freshService().initialize();
      expect(Purchases.setLogLevel).not.toHaveBeenCalled();

      (globalThis as { __DEV__?: boolean }).__DEV__ = true;
      freshService().initialize();
      expect(Purchases.setLogLevel).toHaveBeenCalledWith('VERBOSE');
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
  });

  it('configures the SDK exactly once across repeated calls', () => {
    const service = freshService();

    service.initialize();
    service.initialize();

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
  });

  it('reports itself unconfigured until initialize() runs', () => {
    const service = freshService();

    expect(service.isConfigured()).toBe(false);
    service.initialize();
    expect(service.isConfigured()).toBe(true);
  });

  it('hands back the same singleton to every caller', () => {
    // A broken singleton silently resets isInitialized per caller, so every
    // "not initialized" guard starts firing in production.
    expect(RevenueCatService.getInstance()).toBe(
      RevenueCatService.getInstance()
    );
  });
});

describe('RevenueCatService guards before initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
  });

  afterEach(() => jest.restoreAllMocks());

  it('refuses to refresh customer info', async () => {
    await expect(freshService().refreshCustomerInfo()).rejects.toThrow(
      'RevenueCat not initialized'
    );
    expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('refuses to present the paywall and reports failure to the caller', async () => {
    await expect(freshService().presentPaywall('settings')).resolves.toBe(
      false
    );
    expect(mockPresentPaywall).not.toHaveBeenCalled();
  });
});

describe('RevenueCatService.hasPremiumAccess', () => {
  const originalDev = __DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('grants access in development without consulting RevenueCat', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    await expect(revenueCatService.hasPremiumAccess()).resolves.toBe(true);
    expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  // Everything below sets __DEV__ = false. Under Jest it is true by default,
  // so the entire real entitlement path is unreachable without this — the
  // `if (__DEV__) return true` short-circuit is the first statement.
  it('denies access in production when the SDK was never configured', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    await expect(freshService().hasPremiumAccess()).resolves.toBe(false);
    expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('grants access in production when an entitlement is active', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
      entitlements: { active: { premium: {} } },
    });
    const service = freshService();
    service.initialize();

    await expect(service.hasPremiumAccess()).resolves.toBe(true);
  });

  it('denies access in production when no entitlement is active', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
      entitlements: { active: {} },
    });
    const service = freshService();
    service.initialize();

    await expect(service.hasPremiumAccess()).resolves.toBe(false);
  });

  it('denies access in production when the lookup fails', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(
      new Error('network')
    );
    const service = freshService();
    service.initialize();

    await expect(service.hasPremiumAccess()).resolves.toBe(false);
  });
});

describe('RevenueCatService.refreshCustomerInfo recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
    // The synthesised fallback below reads this enum, which the global
    // react-native-purchases mock does not define.
    (
      Purchases as unknown as { VERIFICATION_RESULT: Record<string, string> }
    ).VERIFICATION_RESULT = { NOT_REQUESTED: 'NOT_REQUESTED' };
    revenueCatService.initialize();
  });

  afterEach(() => jest.restoreAllMocks());

  it('synthesises empty entitlements when there is no active account', async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(
      new Error('No active account found')
    );

    const info = await revenueCatService.refreshCustomerInfo();

    expect(info.entitlements.active).toEqual({});
    expect(info.entitlements.all).toEqual({});
    expect(info.activeSubscriptions).toEqual([]);
    expect(info.allPurchasedProductIdentifiers).toEqual([]);
    expect(info.latestExpirationDate).toBeNull();
    expect(info.managementURL).toBeNull();
    expect(info.originalAppUserId).toBe('');
  });

  it('recognises the no-active-account signal on the native userInfo shape', async () => {
    // iOS reports it here rather than on error.message.
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(
      Object.assign(new Error('unhelpful'), {
        userInfo: { description: 'No active account' },
      })
    );

    await expect(
      revenueCatService.refreshCustomerInfo()
    ).resolves.toMatchObject({ activeSubscriptions: [] });
  });

  it('rethrows any other failure instead of inventing an empty account', async () => {
    // Swallowing this would report every paying user as unsubscribed the
    // moment the network blips.
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(
      new Error('network unreachable')
    );

    await expect(revenueCatService.refreshCustomerInfo()).rejects.toThrow(
      'network unreachable'
    );
  });

  it('denies premium when the customer info carries no entitlements', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({});
    const service = freshService();
    service.initialize();

    await expect(service.hasPremiumAccess()).resolves.toBe(false);

    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  });
});

describe('RevenueCatService remaining public surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
    revenueCatService.initialize();
  });

  afterEach(() => jest.restoreAllMocks());

  it('getOfferings returns the current offering', async () => {
    const current = { identifier: 'default' };
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({ current });

    await expect(revenueCatService.getOfferings()).resolves.toBe(current);
  });

  it('getOfferings degrades to null rather than throwing at the call site', async () => {
    (Purchases.getOfferings as jest.Mock).mockRejectedValue(
      new Error('offline')
    );

    await expect(revenueCatService.getOfferings()).resolves.toBeNull();
  });

  it('getManagementURL returns the subscription management link', async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
      managementURL: 'https://apps.apple.com/account/subscriptions',
    });

    await expect(revenueCatService.getManagementURL()).resolves.toBe(
      'https://apps.apple.com/account/subscriptions'
    );
  });

  it('getManagementURL returns null when the account has no link', async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
      managementURL: null,
    });

    await expect(revenueCatService.getManagementURL()).resolves.toBeNull();
  });

  it('restorePurchases returns the restored customer info', async () => {
    const customerInfo = { originalAppUserId: 'user-1' };
    (Purchases.restorePurchases as jest.Mock).mockResolvedValue(customerInfo);

    await expect(revenueCatService.restorePurchases()).resolves.toBe(
      customerInfo
    );
    expect(revenueCatService.getCustomerInfo()).toBe(customerInfo);
  });

  it('purchasePackage returns the customer info from the completed purchase', async () => {
    const customerInfo = { originalAppUserId: 'user-1' };
    (Purchases.purchasePackage as jest.Mock).mockResolvedValue({
      customerInfo,
    });

    await expect(revenueCatService.purchasePackage(testPackage)).resolves.toBe(
      customerInfo
    );
  });

  describe('presentPaywallIfNeeded', () => {
    it('delegates to presentPaywall when no entitlement is named', async () => {
      mockPresentPaywall.mockResolvedValue('PURCHASED');
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({});

      await expect(revenueCatService.presentPaywallIfNeeded()).resolves.toBe(
        true
      );
      expect(mockPresentPaywall).toHaveBeenCalled();
      expect(RevenueCatUI.presentPaywallIfNeeded).not.toHaveBeenCalled();
    });

    it('reports success and refreshes entitlements when purchased', async () => {
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValue(
        'PURCHASED'
      );
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({});

      await expect(
        revenueCatService.presentPaywallIfNeeded('premium')
      ).resolves.toBe(true);
      expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalledWith({
        requiredEntitlementIdentifier: 'premium',
      });
      expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    });

    it('reports success when the purchase was restored rather than new', async () => {
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValue(
        'RESTORED'
      );
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({});

      await expect(
        revenueCatService.presentPaywallIfNeeded('premium')
      ).resolves.toBe(true);
    });

    it('reports failure without refreshing when cancelled', async () => {
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValue(
        'CANCELLED'
      );

      await expect(
        revenueCatService.presentPaywallIfNeeded('premium')
      ).resolves.toBe(false);
      expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
    });
  });
});

describe('RevenueCatService error propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
  });

  afterEach(() => jest.restoreAllMocks());

  it('leaves the service unconfigured when the SDK throws on configure', () => {
    (Purchases.configure as jest.Mock).mockImplementation(() => {
      throw new Error('bad api key');
    });
    const service = freshService();

    expect(() => service.initialize()).toThrow('bad api key');
    // Must not latch as initialized, or every later guard waves through an
    // unconfigured SDK.
    expect(service.isConfigured()).toBe(false);
  });

  it('propagates a login failure to the caller', async () => {
    (Purchases.logIn as jest.Mock).mockRejectedValue(new Error('login failed'));

    await expect(revenueCatService.loginUser('user-1')).rejects.toThrow(
      'login failed'
    );
  });

  it('propagates a logout failure to the caller', async () => {
    (Purchases.logOut as jest.Mock).mockRejectedValue(
      new Error('logout failed')
    );

    await expect(revenueCatService.logoutUser()).rejects.toThrow(
      'logout failed'
    );
  });
});

describe('RevenueCatService session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    silenceConsole();
    revenueCatService.initialize();
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs the user in and caches the returned customer info', async () => {
    const customerInfo = { originalAppUserId: 'user-1' };
    (Purchases.logIn as jest.Mock).mockResolvedValue({ customerInfo });

    await revenueCatService.loginUser('user-1');

    expect(Purchases.logIn).toHaveBeenCalledWith('user-1');
    expect(revenueCatService.getCustomerInfo()).toEqual(customerInfo);
  });

  it('logs the user out so entitlements do not follow into the next session', async () => {
    (Purchases.logOut as jest.Mock).mockResolvedValue({
      originalAppUserId: 'anonymous',
    });

    await revenueCatService.logoutUser();

    expect(Purchases.logOut).toHaveBeenCalled();
    expect(revenueCatService.getCustomerInfo()).toEqual({
      originalAppUserId: 'anonymous',
    });
  });

  it('returns and caches refreshed customer info', async () => {
    const customerInfo = { originalAppUserId: 'user-1' };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(customerInfo);

    await expect(revenueCatService.refreshCustomerInfo()).resolves.toEqual(
      customerInfo
    );
    expect(revenueCatService.getCustomerInfo()).toEqual(customerInfo);
  });
});

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

    it('survives a rejection with no error object', async () => {
      // The catch block reads error?.userCancelled and error?.code. Drop
      // either optional chain and this rejection becomes a TypeError thrown
      // from inside the handler, masking the real store failure.
      (mockPurchases.purchasePackage as jest.Mock).mockRejectedValue(undefined);

      await expect(
        revenueCatService.purchasePackage(testPackage)
      ).rejects.toBeUndefined();

      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_failed', {
        package_id: 'monthly',
        error_code: undefined,
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

      // The return value is what unlocks premium in the UI. Dropping this
      // assertion lets a flipped `return true` ship a paid purchase that the
      // app treats as a failure.
      await expect(revenueCatService.presentPaywall('settings')).resolves.toBe(
        true
      );

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

      // A flipped `return false` here unlocks premium for free.
      await expect(revenueCatService.presentPaywall('settings')).resolves.toBe(
        false
      );

      expect(posthogClient.capture).toHaveBeenCalledWith('paywall_viewed', {
        source: 'settings',
      });
      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_cancelled', {
        source: 'settings',
        method: 'paywall',
      });
    });

    it('reports failure to the caller when the paywall errors', async () => {
      mockPresentPaywall.mockResolvedValue('ERROR');

      await expect(revenueCatService.presentPaywall('settings')).resolves.toBe(
        false
      );
      expect(posthogClient.capture).toHaveBeenCalledWith('purchase_failed', {
        source: 'settings',
        method: 'paywall',
      });
    });
  });
});
