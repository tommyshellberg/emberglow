import { usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import RevenueCatUI from 'react-native-purchases-ui';

import { revenueCatService } from '@/lib/services/revenuecat-service';
import { refreshPremiumStatus } from '@/lib/services/user';

interface PremiumPaywallProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Where the paywall was opened from — becomes the `source` property on
   * paywall/purchase events so conversion can be compared per placement. */
  source?: string;
}

export function PremiumPaywall({
  isVisible,
  onClose,
  onSuccess,
  source = 'unknown',
}: PremiumPaywallProps) {
  const posthog = usePostHog();
  console.log('[PremiumPaywall] Component rendered with isVisible:', isVisible);
  const [hasPresented, setHasPresented] = useState(false);

  // Reset hasPresented when isVisible changes from true to false
  useEffect(() => {
    if (!isVisible) {
      console.log('[PremiumPaywall] Resetting hasPresented flag');
      setHasPresented(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && !hasPresented) {
      console.log(
        '[PremiumPaywall] Attempting to present paywall with event listeners...'
      );
      setHasPresented(true);

      // Present the paywall immediately when visible
      const presentPaywall = async () => {
        try {
          posthog.capture('paywall_viewed', { source });

          const paywallResult = await RevenueCatUI.presentPaywall();
          console.log(
            '[PremiumPaywall] Paywall presentation result:',
            paywallResult
          );

          // Handle any immediate presentation errors
          if (paywallResult === RevenueCatUI.PAYWALL_RESULT.ERROR) {
            posthog.capture('purchase_failed', { source, method: 'paywall' });
            Alert.alert(
              'Error',
              'Unable to show subscription options. Please try again later.',
              [{ text: 'OK', onPress: onClose }]
            );
          } else if (
            paywallResult === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED
          ) {
            Alert.alert(
              'Configuration Error',
              'Unable to show paywall. Please ensure you have an active internet connection.',
              [{ text: 'OK', onPress: onClose }]
            );
          } else if (paywallResult === RevenueCatUI.PAYWALL_RESULT.CANCELLED) {
            posthog.capture('purchase_cancelled', {
              source,
              method: 'paywall',
            });
            console.log('[PremiumPaywall] User cancelled the paywall');
            onClose();
          } else if (
            paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
            paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
          ) {
            posthog.capture(
              paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
                ? 'restore_purchases_succeeded'
                : 'purchase_completed',
              { source, method: 'paywall' }
            );
            console.log(
              '[PremiumPaywall] Purchase/Restore successful:',
              paywallResult
            );

            // Refresh customer info to ensure we have the latest data
            try {
              await revenueCatService.refreshCustomerInfo();
              const hasAccess = await revenueCatService.hasPremiumAccess();
              console.log(
                '[PremiumPaywall] Premium access after purchase:',
                hasAccess
              );

              if (hasAccess) {
                showMessage({
                  message:
                    paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
                      ? 'Premium Access Restored!'
                      : 'Welcome to the emberglow Circle!',
                  description:
                    paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
                      ? 'Your premium features have been restored.'
                      : 'You now have access to all premium features.',
                  type: 'success',
                  duration: 3000,
                });

                // Sync premium status with server
                console.log(
                  '[PremiumPaywall] Syncing premium status with server...'
                );
                try {
                  const serverResponse = await refreshPremiumStatus();
                  console.log(
                    '[PremiumPaywall] Server sync response:',
                    serverResponse
                  );
                } catch (serverError) {
                  // Don't fail the purchase flow if server sync fails
                  console.error(
                    '[PremiumPaywall] Failed to sync with server:',
                    serverError
                  );
                  // The server will eventually sync via webhooks or next API call
                }
              }
            } catch (error) {
              console.error(
                '[PremiumPaywall] Error checking premium access after purchase:',
                error
              );
            }

            // Call success callback
            if (onSuccess) {
              onSuccess();
            }
            onClose();
          }
        } catch (error: any) {
          posthog.capture('purchase_failed', {
            source,
            method: 'paywall',
            error_code: error?.code ?? error?.message,
          });
          console.error('[PremiumPaywall] Error presenting paywall:', error);

          // In development, check for common issues
          if (__DEV__) {
            if (
              error.message?.includes('No offerings found') ||
              error.message?.includes('Bundle ID')
            ) {
              Alert.alert(
                'Development Configuration',
                'RevenueCat is not configured for this bundle ID. Using test mode.',
                [
                  {
                    text: 'Simulate Purchase',
                    onPress: async () => {
                      // Enable test mode
                      revenueCatService.enableTestMode();

                      showMessage({
                        message: 'Test Purchase Successful!',
                        description: 'Premium features unlocked (test mode).',
                        type: 'success',
                        duration: 3000,
                      });

                      if (onSuccess) {
                        onSuccess();
                      }
                      onClose();
                    },
                  },
                  { text: 'Cancel', onPress: onClose },
                ]
              );
              return;
            }
          }

          Alert.alert(
            'Error',
            'Unable to show subscription options. Please try again later.',
            [{ text: 'OK', onPress: onClose }]
          );
        }
      };

      presentPaywall();
    }
  }, [isVisible, hasPresented, onClose, onSuccess, posthog, source]);

  // This component doesn't render anything visible
  return null;
}
