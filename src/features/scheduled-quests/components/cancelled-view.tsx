import React from 'react';

import { Text, View } from '@/components/ui';

import { type ScheduledQuestRun } from '../types';

export function CancelledView({ run }: { run: ScheduledQuestRun }) {
  return (
    <View className="items-center py-10">
      <Text className="text-lg font-bold">This event was cancelled</Text>
      <Text className="mt-2 text-center text-neutral-400">
        {run.cancellationReason ?? 'The event is no longer happening.'}
      </Text>
    </View>
  );
}
