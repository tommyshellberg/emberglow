import { format } from 'date-fns';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/emberglow';
import { CompactRewardBreakdown } from '@/features/quest-result/components';
import { useCustomQuestStory } from '@/hooks/useCustomQuestStory';
import { calculatePerkBonuses } from '@/lib/perks';
import {
  getCurrentUserAdjustedXP,
  getCurrentUserRewards,
} from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';
import { colors, spacing } from '@/theme';

import { QuestCompleteActions } from './quest-complete/QuestCompleteActions';
import { QuestCompleteHeader } from './quest-complete/QuestCompleteHeader';
import { QuestCompleteStory } from './quest-complete/QuestCompleteStory';
import type { QuestCompleteProps } from './quest-complete/types';

export function QuestComplete({
  quest,
  story,
  fromJournal = false,
  hasReflection = false,
  onBack,
  onContinue,
  continueText = 'Continue',
  showActionButton = true,
  disableEnteringAnimations = false,
}: QuestCompleteProps) {
  const customStory = useCustomQuestStory(quest);
  const displayStory = customStory || story;
  const currentUserId = useUserStore((state) => state.user?.id);

  const adjustedXP = getCurrentUserAdjustedXP(quest, currentUserId);

  // Get reward breakdown data if perks were applied
  const rewardsData = getCurrentUserRewards(quest, currentUserId);
  const perksWithBonuses = rewardsData
    ? calculatePerkBonuses(
        rewardsData.baseXP,
        rewardsData.adjustedXP,
        rewardsData.perksApplied
      )
    : [];

  const questDate = quest.stopTime
    ? format(quest.stopTime, 'MMM d, yyyy')
    : null;

  // The back disc falls back to onContinue (matching the mockup's own
  // onClick={onContinue} on the art header's back arrow, quest-flow.jsx:125).
  // Neither is ever actually omitted by a real call site today (both
  // quest/[id].tsx and first-quest-result.tsx always provide one), so the
  // final no-op is just a type-safe fallback.
  const handleBack = onBack ?? onContinue ?? (() => undefined);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <QuestCompleteHeader
          quest={quest}
          fromJournal={fromJournal}
          onBack={handleBack}
          disableAnimations={disableEnteringAnimations}
        />

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <Badge tone="warm">{`+${adjustedXP} XP`}</Badge>
            <Badge tone="neutral">{`${quest.durationMinutes} min offline`}</Badge>
            {questDate && <Badge tone="neutral">{questDate}</Badge>}
            {!fromJournal && <Badge tone="success">Complete</Badge>}
          </View>

          <QuestCompleteStory
            story={displayStory}
            quest={quest}
            disableAnimations={disableEnteringAnimations}
          />

          {/* Compact reward breakdown - after story, before actions */}
          {rewardsData && perksWithBonuses.length > 0 && (
            <View style={styles.rewardSection}>
              <CompactRewardBreakdown
                baseXP={rewardsData.baseXP}
                adjustedXP={rewardsData.adjustedXP}
                perksApplied={perksWithBonuses}
              />
            </View>
          )}

          {showActionButton && (
            <View style={styles.actionsSection}>
              <QuestCompleteActions
                quest={quest}
                fromJournal={fromJournal}
                hasReflection={hasReflection}
                onContinue={onContinue}
                continueText={continueText}
                disableAnimations={disableEnteringAnimations}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  rewardSection: {
    marginTop: spacing[3],
    width: '100%',
  },
  actionsSection: {
    marginTop: spacing[5],
  },
});

// Re-export types for convenience
export type { QuestCompleteProps } from './quest-complete/types';
