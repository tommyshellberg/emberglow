import { router } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';

import { signOut } from '@/lib';
import { revenueCatService } from '@/lib/services/revenuecat-service';
import { deleteUserAccount } from '@/lib/services/user';

// Handle manage subscription
export const handleManageSubscription = async (
  setIsLoading: (isLoading: boolean) => void
) => {
  try {
    const managementUrl = await revenueCatService.getManagementURL();
    if (managementUrl) {
      Linking.openURL(managementUrl);
    } else {
      // Fallback to platform-specific subscription management
      if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    }
  } catch (error) {
    console.error('Error opening subscription management:', error);
    Alert.alert(
      'Error',
      'Unable to open subscription management. Please try again later.'
    );
  }
};

export const handleDeleteAccount = (
  setIsLoading: (isLoading: boolean) => void
) => {
  Alert.alert(
    'Delete Account',
    'Are you sure you want to delete your account? Your account will be made inactive and your personal data will be anonymized. This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'View Terms',
        onPress: () => Linking.openURL('https://unquestapp.com/terms'),
      },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          try {
            // Show loading indicator
            setIsLoading(true);

            // Call API to delete the account
            await deleteUserAccount();

            // On success, show confirmation and logout
            Alert.alert(
              'Account Scheduled for Deletion',
              'Your account has been scheduled for deletion. You will now be logged out.',
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    // Log the user out and redirect to login screen
                    await signOut();
                    router.replace('/login');
                  },
                },
              ]
            );
          } catch (error) {
            // On error, show error message
            setIsLoading(false);

            let errorMessage = 'An unexpected error occurred.';
            if (error instanceof Error) {
              errorMessage = error.message;
            }

            Alert.alert(
              'Account Deletion Failed',
              `We couldn't process your deletion request automatically. Please contact hello@unquestapp.com or visit unquestapp.com/contact for assistance with manual account deletion.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Email Support',
                  onPress: () =>
                    Linking.openURL(
                      'mailto:hello@unquestapp.com?subject=Account%20Deletion%20Request'
                    ),
                },
                {
                  text: 'Visit Website',
                  onPress: () =>
                    Linking.openURL('https://unquestapp.com/contact'),
                },
              ]
            );
          }
        },
      },
    ],
    { cancelable: true }
  );
};
