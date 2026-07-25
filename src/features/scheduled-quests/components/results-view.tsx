import React from 'react';

import { Text, View } from '@/components/ui';
import { type QuestSettledPayload } from '@/lib/services/websocket-events.types';

import { participantDisplayName, participantUserId } from '../lib/participants';
import { type ScheduledParticipant, type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
  settlement?: QuestSettledPayload;
}

interface Entry {
  name: string;
  status: 'completed' | 'failed' | 'no_show';
  xp: number;
  creditFailed?: boolean;
}

const entryFor = (
  p: ScheduledParticipant,
  settlement: QuestSettledPayload | undefined
): Entry => {
  const id = participantUserId(p);
  const settled = settlement?.participants.find((s) => s.userId === id);
  const name = participantDisplayName(p);
  if (settled) {
    return {
      name,
      status: settled.status,
      xp: settled.xpAwarded,
      creditFailed: settled.creditFailed,
    };
  }
  // Settlement hasn't landed yet (or this participant is missing from it) -
  // fall back to the run's own roster status/rewards.
  const status = p.status === 'active' ? 'no_show' : p.status;
  return {
    name,
    status,
    // Only completed participants earned their stored reward - failed/no_show
    // rewards can carry stale activation-time numbers.
    xp: status === 'completed' ? (p.rewards?.adjustedXP ?? 0) : 0,
  };
};

const SECTIONS: { key: Entry['status']; title: string }[] = [
  { key: 'completed', title: 'Showed up and finished' },
  { key: 'no_show', title: 'No-shows' },
  { key: 'failed', title: 'Dropped out early' },
];

export function ResultsView({ run, settlement }: Props) {
  const entries = run.participants.map((p) => entryFor(p, settlement));

  return (
    <View className="py-4">
      <Text className="mb-4 text-center text-lg font-bold">Who showed up</Text>
      {SECTIONS.map(({ key, title }) => {
        const rows = entries.filter((e) => e.status === key);
        if (rows.length === 0) return null;
        return (
          <View key={key} className="mb-4">
            <Text variant="secondary" className="mb-2 font-semibold">
              {title}
            </Text>
            {rows.map((e, index) => (
              <View
                key={`${key}-${e.name}-${index}`}
                className="mb-1 flex-row items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2"
              >
                <Text>{e.name}</Text>
                {e.status === 'completed' ? (
                  <Text className="font-semibold text-primary-400">
                    {e.creditFailed ? 'XP pending' : `+${e.xp} XP`}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
      <Text variant="secondary" className="mt-2 text-center text-sm">
        Completions count toward your streak.
      </Text>
    </View>
  );
}
