import { usePostHog } from 'posthog-react-native';
import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { Button } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import { claimInvite } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';
import { colors, fontFamily, radii, spacing } from '@/theme';

/**
 * Invitee-side confirm prompt. Self-hides: renders nothing until
 * `checkInviteMatch` (first launch) or the universal-link route (Task 13)
 * populates `pendingInvite` in the invite store, so it's safe to mount
 * unconditionally on the home screen.
 */
export function InviteConfirmModal() {
  const pendingInvite = useInviteStore((state) => state.pendingInvite);
  const clearPendingInvite = useInviteStore(
    (state) => state.clearPendingInvite
  );
  const posthog = usePostHog();

  if (!pendingInvite) {
    return null;
  }

  const handleConfirm = async () => {
    const { code } = pendingInvite;
    try {
      await claimInvite(code);
      posthog.capture('invite_confirm_accepted');
    } catch {
      // 404 (inviter account gone), network failure, or already-claimed —
      // none of these are actionable by the user, so we clear the pending
      // invite either way and surface a neutral toast rather than the raw
      // error.
      showMessage({
        message: "Couldn't connect right now",
        description: 'Please try again later.',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      clearPendingInvite();
    }
  };

  const handleDismiss = () => {
    posthog.capture('invite_confirm_dismissed');
    clearPendingInvite();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.headline}>
            {`${pendingInvite.inviterName} invited you to Emberglow — connect with them?`}
          </Text>

          <View style={styles.actions}>
            <Button
              testID="invite-confirm-accept"
              label="Connect"
              variant="primary"
              onPress={handleConfirm}
              fullWidth
            />
            <Button
              testID="invite-confirm-dismiss"
              label="Not now"
              variant="ghost"
              onPress={handleDismiss}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    padding: spacing[5],
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  actions: {
    gap: spacing[3],
  },
});
