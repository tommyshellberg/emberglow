import { format } from 'date-fns';
import { router } from 'expo-router';
import {
  Feather as FeatherIcon,
  Notebook,
  Scroll,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text as RNText, View as RNView } from 'react-native';
import Animated, {
  Easing,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Badge, ListItem } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import { Chip } from '@/components/ui/chip';
import colors from '@/components/ui/colors';
import type {
  FilterType,
  StatusFilter,
  TransformedQuest,
} from '@/features/journal/types/journal-types';
import { formatDuration } from '@/features/journal/utils/journal-utils';
import { getCurrentUserAdjustedXP } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';
import { colors as emberColors, easing, fontFamily, tints } from '@/theme';

// --- Entrance animation -----------------------------------------------
// Ported from the Journal entrance prototype's generated Reanimated spec
// (`.claude/skills/emberglow-design/prototypes/journal-entrance/journal-entrance.jsx`,
// `JESpec`'s `code` template). Stagger/duration/rise are pixel-perfect
// values from the prototype's defaults — they don't map onto the
// durations.{fast,base,slow} scale, so they're literal here.
const ENTRANCE_STAGGER_MS = 70;
const ENTRANCE_DURATION_MS = 420;
const ENTRANCE_RISE_PX = 14;
const EMBER_ENTRANCE_EASE = Easing.bezier(...easing.emberOut);

function enterValue(value: number) {
  'worklet';
  return withTiming(value, {
    duration: ENTRANCE_DURATION_MS,
    easing: EMBER_ENTRANCE_EASE,
  });
}

/**
 * Custom Reanimated entering builder — fade + rise, staggered top-down.
 * Index 0 = header, 1–2 = filter-chip rows, 3+ = quest list items
 * (3 + position in the list).
 */
export function riseIn(index: number) {
  return () => {
    'worklet';
    const delay = index * ENTRANCE_STAGGER_MS;
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: ENTRANCE_RISE_PX }],
      },
      animations: {
        opacity: withDelay(delay, enterValue(1)),
        transform: [{ translateY: withDelay(delay, enterValue(0)) }],
      },
    };
  };
}

// --- Filter chips -------------------------------------------------------

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
      <Animated.View className="flex-row px-4 pb-2" entering={riseIn(1)}>
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
      </Animated.View>

      {/* Status Filters */}
      <Animated.View className="flex-row px-4 pb-4" entering={riseIn(2)}>
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
      </Animated.View>
    </>
  );
}

// --- Quest list item ------------------------------------------------------

/** Nearest available lucide icon per quest mode (matches the design mockup's `typeIcon` map). */
const MODE_ICON: Record<TransformedQuest['mode'], typeof Scroll> = {
  story: Scroll,
  custom: FeatherIcon,
  cooperative: Users,
};

const MODE_LABEL: Record<TransformedQuest['mode'], string> = {
  story: 'Story',
  custom: 'Custom',
  cooperative: 'Co-op',
};

interface QuestListItemProps {
  quest: TransformedQuest;
}

export function QuestListItem({ quest }: QuestListItemProps) {
  const currentUserId = useUserStore((state) => state.user?.id);

  const isCompleted = quest.status === 'completed';
  const isFailed = quest.status === 'failed';

  // Get the XP to display - use adjusted XP from rewards if available
  const displayXP = getCurrentUserAdjustedXP(quest, currentUserId);

  const ModeIcon = MODE_ICON[quest.mode];

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
    <ListItem
      title={quest.title}
      subtitle={
        quest.stopTime ? format(quest.stopTime, 'MMM d, yyyy') : 'Unknown'
      }
      accessibilityLabel={
        isCompleted
          ? `View details for ${quest.title}`
          : `${quest.title}, failed quest`
      }
      accessibilityHint={
        isCompleted ? 'Double tap to view quest details' : undefined
      }
      leading={
        <ModeIcon
          size={19}
          color={isFailed ? tints.cinnabar80 : emberColors.text.accent}
        />
      }
      trailing={
        <RNView style={itemStyles.trailingColumn}>
          <RNView style={itemStyles.metaRow}>
            <RNText style={itemStyles.metaText}>
              {MODE_LABEL[quest.mode]}
            </RNText>
            <RNText style={itemStyles.metaDivider}> · </RNText>
            <RNText style={itemStyles.metaText}>{formatDuration(quest)}</RNText>
          </RNView>
          {isFailed ? (
            <Badge tone="ember">Failed</Badge>
          ) : isCompleted ? (
            <RNText style={itemStyles.xpText}>{displayXP} XP</RNText>
          ) : null}
        </RNView>
      }
      // Only completed quests navigate; ListItem only renders a Pressable
      // (and announces accessibilityRole="button") when onPress is set, so
      // failed quests stay a static, non-interactive row.
      onPress={isCompleted ? handlePress : undefined}
    />
  );
}

const itemStyles = StyleSheet.create({
  trailingColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: emberColors.text.muted,
  },
  metaDivider: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: emberColors.text.muted,
  },
  xpText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: emberColors.text.accent,
  },
});

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
