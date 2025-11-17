import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Notebook } from 'lucide-react-native';
import React from 'react';

import { Text, TouchableOpacity, View } from '@/components/ui';
import { Chip } from '@/components/ui/chip';
import colors from '@/components/ui/colors';
import { getCurrentUserAdjustedXP } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';

import type {
  FilterType,
  StatusFilter,
  TransformedQuest,
} from '@/features/journal/types/journal-types';
import { formatDuration } from '@/features/journal/utils/journal-utils';

interface FilterChipsProps {
  filter: FilterType;
  statusFilter: StatusFilter;
  onFilterChange: (filter: FilterType) => void;
  onStatusFilterChange: (statusFilter: StatusFilter) => void;
}

export function FilterChips({
  filter,
  statusFilter,
  onFilterChange,
  onStatusFilterChange,
}: FilterChipsProps) {
  return (
    <>
      {/* Mode Filters */}
      <View className="flex-row px-4 pb-2">
        <Chip
          className={`mr-2 ${filter === 'all' ? 'bg-primary-300' : 'bg-neutral-100'}`}
          textClassName={filter === 'all' ? 'font-medium' : ''}
          onPress={() => onFilterChange('all')}
          accessibilityRole="button"
          accessibilityLabel="Filter: All quests"
          accessibilityState={{ selected: filter === 'all' }}
        >
          All
        </Chip>
        <Chip
          className={`mr-2 ${filter === 'story' ? 'bg-primary-300' : 'bg-neutral-100'}`}
          textClassName={filter === 'story' ? 'font-medium' : ''}
          onPress={() => onFilterChange('story')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Story quests only"
          accessibilityState={{ selected: filter === 'story' }}
        >
          Story
        </Chip>
        <Chip
          className={`mr-2 ${filter === 'custom' ? 'bg-primary-300' : 'bg-neutral-100'}`}
          textClassName={filter === 'custom' ? 'font-medium' : ''}
          onPress={() => onFilterChange('custom')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Custom quests only"
          accessibilityState={{ selected: filter === 'custom' }}
        >
          Custom
        </Chip>
        <Chip
          className={`mr-2 ${filter === 'cooperative' ? 'bg-primary-300' : 'bg-neutral-100'}`}
          textClassName={filter === 'cooperative' ? 'font-medium' : ''}
          onPress={() => onFilterChange('cooperative')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Cooperative quests only"
          accessibilityState={{ selected: filter === 'cooperative' }}
        >
          Co-op
        </Chip>
      </View>

      {/* Status Filters */}
      <View className="flex-row px-4 pb-4">
        <Chip
          className={`mr-2 ${statusFilter === 'all' ? 'bg-secondary-300' : 'bg-neutral-100'}`}
          textClassName={statusFilter === 'all' ? 'font-medium' : ''}
          onPress={() => onStatusFilterChange('all')}
          accessibilityRole="button"
          accessibilityLabel="Filter: All status"
          accessibilityState={{ selected: statusFilter === 'all' }}
        >
          All Status
        </Chip>
        <Chip
          className={`mr-2 ${statusFilter === 'completed' ? 'bg-secondary-300' : 'bg-neutral-100'}`}
          textClassName={statusFilter === 'completed' ? 'font-medium' : ''}
          onPress={() => onStatusFilterChange('completed')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Completed quests only"
          accessibilityState={{ selected: statusFilter === 'completed' }}
        >
          Completed
        </Chip>
        <Chip
          className={`mr-2 ${statusFilter === 'failed' ? 'bg-secondary-300' : 'bg-neutral-100'}`}
          textClassName={statusFilter === 'failed' ? 'font-medium' : ''}
          onPress={() => onStatusFilterChange('failed')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Failed quests only"
          accessibilityState={{ selected: statusFilter === 'failed' }}
        >
          Failed
        </Chip>
      </View>
    </>
  );
}

interface QuestStatsRowProps {
  quest: TransformedQuest;
}

export function QuestStatsRow({ quest }: QuestStatsRowProps) {
  const currentUserId = useUserStore((state) => state.user?.id);

  // Get the XP to display - use adjusted XP from rewards if available
  const displayXP = getCurrentUserAdjustedXP(quest, currentUserId);

  // Debug: Log what XP we're displaying
  console.log('[JournalQuestStatsRow] Displaying XP:', {
    questId: quest.id,
    displayXP,
    baseXP: quest.reward.xp,
    hasParticipants: !!quest.participants,
  });

  return (
    <View className="mt-2 flex-row items-center">
      {/* XP - only show for completed quests */}
      {quest.status === 'completed' && (
        <View className="mr-3 flex-row items-center">
          <Feather name="award" size={14} color={colors.secondary[100]} />
          <Text className="ml-1 text-sm text-secondary-100">
            {displayXP} XP
          </Text>
        </View>
      )}

      {/* Date */}
      <View className="mr-3 flex-row items-center">
        <Feather name="calendar" size={14} color={colors.secondary[100]} />
        <Text className="ml-1 text-sm text-secondary-100">
          {quest.stopTime ? format(quest.stopTime, 'MMM d, yyyy') : 'Unknown'}
        </Text>
      </View>

      {/* Duration */}
      <View className="flex-row items-center">
        <Feather name="clock" size={14} color={colors.secondary[100]} />
        <Text className="ml-1 text-sm text-secondary-100">
          {formatDuration(quest)}
        </Text>
      </View>
    </View>
  );
}

interface QuestListItemProps {
  quest: TransformedQuest;
}

export function QuestListItem({ quest }: QuestListItemProps) {
  const isCompleted = quest.status === 'completed';
  const QuestWrapper = isCompleted ? TouchableOpacity : View;

  const handlePress = () => {
    if (isCompleted) {
      router.push({
        pathname: `/(app)/quest/${quest.id}` as any,
        params: {
          timestamp: quest.stopTime?.toString(),
          from: 'journal',
          questData: JSON.stringify(quest),
        },
      });
    }
  };

  return (
    <QuestWrapper
      key={`${quest.id}-${quest.stopTime}`}
      onPress={isCompleted ? handlePress : undefined}
      className="mb-4"
      accessibilityRole={isCompleted ? 'button' : undefined}
      accessibilityLabel={
        isCompleted
          ? `View details for ${quest.title}`
          : `${quest.title}, failed quest`
      }
      accessibilityHint={
        isCompleted ? 'Double tap to view quest details' : undefined
      }
    >
      <View
        className={`rounded-lg border-l-4 bg-cardBackground p-4 shadow-sm
          ${
            quest.status === 'failed'
              ? 'border-l-red-400'
              : quest.mode === 'story'
                ? 'border-l-primary-200'
                : 'border-l-muted-200'
          }`}
      >
        {/* Quest Content */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            {/* Title with limited width to prevent overflow */}
            <Text className="flex-1 pr-2 text-lg font-medium" numberOfLines={2}>
              {quest.title}
            </Text>
            <View className="flex-row gap-2">
              {/* Status indicator for failed quests */}
              {quest.status === 'failed' && (
                <Chip
                  className="bg-red-200"
                  textClassName="text-red-500 font-medium"
                >
                  Failed
                </Chip>
              )}
              {/* Mode Pill */}
              <Chip
                className={`${
                  quest.mode === 'story'
                    ? 'bg-primary-200'
                    : quest.mode === 'cooperative'
                      ? 'bg-secondary-300'
                      : 'bg-muted-200'
                }`}
                textClassName={
                  quest.mode === 'story'
                    ? 'text-primary-500'
                    : quest.mode === 'cooperative'
                      ? 'text-secondary-500'
                      : 'text-muted-500'
                }
              >
                {quest.mode === 'story'
                  ? 'Story'
                  : quest.mode === 'cooperative'
                    ? 'Co-op'
                    : 'Custom'}
              </Chip>
            </View>
          </View>

          {/* Stats row */}
          <QuestStatsRow quest={quest} />
        </View>
      </View>
    </QuestWrapper>
  );
}

export function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Notebook size={48} color={colors.neutral[300]} />
      <Text className="mt-4 text-center text-neutral-200">
        No quests found in this category.
      </Text>
    </View>
  );
}
