import { Share2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Share, StyleSheet } from 'react-native';

import { Button } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import { posthogClient } from '@/lib/posthog';
import { getInviteLink } from '@/lib/services/invite-link';
import { colors, fontFamily, spacing } from '@/theme';

export function InviteLinkButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setIsLoading(true);
    try {
      const inviteLink = await getInviteLink();
      const sharedUrl = `${inviteLink.url}?src=profile`;
      const message = `Join me on Emberglow! ${sharedUrl}`;

      const result = await Share.share({
        message,
      });

      // Only capture if the user actually shared (not dismissed)
      if (result.action === Share.sharedAction) {
        posthogClient.capture('invite_link_shared', { src: 'profile' });
      }
    } catch (error) {
      // Silently ignore errors (network failure, etc.)
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Button
      testID="invite-link-button"
      variant="outline"
      fullWidth
      onPress={handlePress}
      disabled={isLoading}
      accessibilityLabel="Invite friend via link"
      accessibilityHint="Share your invite link with a friend"
    >
      <View style={styles.buttonContent}>
        <Share2 size={15} color={colors.text.primary} />
        <Text style={styles.buttonLabel}>Invite a friend</Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  buttonLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
});
