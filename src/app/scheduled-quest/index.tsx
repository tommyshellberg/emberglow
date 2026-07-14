import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import {
  useDiscoverScheduledQuests,
  useMyScheduledQuests,
} from '@/api/scheduled-quests';
import {
  ActivityIndicator,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import { EventCard } from '@/features/scheduled-quests/components/event-card';
import { EventsEmptyState } from '@/features/scheduled-quests/components/events-empty-state';
import {
  overlapsWindow,
  type ScheduledQuestRun,
} from '@/features/scheduled-quests/types';

type Tab = 'discover' | 'mine';

export default function ScheduledQuestDiscovery() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('discover');
  const discover = useDiscoverScheduledQuests();
  const mine = useMyScheduledQuests();

  const registrations = mine.data ?? [];
  const feed: ScheduledQuestRun[] =
    (tab === 'discover' ? discover.data : mine.data) ?? [];
  const active = tab === 'discover' ? discover : mine;

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <View className="px-4">
        <ScreenHeader title="Public Events" showBackButton />
      </View>

      <View className="mb-2 flex-row px-4">
        {(['discover', 'mine'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            className={`mr-2 rounded-full px-4 py-2 ${tab === t ? 'bg-primary-400' : 'bg-cardBackground'}`}
          >
            <Text
              className={`font-semibold ${tab === t ? 'text-white' : 'text-neutral-300'}`}
            >
              {t === 'discover' ? 'Discover' : 'My events'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={active.isFetching}
            onRefresh={() => active.refetch()}
          />
        }
      >
        {active.isLoading ? (
          <ActivityIndicator className="py-8" />
        ) : feed.length === 0 ? (
          <EventsEmptyState
            variant={tab}
            onActionPress={() =>
              tab === 'discover'
                ? router.push('/scheduled-quest/create')
                : setTab('discover')
            }
          />
        ) : (
          feed.map((run) => (
            <EventCard
              key={run.id}
              run={run}
              onPress={() => router.push(`/scheduled-quest/${run.id}`)}
              overlapsRegistration={
                tab === 'discover' &&
                registrations.some(
                  (r) => r.id !== run.id && overlapsWindow(r, run)
                )
              }
            />
          ))
        )}
      </ScrollView>

      {feed.length > 0 && (
        <TouchableOpacity
          testID="create-event-button"
          onPress={() => router.push('/scheduled-quest/create')}
          accessibilityRole="button"
          accessibilityLabel="Create a new event"
          className="absolute bottom-24 right-8 size-16 items-center justify-center rounded-full bg-primary-400 shadow-lg"
          style={{ elevation: 6 }}
        >
          <CalendarPlus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}
