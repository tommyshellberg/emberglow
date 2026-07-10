import { Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  useRespecSkillTree,
  useSkillTree,
  useUnlockPerk,
} from '@/api/skill-tree';
import type { Perk } from '@/api/skill-tree/types';
import { Button, EyebrowLabel } from '@/components/emberglow';
import { PremiumPaywall } from '@/components/paywall';
import { Chip } from '@/components/ui/chip';
import { usePremiumAccess } from '@/lib/hooks/use-premium-access';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

import { ChoiceNodeModal } from './choice-node-modal';
import { getPerkStatus, PerkCard, type PerkStatus } from './perk-card';
import { UnlockCelebrationModal } from './unlock-celebration-modal';

type FilterType = 'all' | 'unlocked' | 'locked' | 'available';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'unlocked', label: 'Unlocked' },
  { key: 'locked', label: 'Locked' },
];

/** available < unlocked < locked, for the "all" filter's priority sort. */
const STATUS_PRIORITY: Record<PerkStatus, number> = {
  available: 0,
  unlocked: 1,
  locked: 2,
};

/**
 * Emberglow palette hex, hardcoded here since `Chip` (`@/components/ui/chip`)
 * only accepts NativeWind classNames, not `@/theme`'s JS style tokens — see
 * plan ground rule 4 ("Filter chips → keep Chip, retint from theme").
 */
const CHIP_TINTS: Record<FilterType, { active: string; activeText: string }> = {
  all: {
    active: 'border border-[rgba(217,73,40,0.5)] bg-[rgba(217,73,40,0.18)]',
    activeText: 'text-[#e16d53]',
  },
  available: {
    active: 'border border-[rgba(217,73,40,0.5)] bg-[rgba(217,73,40,0.18)]',
    activeText: 'text-[#e16d53]',
  },
  unlocked: {
    active: 'border border-[rgba(125,168,123,0.5)] bg-[rgba(125,168,123,0.18)]',
    activeText: 'text-[#9dc39b]',
  },
  locked: {
    active: 'border border-[rgba(232,220,199,0.3)] bg-[rgba(232,220,199,0.1)]',
    activeText: 'text-[rgba(232,220,199,0.7)]',
  },
};
const CHIP_INACTIVE_BG = 'bg-[rgba(232,220,199,0.06)]';
const CHIP_INACTIVE_TEXT = 'text-[rgba(232,220,199,0.45)]';

export function SkillTreeScreen() {
  const { data, isLoading, isError } = useSkillTree();
  const { mutate: unlockPerk, isPending: isUnlocking } = useUnlockPerk();
  const { mutate: respecSkillTree, isPending: isRespecing } =
    useRespecSkillTree();
  const {
    requirePremium,
    showPaywall,
    handlePaywallClose,
    handlePaywallSuccess,
  } = usePremiumAccess();
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
      <View testID="skill-tree-loading" style={styles.centered}>
        <ActivityIndicator size="large" color={palette.cinnabar} />
        <Text style={styles.loadingText}>Loading skill tree...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centered, styles.errorContainer]}>
        <Text style={styles.errorTitle}>Error loading skill tree</Text>
        <Text style={styles.errorSubtitle}>Please try again later</Text>
      </View>
    );
  }

  const filterPerks = (perks: Perk[]): Perk[] => {
    let filtered: Perk[];

    switch (filter) {
      case 'unlocked':
      case 'locked':
      case 'available':
        filtered = perks.filter(
          (p) => getPerkStatus(p, data.currentLevel) === filter
        );
        break;
      default:
        filtered = perks;
    }

    // Sort perks when showing 'all' to prioritize available ones
    if (filter === 'all') {
      return [...filtered].sort((a, b) => {
        const priorityDiff =
          STATUS_PRIORITY[getPerkStatus(a, data.currentLevel)] -
          STATUS_PRIORITY[getPerkStatus(b, data.currentLevel)];
        if (priorityDiff !== 0) return priorityDiff;

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
          // Find the unlocked perk - server returns the selected child perk (choiceId), not the parent
          const unlockedPerk = response.updatedSkillTree.availablePerks.find(
            (p) => p.id === choiceId
          );
          if (unlockedPerk) {
            setCelebratedPerk(unlockedPerk);
          }
        },
        onError: (error) => {
          setSelectedChoicePerk(null);
          Alert.alert(
            'Unlock Failed',
            error.message || 'Failed to unlock perk. Please try again.'
          );
        },
      }
    );
  };

  const handleResetSkills = () => {
    requirePremium(() => {
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
                    error.message ||
                      'Failed to reset skill tree. Please try again.'
                  );
                },
              });
            },
          },
        ]
      );
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        testID="skill-tree-scroll-view"
        style={styles.root}
        showsVerticalScrollIndicator={false}
      >
        {/* Character Info & Progress */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.headerBlock}
        >
          {/* Character & Level */}
          <View style={styles.characterRow}>
            <View style={styles.characterIcon}>
              <Sparkles size={24} color={palette.sandy} />
            </View>
            <EyebrowLabel tone="warm">
              {formatCharacterType(data.characterType)} • Level{' '}
              {data.currentLevel}
            </EyebrowLabel>
          </View>

          {/* Progress Info */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {unlockedCount} of {totalCount} unlocked
            </Text>
            <Button
              label="Reset Skills"
              variant="outline"
              size="sm"
              onPress={handleResetSkills}
              disabled={isRespecing}
              testID="reset-skills-button"
            />
          </View>
        </Animated.View>

        {/* Filter Chips */}
        <Animated.View
          entering={FadeIn.delay(200).duration(400)}
          style={styles.filterRow}
        >
          {FILTERS.map(({ key, label }) => {
            const isActive = filter === key;
            const tint = CHIP_TINTS[key];
            return (
              <Chip
                key={key}
                className={isActive ? tint.active : CHIP_INACTIVE_BG}
                textClassName={isActive ? tint.activeText : CHIP_INACTIVE_TEXT}
                onPress={() => setFilter(key)}
              >
                {label}
              </Chip>
            );
          })}
        </Animated.View>

        {/* Perks List */}
        <View style={styles.perksList}>
          {filteredPerks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No perks in this category
              </Text>
            </View>
          ) : (
            filteredPerks.map((perk) => (
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
          isLoading={isUnlocking}
        />
      )}

      {/* Unlock Celebration Modal */}
      <UnlockCelebrationModal
        perk={celebratedPerk}
        visible={!!celebratedPerk}
        onClose={() => setCelebratedPerk(null)}
      />

      {/* Premium Paywall */}
      <PremiumPaywall
        isVisible={showPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.app,
  },
  loadingText: {
    marginTop: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    paddingHorizontal: spacing[6],
  },
  errorTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.status.danger,
    textAlign: 'center',
  },
  errorSubtitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  headerBlock: {
    marginBottom: spacing[4],
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  characterIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.cinnabar, 0.2),
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[3],
  },
  progressText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.primary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  perksList: {
    marginBottom: spacing[6],
  },
  emptyState: {
    marginTop: spacing[8],
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
