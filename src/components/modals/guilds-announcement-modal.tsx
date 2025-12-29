import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';
import { Pressable } from 'react-native';

import { Button, Card, Modal, Text, View } from '@/components/ui';
import { GuildIcon } from '@/features/guilds/components/guild-icon';
import { useSettingsStore } from '@/store/settings-store';

/**
 * Sample guild preview to show users what a guild looks like
 */
function GuildPreviewCard() {
  return (
    <Card className="border-guild-300/30 bg-guild-500/40 rounded-2xl border p-4">
      <View className="flex-row items-center">
        {/* Guild Icon */}
        <View className="mr-3">
          <GuildIcon icon="flame" size={28} showBackground />
        </View>

        {/* Guild Info */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-cream-500">
            Morning Runners
          </Text>
          <Text className="mt-0.5 text-sm italic text-cream-300">
            "Rise and grind together"
          </Text>
        </View>
      </View>

      {/* Member Avatars */}
      <View className="mt-3 flex-row items-center">
        <View className="flex-row -space-x-2">
          {/* Overlapping avatar circles */}
          <View className="border-guild-500 size-8 items-center justify-center rounded-full border-2 bg-primary-400">
            <Text className="text-xs font-bold text-white">JM</Text>
          </View>
          <View className="border-guild-500 bg-guild-300 size-8 items-center justify-center rounded-full border-2">
            <Text className="text-xs font-bold text-richBlack-500">SK</Text>
          </View>
          <View className="border-guild-500 size-8 items-center justify-center rounded-full border-2 bg-secondary-400">
            <Text className="text-xs font-bold text-white">AL</Text>
          </View>
          <View className="border-guild-500 size-8 items-center justify-center rounded-full border-2 bg-neutral-400">
            <Text className="text-xs font-bold text-white">+2</Text>
          </View>
        </View>
        <Text className="ml-3 text-sm text-cream-300">5 members</Text>
      </View>
    </Card>
  );
}

export const GuildsAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const router = useRouter();
    const posthog = usePostHog();
    const setHasSeenGuildsAnnouncement = useSettingsStore(
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
      // Navigate to the create guild screen
      router.push('/guild/create');
    };

    const handleDismiss = () => {
      posthog.capture('guilds_announcement_declined');
      setHasSeenGuildsAnnouncement(true);
      // @ts-ignore - ref might be null but we check before calling
      ref?.current?.dismiss();
    };

    return (
      <Modal
        ref={ref}
        snapPoints={['55%']}
        title="New: Guilds"
        onChange={handleModalChange}
        backgroundStyle={{ backgroundColor: '#2c456b' }}
      >
        <View className="px-4 pb-6">
          {/* Guild Preview Card */}
          <View className="mb-5">
            <GuildPreviewCard />
          </View>

          {/* Main Message - Left aligned */}
          <Text className="mb-2 text-xl font-bold text-cream-500">
            Quest Together
          </Text>

          <Text className="mb-6 text-base leading-relaxed text-cream-300">
            Create a guild with friends or coworkers. Keep each other
            accountable and maintain a shared streak.
          </Text>

          {/* Action Buttons - Centered */}
          <View className="space-y-3">
            <Button
              label="Create a Guild"
              onPress={handleCreateGuild}
              className="bg-guild-300"
              textClassName="text-richBlack-500 font-semibold"
            />

            <Pressable onPress={handleDismiss} className="py-3">
              <Text className="text-center text-cream-500">Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
);
