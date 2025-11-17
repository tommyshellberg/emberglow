import { Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  useRespecSkillTree,
  useSkillTree,
  useUnlockPerk,
} from '@/api/skill-tree';
import type { Perk } from '@/api/skill-tree/types';
import { Button, Text } from '@/components/ui';
import { Chip } from '@/components/ui/chip';
import { useSkillTreeStore } from '@/store/skill-tree-store';

import { ChoiceNodeModal } from './choice-node-modal';
import { PerkCard } from './perk-card';
import { UnlockCelebrationModal } from './unlock-celebration-modal';

type FilterType = 'all' | 'unlocked' | 'locked' | 'available';

export function SkillTreeScreen() {
  const { data, isLoading, isError } = useSkillTree();
  const { mutate: unlockPerk, isPending: isUnlocking } = useUnlockPerk();
  const { mutate: respecSkillTree, isPending: isRespecing } =
    useRespecSkillTree();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedChoicePerk, setSelectedChoicePerk] = useState<Perk | null>(
    null
  );
  const [celebratedPerk, setCelebratedPerk] = useState<Perk | null>(null);

  // Update store when data changes
  React.useEffect(() => {
    if (data) {
      useSkillTreeStore.getState().setSkillTreeData(data);
    }
  }, [data]);

  if (isLoading) {
    return (
      <View
        testID="skill-tree-loading"
        className="flex-1 items-center justify-center bg-background"
      >
        <ActivityIndicator size="large" color="#E55838" />
        <Text className="mt-4 text-cream-500">Loading skill tree...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-lg text-red-300">
          Error loading skill tree
        </Text>
        <Text className="mt-2 text-center text-sm text-cream-500/60">
          Please try again later
        </Text>
      </View>
    );
  }

  const filterPerks = (perks: Perk[]): Perk[] => {
    let filtered: Perk[];

    switch (filter) {
      case 'unlocked':
        filtered = perks.filter((p) => p.isUnlocked);
        break;
      case 'locked':
        filtered = perks.filter(
          (p) => !p.isUnlocked && p.levelRequired > data.currentLevel
        );
        break;
      case 'available':
        filtered = perks.filter(
          (p) => !p.isUnlocked && p.levelRequired <= data.currentLevel
        );
        break;
      default:
        filtered = perks;
    }

    // Sort perks when showing 'all' to prioritize available ones
    if (filter === 'all') {
      return filtered.sort((a, b) => {
        const aAvailable = !a.isUnlocked && a.levelRequired <= data.currentLevel;
        const bAvailable = !b.isUnlocked && b.levelRequired <= data.currentLevel;
        const aLocked = !a.isUnlocked && a.levelRequired > data.currentLevel;
        const bLocked = !b.isUnlocked && b.levelRequired > data.currentLevel;

        // Priority: available > unlocked > locked
        if (aAvailable && !bAvailable) return -1;
        if (!aAvailable && bAvailable) return 1;
        if (a.isUnlocked && !b.isUnlocked && !bAvailable) return -1;
        if (!a.isUnlocked && !aAvailable && b.isUnlocked) return 1;
        if (aLocked && !bLocked) return 1;
        if (!aLocked && bLocked) return -1;

        // Within same category, sort by level required (ascending)
        return a.levelRequired - b.levelRequired;
      });
    }

    return filtered;
  };

  const filteredPerks = filterPerks(data.availablePerks);
  const unlockedCount = data.availablePerks.filter((p) => p.isUnlocked).length;
  const totalCount = data.availablePerks.length;

  const formatCharacterType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleUnlockPerk = (perkId: string) => {
    const perk = data.availablePerks.find((p) => p.id === perkId);
    if (!perk) return;

    if (perk.isChoice) {
      // Open choice modal
      setSelectedChoicePerk(perk);
    } else {
      // Unlock directly and show celebration
      unlockPerk(
        { nodeId: perkId },
        {
          onSuccess: (response) => {
            // Find the unlocked perk from the updated data
            const unlockedPerk = response.updatedSkillTree.availablePerks.find(
              (p) => p.id === perkId
            );
            if (unlockedPerk) {
              setCelebratedPerk(unlockedPerk);
            }
          },
        }
      );
    }
  };

  const handleChoiceSelected = (perkId: string, choiceId: string) => {
    unlockPerk(
      { nodeId: perkId, choice: choiceId },
      {
        onSuccess: (response) => {
          setSelectedChoicePerk(null);
          // Find the unlocked perk from the updated data
          const unlockedPerk = response.updatedSkillTree.availablePerks.find(
            (p) => p.id === perkId
          );
          if (unlockedPerk) {
            setCelebratedPerk(unlockedPerk);
          }
        },
      }
    );
  };

  const handleResetSkills = () => {
    Alert.alert(
      'Reset Skill Tree',
      'Are you sure you want to reset all your skills? This will refund your skill points but cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            respecSkillTree(undefined, {
              onSuccess: (response) => {
                Alert.alert(
                  'Skills Reset',
                  response.message ||
                    'Your skill tree has been reset successfully.'
                );
              },
              onError: (error) => {
                Alert.alert(
                  'Reset Failed',
                  error.message || 'Failed to reset skill tree. Please try again.'
                );
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1">
      <ScrollView
        testID="skill-tree-scroll-view"
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Character Info & Progress */}
        <Animated.View entering={FadeIn.duration(400)} className="mb-4">
          {/* Character & Level */}
          <View className="mb-3 flex-row items-center">
            <View className="mr-3 rounded-full bg-primary-400/20 p-2">
              <Sparkles size={24} color="#E55838" />
            </View>
            <Text className="text-sm text-cream-500/60">
              {formatCharacterType(data.characterType)} • Level{' '}
              {data.currentLevel}
            </Text>
          </View>

          {/* Progress Info */}
          <View className="flex-row items-center justify-between rounded-lg bg-cardBackground/50 p-3">
            <Text className="text-sm text-cream-500">
              {unlockedCount} of {totalCount} unlocked
            </Text>
            {data.canRespec && (
              <Button
                label="Reset Skills"
                variant="outline"
                size="sm"
                onPress={handleResetSkills}
                disabled={isRespecing}
                className="border-primary-400/50"
                textClassName="text-primary-400"
                testID="reset-skills-button"
              />
            )}
          </View>
        </Animated.View>

        {/* Filter Chips */}
        <Animated.View
          entering={FadeIn.delay(200).duration(400)}
          className="mb-4 flex-row flex-wrap gap-2"
        >
          <Chip
            className={
              filter === 'all'
                ? 'bg-primary-400/30 border border-primary-400'
                : 'bg-neutral-400/20'
            }
            textClassName={filter === 'all' ? 'text-primary-400' : 'text-cream-500/60'}
            onPress={() => setFilter('all')}
          >
            All
          </Chip>
          <Chip
            className={
              filter === 'available'
                ? 'bg-primary-400/30 border border-primary-400'
                : 'bg-neutral-400/20'
            }
            textClassName={
              filter === 'available' ? 'text-primary-400' : 'text-cream-500/60'
            }
            onPress={() => setFilter('available')}
          >
            Available
          </Chip>
          <Chip
            className={
              filter === 'unlocked'
                ? 'bg-secondary-300/30 border border-secondary-300'
                : 'bg-neutral-400/20'
            }
            textClassName={
              filter === 'unlocked' ? 'text-secondary-300' : 'text-cream-500/60'
            }
            onPress={() => setFilter('unlocked')}
          >
            Unlocked
          </Chip>
          <Chip
            className={
              filter === 'locked'
                ? 'bg-neutral-400/30 border border-neutral-400'
                : 'bg-neutral-400/20'
            }
            textClassName={
              filter === 'locked' ? 'text-neutral-200' : 'text-cream-500/60'
            }
            onPress={() => setFilter('locked')}
          >
            Locked
          </Chip>
        </Animated.View>

        {/* Perks List */}
        <View className="mb-6">
          {filteredPerks.length === 0 ? (
            <View className="mt-8 items-center">
              <Text className="text-center text-cream-500/60">
                No perks in this category
              </Text>
            </View>
          ) : (
            filteredPerks.map((perk, index) => (
              <PerkCard
                key={perk.id}
                perk={perk}
                currentLevel={data.currentLevel}
                onUnlock={handleUnlockPerk}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Choice Modal */}
      {selectedChoicePerk && (
        <ChoiceNodeModal
          perk={selectedChoicePerk}
          onClose={() => setSelectedChoicePerk(null)}
          onSelectChoice={(choiceId) =>
            handleChoiceSelected(selectedChoicePerk.id, choiceId)
          }
        />
      )}

      {/* Unlock Celebration Modal */}
      <UnlockCelebrationModal
        perk={celebratedPerk}
        visible={!!celebratedPerk}
        onClose={() => setCelebratedPerk(null)}
      />
    </View>
  );
}
