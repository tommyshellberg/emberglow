import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/emberglow';
import { GuildIcon } from '@/features/guilds/components/guild-icon';
import { useAnnouncementStore } from '@/store/announcement-store';
import { colors, fontFamily, palette, radii, spacing } from '@/theme';

const SAMPLE_MEMBERS = [
  {
    initials: 'JM',
    background: colors.accent.primary,
    color: colors.text.onAccent,
  },
  { initials: 'SK', background: palette.sandy, color: palette.richBlack },
  { initials: 'AL', background: palette.aegean, color: colors.text.primary },
  {
    initials: '+2',
    background: colors.fill.subtle,
    color: colors.text.primary,
  },
];

/** Sample guild preview to show users what a guild looks like. */
function GuildPreviewCard() {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <GuildIcon icon="flame" size={28} showBackground />
        <View style={styles.previewInfo}>
          <Text style={styles.previewName}>Morning Runners</Text>
          <Text style={styles.previewTagline}>"Rise and grind together"</Text>
        </View>
      </View>

      <View style={styles.membersRow}>
        <View style={styles.avatarStack}>
          {SAMPLE_MEMBERS.map((member, index) => (
            <View
              key={member.initials}
              style={[
                styles.avatar,
                index > 0 && styles.avatarOverlap,
                { backgroundColor: member.background },
              ]}
            >
              <Text style={[styles.avatarText, { color: member.color }]}>
                {member.initials}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.membersCount}>5 members</Text>
      </View>
    </View>
  );
}

export const GuildsAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const router = useRouter();
    const posthog = usePostHog();
    const setHasSeenGuildsAnnouncement = useAnnouncementStore(
      (state) => state.setHasSeenGuildsAnnouncement
    );

    const handleModalChange = (index: number) => {
      if (index >= 0) {
        posthog.capture('guilds_announcement_viewed');
      }
    };

    const handleCreateGuild = () => {
      posthog.capture('guilds_announcement_accepted');
      setHasSeenGuildsAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
      router.push('/guild/create' as any);
    };

    const handleDismiss = () => {
      posthog.capture('guilds_announcement_declined');
      setHasSeenGuildsAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
    };

    return (
      <BottomSheet ref={ref} title="New: Guilds" onChange={handleModalChange}>
        <View style={styles.previewWrapper}>
          <GuildPreviewCard />
        </View>

        <Text style={styles.heading}>Quest Together</Text>

        <Text style={styles.body}>
          Create a guild with friends or coworkers. Keep each other accountable
          and maintain a shared streak.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Create a Guild"
            onPress={handleCreateGuild}
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
  previewWrapper: {
    marginBottom: spacing[5],
  },
  previewCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.primary,
  },
  previewTagline: {
    fontFamily: fontFamily.regular,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing[1] / 2,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.raised,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  membersCount: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing[3],
  },
  heading: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  actions: {
    gap: spacing[3],
  },
});
