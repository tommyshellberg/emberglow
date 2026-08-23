import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import { MilestoneProgress } from '@/features/stats/components/milestone-progress';
import { WeeklyActivityChart } from '@/features/stats/components/weekly-activity-chart';
import { WeeklySummary } from '@/features/stats/components/weekly-summary';
import { aggregateDailyMinutes } from '@/features/stats/lib/daily-stats';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';
import { spacing } from '@/theme';

const DAYS_SHOWN = 7;

export default function StatsScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const completedQuests = useQuestStore((state) => state.completedQuests);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    posthog.capture('stats_screen_viewed');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dailyStats = useMemo(
    () => aggregateDailyMinutes(completedQuests, DAYS_SHOWN, Date.now()),
    [completedQuests]
  );

  const totalMinutes =
    user?.totalMinutesOffPhone ??
    completedQuests.reduce((total, quest) => total + quest.durationMinutes, 0);

  return (
    <View style={styles.flex}>
      <FocusAwareStatusBar />
      <ScreenContainer>
        <ScreenHeader
          title="Your Stats"
          subtitle="Every minute here is a minute you took back."
          showBackButton
          onBackPress={() => router.push('/profile')}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <WeeklySummary stats={dailyStats} />
          </View>
          <View style={styles.section}>
            <WeeklyActivityChart
              stats={dailyStats}
              variant="full"
              emptyMessage="Complete a quest to light up your week"
              testID="stats-weekly-chart"
            />
          </View>
          <View style={styles.section}>
            <MilestoneProgress totalMinutes={totalMinutes} />
          </View>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
});
