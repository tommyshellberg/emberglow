import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import {
  useDiscoverScheduledQuests,
  useMyScheduledQuests,
} from '@/api/scheduled-quests';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import { EventCard } from '@/features/scheduled-quests/components/event-card';
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
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold">Public Events</Text>
        <TouchableOpacity
          testID="create-event-button"
          onPress={() => router.push('/scheduled-quest/create')}
          className="flex-row items-center rounded-lg bg-primary-400 px-3 py-2"
        >
          <CalendarPlus size={18} color="#FFFFFF" />
          <Text className="ml-1 font-semibold text-white">New event</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-2 flex-row px-4">
        {(['discover', 'mine'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`mr-2 rounded-full px-4 py-2 ${tab === t ? 'bg-primary-400' : 'bg-neutral-800'}`}
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
            refreshing={active.isLoading}
            onRefresh={() => active.refetch()}
          />
        }
      >
        {feed.length === 0 ? (
          <Text className="mt-10 text-center text-neutral-400">
            {tab === 'discover'
              ? 'No upcoming events right now - create one!'
              : "You haven't registered for any events yet."}
          </Text>
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
    </ScreenContainer>
  );
}
