import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useQuestRuns } from '@/api/quest';
import { StreakCounter } from '@/components/StreakCounter';
import {
  ActivityIndicator,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import {
  EmptyState,
  FilterChips,
  QuestListItem,
  riseIn,
} from '@/features/journal/components/journal-components';
import {
  QUESTS_PER_PAGE,
  SCROLL_END_THRESHOLD,
} from '@/features/journal/constants/journal-constants';
import {
  useJournalFilters,
  useJournalPagination,
  useTransformedQuestRuns,
} from '@/features/journal/hooks/journal-hooks';
import { colors as emberColors, radii, shadows } from '@/theme';

export default function JournalScreen() {
  const { page, resetPage, incrementPage } = useJournalPagination();
  const { filter, statusFilter, setFilter, setStatusFilter } =
    useJournalFilters();

  // Get quest runs from server
  const { data, isLoading } = useQuestRuns({
    page,
    limit: QUESTS_PER_PAGE,
  });

  // Transform and filter quests
  const sortedQuests = useTransformedQuestRuns(data, filter, statusFilter);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (data && page < data.totalPages) {
      incrementPage();
    }
  }, [data, page, incrementPage]);

  const handleFilterChange = useCallback(
    (newFilter: typeof filter) => {
      setFilter(newFilter, resetPage);
    },
    [setFilter, resetPage]
  );

  const handleStatusFilterChange = useCallback(
    (newStatusFilter: typeof statusFilter) => {
      setStatusFilter(newStatusFilter, resetPage);
    },
    [setStatusFilter, resetPage]
  );

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />
      <StreakCounter size="small" position="topRight" />

      <ScreenContainer>
        {/* Header */}
        <Animated.View entering={riseIn(0)}>
          <ScreenHeader
            testID="journal-screen"
            title="Journal"
            subtitle="Every quest leaves a mark."
            animate={false}
          />
        </Animated.View>

        <View className="flex-1">
          {/* Filter Pills */}
          <FilterChips
            filter={filter}
            statusFilter={statusFilter}
            onFilterChange={handleFilterChange}
            onStatusFilterChange={handleStatusFilterChange}
          />

          {/* Quest List */}
          <ScrollView
            className="flex-1 px-4 pt-2"
            showsVerticalScrollIndicator={false}
            onScrollEndDrag={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              const isEndReached =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - SCROLL_END_THRESHOLD;
              if (isEndReached && !isLoading) {
                loadMore();
              }
            }}
          >
            {isLoading && sortedQuests.length === 0 ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color={colors.primary[300]} />
                <Text className="mt-4 text-center text-neutral-200">
                  Loading your quest history...
                </Text>
              </View>
            ) : sortedQuests.length === 0 ? (
              <EmptyState />
            ) : (
              <View style={styles.card}>
                {sortedQuests.map((quest, index) => (
                  <Animated.View
                    key={`${quest.id}-${quest.stopTime}`}
                    style={index > 0 ? styles.rowDivider : undefined}
                  >
                    <QuestListItem quest={quest} />
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Loading indicator for pagination */}
            {isLoading && sortedQuests.length > 0 && (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.primary[300]} />
              </View>
            )}

            {/* Extra space at bottom for better scrolling */}
            <View className="h-20" />
          </ScrollView>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: emberColors.surface.raised,
    borderWidth: 1,
    borderColor: emberColors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: emberColors.border.hairline,
  },
});
