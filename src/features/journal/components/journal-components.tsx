import { format } from 'date-fns';
import { router } from 'expo-router';
import {
  Feather as FeatherIcon,
  Notebook,
  Scroll,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
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
import {
  colors as emberColors,
  easing,
  fontFamily,
  spacing,
  tints,
} from '@/theme';

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
      <Animated.View
        style={[filterStyles.row, filterStyles.modeRow]}
        entering={riseIn(1)}
      >
        <Chip
          tone="ember"
          selected={filter === 'all'}
          onPress={() => onFilterChange('all')}
          accessibilityRole="button"
          accessibilityLabel="Filter: All quests"
          accessibilityState={{ selected: filter === 'all' }}
        >
          All
        </Chip>
        <Chip
          tone="ember"
          selected={filter === 'story'}
          onPress={() => onFilterChange('story')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Story quests only"
          accessibilityState={{ selected: filter === 'story' }}
        >
          Story
        </Chip>
        <Chip
          tone="ember"
          selected={filter === 'custom'}
          onPress={() => onFilterChange('custom')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Custom quests only"
          accessibilityState={{ selected: filter === 'custom' }}
        >
          Custom
        </Chip>
        <Chip
          tone="ember"
          selected={filter === 'cooperative'}
          onPress={() => onFilterChange('cooperative')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Cooperative quests only"
          accessibilityState={{ selected: filter === 'cooperative' }}
        >
          Co-op
        </Chip>
      </Animated.View>

      {/* Status Filters */}
      <Animated.View
        style={[filterStyles.row, filterStyles.statusRow]}
        entering={riseIn(2)}
      >
        <Chip
          selected={statusFilter === 'all'}
          onPress={() => onStatusFilterChange('all')}
          accessibilityRole="button"
          accessibilityLabel="Filter: All status"
          accessibilityState={{ selected: statusFilter === 'all' }}
        >
          All status
        </Chip>
        <Chip
          selected={statusFilter === 'completed'}
          onPress={() => onStatusFilterChange('completed')}
          accessibilityRole="button"
          accessibilityLabel="Filter: Completed quests only"
          accessibilityState={{ selected: statusFilter === 'completed' }}
        >
          Completed
        </Chip>
        <Chip
          selected={statusFilter === 'failed'}
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

const filterStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  modeRow: {
    paddingBottom: spacing[2],
  },
  statusRow: {
    paddingBottom: spacing[4],
  },
});

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

  // Mockup ListItem: `subtitle={`${e.date} · ${e.minutes} min · ${e.type}`}`
  // — date, duration, and mode live together under the title; date drops
  // the year (`MMM d`, not `MMM d, yyyy`).
  const dateLabel = quest.stopTime
    ? format(quest.stopTime, 'MMM d')
    : 'Unknown';
  const subtitle = `${dateLabel} · ${formatDuration(quest)} · ${MODE_LABEL[quest.mode]}`;

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
      subtitle={subtitle}
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
      // Trailing cell is only the outcome — the ember Failed badge, or the
      // XP earned. Mode + duration moved into the subtitle above.
      trailing={
        isFailed ? (
          <Badge tone="ember">Failed</Badge>
        ) : isCompleted ? (
          <RNText style={itemStyles.xpText}>+{displayXP} XP</RNText>
        ) : null
      }
      // Only completed quests navigate; ListItem only renders a Pressable
      // (and announces accessibilityRole="button") when onPress is set, so
      // failed quests stay a static, non-interactive row.
      onPress={isCompleted ? handlePress : undefined}
    />
  );
}

const itemStyles = StyleSheet.create({
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
