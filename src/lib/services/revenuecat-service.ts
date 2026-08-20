import { Env } from '@env';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { posthogClient } from '@/lib/posthog';
import { usePremiumAccessStore } from '@/store/premium-access-store';

export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private customerInfo: CustomerInfo | null = null;
  private testModeEnabled = false;

  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  // Enable test mode for development - bypasses actual purchases
  enableTestMode(): void {
    if (__DEV__) {
      this.testModeEnabled = true;
      console.log('RevenueCat Test Mode Enabled - Purchases will be simulated');
    }
  }

  initialize(): void {
    if (this.isInitialized) {
      console.log('RevenueCat already initialized');
      return;
    }

    try {
      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      }

      // Configure RevenueCat with platform-specific API key
      // Following documentation: configure without user ID, use logIn() separately
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: Env.REVENUECAT_APPLE_API_KEY });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: Env.REVENUECAT_GOOGLE_API_KEY });
      }

      // Push entitlement changes (purchase, renewal, expiration — from any
      // flow, including the RevenueCatUI paywall) into the shared store so
      // every mounted screen updates without a remount.
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        this.customerInfo = customerInfo;
        // Development builds and test mode grant premium unconditionally
        // (see hasPremiumAccess); an honest "no entitlement" push must not
        // revoke that override.
        if (__DEV__ || this.testModeEnabled) {
          return;
        }
        const hasAccess =
          Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;
        usePremiumAccessStore.getState().setHasPremiumAccess(hasAccess);
      });

      this.isInitialized = true;
      console.log('RevenueCat SDK configured successfully');
    } catch (error) {
      console.error('Failed to configure RevenueCat:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async loginUser(userId: string): Promise<void> {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      this.customerInfo = customerInfo;
      console.log('RevenueCat user logged in:', userId);
    } catch (error) {
      console.error('Failed to log in user to RevenueCat:', error);
      throw error;
    }
  }

  async logoutUser(): Promise<void> {
    try {
      this.customerInfo = await Purchases.logOut();
      console.log('RevenueCat user logged out');
    } catch (error) {
      console.error('Failed to log out user from RevenueCat:', error);
      throw error;
    }
  }

  async refreshCustomerInfo(): Promise<CustomerInfo> {
    if (!this.isInitialized) {
      throw new Error('RevenueCat not initialized. Call initialize() first.');
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      this.customerInfo = customerInfo;
      return customerInfo;
    } catch (error: any) {
      console.error('Failed to get customer info:', error);
      // If no active account, return empty customer info
      if (
        error.message?.includes('No active account') ||
        error.userInfo?.description?.includes('No active account')
      ) {
        console.log(
          'No active RevenueCat account found - returning default customer info'
        );
        return {
          entitlements: {
            active: {},
            all: {},
            verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
          },
          activeSubscriptions: [],
          allPurchasedProductIdentifiers: [],
          latestExpirationDate: null,
          firstSeen: new Date().toISOString(),
          originalAppUserId: '',
          requestDate: new Date().toISOString(),
          allExpirationDates: {},
          allPurchaseDates: {},
          originalApplicationVersion: null,
          originalPurchaseDate: null,
          managementURL: null,
          nonSubscriptionTransactions: [],
          subscriptionsByProductIdentifier: {},
        } as CustomerInfo;
      }
      throw error;
    }
  }

  async hasPremiumAccess(): Promise<boolean> {
    console.log('[RevenueCat] Checking premium access...', {
      isInitialized: this.isInitialized,
      testModeEnabled: this.testModeEnabled,
      isDev: __DEV__,
    });

    // Override premium access in development mode
    if (__DEV__) {
      console.log('[RevenueCat] Development mode: Premium access granted');
      return true;
    }

    // If not initialized, return false (no premium access)
    if (!this.isInitialized) {
      console.log('[RevenueCat] Not initialized, returning no premium access');
      return false;
    }

    // Test mode - always return true for premium access
    if (this.testModeEnabled && __DEV__) {
      console.log('[RevenueCat] Test Mode: Premium access granted');
      return true;
    }

    try {
      const customerInfo = await this.refreshCustomerInfo();
      console.log('[RevenueCat] Customer info:', {
        hasEntitlements: !!customerInfo?.entitlements,
        activeEntitlements: customerInfo?.entitlements?.active
          ? Object.keys(customerInfo.entitlements.active)
          : [],
        activeSubscriptions: customerInfo?.activeSubscriptions || [],
        allPurchasedProductIdentifiers:
          customerInfo?.allPurchasedProductIdentifiers || [],
      });

      // If no customer info, return false
      if (
        !customerInfo ||
        !customerInfo.entitlements ||
        !customerInfo.entitlements.active
      ) {
        console.log(
          '[RevenueCat] No customer info available, returning no premium access'
        );
        return false;
      }

      // Get all active entitlements
      const activeEntitlementKeys = Object.keys(
        customerInfo.entitlements.active
      );

      // If there are ANY active entitlements, the user has premium access
      // This approach means you don't need to hardcode entitlement IDs
      if (activeEntitlementKeys.length > 0) {
        console.log(
          '[RevenueCat] Found active entitlements:',
          activeEntitlementKeys
        );
        return true;
      }

      console.log('[RevenueCat] No premium entitlements found');
      return false;
    } catch (error) {
      console.error('[RevenueCat] Failed to check premium access:', error);
      return false;
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const purchaseProps = {
      package_id: pkg.identifier,
      product_id: pkg.product.identifier,
      price: pkg.product.price,
      currency: pkg.product.currencyCode,
    };
    posthogClient.capture('purchase_initiated', purchaseProps);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      this.customerInfo = customerInfo;
      posthogClient.capture('purchase_completed', purchaseProps);
      return customerInfo;
    } catch (error: any) {
      if (error?.userCancelled) {
        posthogClient.capture('purchase_cancelled', {
          package_id: pkg.identifier,
        });
      } else {
        posthogClient.capture('purchase_failed', {
          package_id: pkg.identifier,
          error_code: error?.code ?? error?.message,
        });
      }
      console.error('Failed to purchase package:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    posthogClient.capture('restore_purchases_attempted');
    try {
      const customerInfo = await Purchases.restorePurchases();
      this.customerInfo = customerInfo;
      posthogClient.capture('restore_purchases_succeeded');
      return customerInfo;
    } catch (error) {
      posthogClient.capture('restore_purchases_failed');
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  async presentPaywall(source: string = 'unknown'): Promise<boolean> {
    // Ensure SDK is initialized
    if (!this.isInitialized) {
      console.error('RevenueCat not initialized. Cannot present paywall.');
      return false;
    }

    // Test mode - simulate successful purchase
    if (this.testModeEnabled && __DEV__) {
      console.log('Test Mode: Simulating successful purchase');
      // Simulate a delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return true;
    }

    try {
      posthogClient.capture('paywall_viewed', { source });

      const paywallResult = await RevenueCatUI.presentPaywall();
      console.log('Paywall result:', paywallResult);

      switch (paywallResult) {
        case RevenueCatUI.PAYWALL_RESULT.PURCHASED:
          posthogClient.capture('purchase_completed', {
            source,
            method: 'paywall',
          });
          // Refresh customer info after successful purchase/restore
          await this.refreshCustomerInfo();
          return true;
        case RevenueCatUI.PAYWALL_RESULT.RESTORED:
          posthogClient.capture('restore_purchases_succeeded', {
            source,
            method: 'paywall',
          });
          await this.refreshCustomerInfo();
          return true;
        case RevenueCatUI.PAYWALL_RESULT.CANCELLED:
          posthogClient.capture('purchase_cancelled', {
            source,
            method: 'paywall',
          });
          console.log('User cancelled paywall');
          return false;
        case RevenueCatUI.PAYWALL_RESULT.ERROR:
          posthogClient.capture('purchase_failed', {
            source,
            method: 'paywall',
          });
          console.error('Error presenting paywall');
          return false;
        case RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED:
          console.log('Paywall not presented');
          return false;
        default:
          return false;
      }
    } catch (error: any) {
      console.error('Failed to present paywall:', error);

      // In development, check for common configuration issues
      if (__DEV__) {
        if (
          error.message?.includes('No offerings found') ||
          error.message?.includes('Bundle ID') ||
          error.userInfo?.readable_error_code === 'CONFIGURATION_ERROR'
        ) {
          console.log(
            'Development mode: Configuration issue detected, enabling test mode'
          );
          this.testModeEnabled = true;
          return this.presentPaywall(source); // Retry with test mode
        }
      }

      posthogClient.capture('purchase_failed', {
        source,
        method: 'paywall',
        error_code: error?.code ?? error?.message ?? 'unknown',
      });
      throw error;
    }
  }

  async presentPaywallIfNeeded(
    requiredEntitlementIdentifier?: string
  ): Promise<boolean> {
    try {
      // If no specific entitlement is required, just use presentPaywall
      if (!requiredEntitlementIdentifier) {
        return this.presentPaywall();
      }

      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier,
      });

      if (
        paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
        paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
      ) {
        // Refresh customer info after successful purchase/restore
        await this.refreshCustomerInfo();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to present paywall if needed:', error);
      throw error;
    }
  }

  getCustomerInfo(): CustomerInfo | null {
    return this.customerInfo;
  }

  isConfigured(): boolean {
    return this.isInitialized;
  }

  async getManagementURL(): Promise<string | null> {
    try {
      const customerInfo = await this.refreshCustomerInfo();
      return customerInfo.managementURL || null;
    } catch (error) {
      console.error('Failed to get management URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const revenueCatService = RevenueCatService.getInstance();
