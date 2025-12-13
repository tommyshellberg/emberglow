import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { forwardRef } from 'react';
import { Pressable } from 'react-native';

import { Button, Modal, Text, View } from '@/components/ui';
import { useSettingsStore } from '@/store/settings-store';

export const SkillTreeAnnouncementModal = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const router = useRouter();
    const posthog = usePostHog();
    const setHasSeenSkillTreeAnnouncement = useSettingsStore(
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
      <Modal
        ref={ref}
        snapPoints={['60%']}
        title="New: Skill Trees"
        onChange={handleModalChange}
        backgroundStyle={{ backgroundColor: '#2c456b' }}
      >
        <View className="px-4 pb-6">
          {/* Icon */}
          <View className="mb-4 items-center">
            <Text className="text-4xl">✨</Text>
          </View>

          {/* Main Message */}
          <Text className="mb-2 text-center text-2xl font-bold text-cream-500">
            Unlock Your First Perk
          </Text>

          <Text className="mb-6 text-center text-sm text-cream-500">
            You've leveled up enough to unlock powerful perks that enhance your
            quest experience. Choose your path and grow stronger!
          </Text>

          {/* What are Perks? */}
          <View className="mb-6 rounded-lg border border-primary-300 bg-primary-500/10 p-4">
            <Text className="mb-2 text-base font-bold text-cream-500">
              What are Perks?
            </Text>
            <Text className="text-sm text-cream-300">
              ✓ Boost your XP gains
            </Text>
            <Text className="text-sm text-cream-300">
              ✓ Unlock special abilities
            </Text>
            <Text className="text-sm text-cream-300">
              ✓ Customize your playstyle
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <Button
              label="Explore Skill Tree"
              onPress={handleExplore}
              className="bg-primary-400"
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
