import { useRouter } from 'expo-router';
import React from 'react';

import { SkillTreeScreen } from '@/components/skill-tree';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  View,
} from '@/components/ui';

export default function SkillTreePage() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <ScreenContainer>
        <ScreenHeader
          title="Skill Tree"
          subtitle="Unlock perks to enhance your abilities"
          showBackButton
          onBackPress={() => router.push('/profile')}
        />

        <SkillTreeScreen />
      </ScreenContainer>
    </View>
  );
}
