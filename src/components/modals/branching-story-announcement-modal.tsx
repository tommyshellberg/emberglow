import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useResetStoryline } from '@/api/quest';
import { BottomSheet, Button } from '@/components/emberglow';
import { useAnnouncementStore } from '@/store/announcement-store';
import { colors, fontFamily, radii, spacing } from '@/theme';

const RESET_BENEFITS = [
  'Keep your level and XP',
  'Keep your streaks and stats',
  'Keep all achievements',
];

export const BranchingStoryAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const posthog = usePostHog();
    const setHasSeenBranchingAnnouncement = useAnnouncementStore(
      (state) => state.setHasSeenBranchingAnnouncement
    );
    const resetStorylineMutation = useResetStoryline();
    const [isResetting, setIsResetting] = useState(false);

    const handleModalChange = (index: number) => {
      // Track when modal is presented (index >= 0)
      if (index >= 0) {
        posthog.capture('branching_announcement_viewed');
      }
    };

    const handleRestart = async () => {
      setIsResetting(true);
      posthog.capture('branching_announcement_accepted');

      try {
        await resetStorylineMutation.mutateAsync({ storylineId: 'vaedros' });

        // Track successful storyline reset
        posthog.capture('storyline_reset_success', {
          storyline_id: 'vaedros',
          source: 'branching_announcement_modal',
        });

        setHasSeenBranchingAnnouncement(true);
        // @ts-ignore - ref might be null but we check before calling
        ref?.current?.dismiss();
      } catch (error) {
        console.error('Error resetting storyline:', error);

        // Track failed storyline reset
        posthog.capture('storyline_reset_failed', {
          storyline_id: 'vaedros',
          source: 'branching_announcement_modal',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Still close the modal and mark as seen even if reset fails
        setHasSeenBranchingAnnouncement(true);
        // @ts-ignore - ref might be null but we check before calling
        ref?.current?.dismiss();
      } finally {
        setIsResetting(false);
      }
    };

    const handleContinue = () => {
      posthog.capture('branching_announcement_declined');
      setHasSeenBranchingAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
    };

    return (
      <BottomSheet
        ref={ref}
        title="Branching Storylines"
        onChange={handleModalChange}
      >
        <Text style={styles.heading}>Your Story Just Got Deadlier</Text>

        <Text style={styles.body}>
          unQuest now features branching storylines with real consequences. Some
          choices lead to victory, others... to death.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Experience the storylines from the beginning
          </Text>
          <Text style={styles.infoBody}>
            Restart at the first branching point. You'll keep all your
            achievements, stats, streaks, and XP. Only story progress resets.
          </Text>
          {RESET_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Check size={16} color={colors.text.accent} strokeWidth={2.5} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            testID="branching-announcement-restart"
            label={isResetting ? 'Resetting...' : 'Restart at Branching Point'}
            onPress={handleRestart}
            disabled={isResetting}
            fullWidth
          />
          <Button
            testID="branching-announcement-continue"
            label="Continue Current Journey"
            variant="ghost"
            onPress={handleContinue}
            disabled={isResetting}
            fullWidth
          />
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  heading: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  infoCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
    gap: spacing[2],
  },
  infoTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  infoBody: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  benefitText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },
  actions: {
    gap: spacing[3],
  },
});
