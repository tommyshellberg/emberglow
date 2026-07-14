import { Clock, User, Users } from 'lucide-react-native';
import React from 'react';

import { Card, Text, TouchableOpacity, View } from '@/components/ui';
import colors from '@/components/ui/colors';

import { participantDisplayName } from '../lib/participants';
import { type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
  onPress: () => void;
  overlapsRegistration?: boolean;
}

const startsLabel = (run: ScheduledQuestRun): string => {
  if (run.status === 'active') return 'Happening now - join in!';
  const minutes = Math.max(
    0,
    Math.round((new Date(run.scheduledStartAt).getTime() - Date.now()) / 60_000)
  );
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (minutes < 48 * 60) return `Starts in ${Math.round(minutes / 60)} h`;
  return `Starts ${new Date(run.scheduledStartAt).toLocaleDateString()}`;
};

export function EventCard({ run, onPress, overlapsRegistration }: Props) {
  const host = run.participants[0];

  return (
    <TouchableOpacity onPress={onPress} testID={`event-card-${run.id}`}>
      <Card className="mb-3 p-4">
        <Text className="text-base font-semibold">{run.quest.title}</Text>
        {host ? (
          <View className="mt-1 flex-row items-center">
            <User size={14} color={colors.neutral[200]} />
            <Text className="ml-1 text-sm text-neutral-200">
              Hosted by {participantDisplayName(host)}
            </Text>
          </View>
        ) : null}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Clock size={14} color={colors.neutral[200]} />
            <Text className="ml-1 text-sm text-neutral-200">
              {run.quest.durationMinutes} min
            </Text>
          </View>
          <View className="flex-row items-center">
            <Users size={14} color={colors.neutral[200]} />
            <Text className="ml-1 text-sm text-neutral-200">
              {run.participants.length}/{run.maxParticipants}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-primary-400">
            {startsLabel(run)}
          </Text>
        </View>
        {overlapsRegistration ? (
          <Text className="mt-2 text-xs text-amber-400">
            Overlaps one of your events
          </Text>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}
