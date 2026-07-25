import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/emberglow';
import { useAnnouncementStore } from '@/store/announcement-store';
import { colors, fontFamily, radii, spacing } from '@/theme';

const PERK_BENEFITS = [
  'Boost your XP gains',
  'Unlock special abilities',
  'Customize your playstyle',
];

export const SkillTreeAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const router = useRouter();
    const posthog = usePostHog();
    const setHasSeenSkillTreeAnnouncement = useAnnouncementStore(
      (state) => state.setHasSeenSkillTreeAnnouncement
    );

    const handleModalChange = (index: number) => {
      if (index >= 0) {
        posthog.capture('skill_tree_announcement_viewed');
      }
    };

    const handleExplore = () => {
      posthog.capture('skill_tree_announcement_accepted');
      setHasSeenSkillTreeAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
      router.push('/skill-tree' as any);
    };

    const handleDismiss = () => {
      posthog.capture('skill_tree_announcement_declined');
      setHasSeenSkillTreeAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
    };

    return (
      <BottomSheet
        ref={ref}
        title="New: Skill Trees"
        onChange={handleModalChange}
      >
        <Text style={styles.heading}>Unlock Your First Perk</Text>

        <Text style={styles.body}>
          You've leveled up enough to unlock powerful perks that enhance your
          quest experience. Choose your path and grow stronger!
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What are Perks?</Text>
          {PERK_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Check size={16} color={colors.text.accent} strokeWidth={2.5} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Explore Skill Tree"
            onPress={handleExplore}
            fullWidth
          />
          <Button
            label="Maybe Later"
            variant="ghost"
            onPress={handleDismiss}
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
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text.primary,
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
