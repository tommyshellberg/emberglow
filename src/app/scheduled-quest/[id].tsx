import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import {
  useCancelScheduledQuest,
  useJoinScheduledQuest,
  useKickParticipant,
  useLeaveScheduledQuest,
  useScheduledQuest,
} from '@/api/scheduled-quests';
import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { CancelledView } from '@/features/scheduled-quests/components/cancelled-view';
import { ResultsView } from '@/features/scheduled-quests/components/results-view';
import { RosterRow } from '@/features/scheduled-quests/components/roster-row';
import { useScheduledQuestRoom } from '@/features/scheduled-quests/hooks/use-scheduled-quest-room';
import { useTakePart } from '@/features/scheduled-quests/hooks/use-take-part';
import { participantUserId } from '@/features/scheduled-quests/lib/participants';
import {
  isJoinable,
  type ScheduledQuestRun,
} from '@/features/scheduled-quests/types';
import { scheduledQuestErrorMessage } from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';
import { useUserStore } from '@/store/user-store';

const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, '0')}s`;
};

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useUserStore((s) => s.user?.id);
  const { data: run, isLoading } = useScheduledQuest(id);
  const settlement = useScheduledQuestsStore((s) =>
    id ? s.settlements[id] : undefined
  );
  const joinMutation = useJoinScheduledQuest();
  const leaveMutation = useLeaveScheduledQuest();
  const cancelMutation = useCancelScheduledQuest();
  const kickMutation = useKickParticipant();
  const { takePart, isArming } = useTakePart(run);
  const [cancelledLive, setCancelledLive] = useState(false);
  useScheduledQuestRoom(id, { onCancelled: () => setCancelledLive(true) });

  // 1s ticker drives the countdown; the flip to "Take part" comes from the
  // server (questStarted invalidation or the poll), never the local clock.
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading || !run) {
    return (
      <ScreenContainer>
        <FocusAwareStatusBar />
        <ScreenHeader title="Event" showBackButton />
        <ActivityIndicator className="mt-20" />
      </ScreenContainer>
    );
  }

  const amParticipant = run.participants.some(
    (p) => participantUserId(p) === userId
  );
  const myEntry = run.participants.find((p) => participantUserId(p) === userId);
  const amCreator = participantUserId(run.participants[0]) === userId;

  const renderBody = (r: ScheduledQuestRun) => {
    if (cancelledLive || r.status === 'cancelled')
      return <CancelledView run={r} />;
    if (r.status === 'completed' || settlement)
      return <ResultsView run={r} settlement={settlement} />;
    if (r.status === 'failed') return <CancelledView run={r} />;

    const startMs = new Date(r.scheduledStartAt).getTime();
    const joinable = isJoinable(r, nowMs);

    return (
      <>
        {r.status === 'pending' ? (
          <View className="items-center py-6">
            <Text variant="secondary" className="text-sm">
              Starts in
            </Text>
            <Text className="text-4xl font-bold">
              {startMs - nowMs > 0
                ? formatCountdown(startMs - nowMs)
                : 'Starting…'}
            </Text>
          </View>
        ) : (
          <View className="items-center py-6">
            <Text className="text-lg font-bold text-primary-400">
              {joinable ? 'Happening now!' : 'In progress'}
            </Text>
          </View>
        )}

        <Text className="mb-2 font-semibold">
          Roster ({r.participants.length}/{r.maxParticipants})
        </Text>
        {r.participants.map((p, index) => (
          <RosterRow
            key={participantUserId(p) ?? index}
            participant={p}
            isCreator={index === 0}
            runStatus={r.status}
            onKick={
              amCreator &&
              r.status === 'pending' &&
              index !== 0 &&
              participantUserId(p)
                ? () =>
                    kickMutation.mutate({
                      questRunId: r.id,
                      userId: participantUserId(p) as string,
                    })
                : undefined
            }
          />
        ))}

        <View className="mt-6">
          {r.status === 'pending' && !amParticipant && (
            <Button
              label="Register"
              loading={joinMutation.isPending}
              onPress={() => joinMutation.mutate(r.id)}
            />
          )}
          {r.status === 'pending' && amParticipant && !amCreator && (
            <Button
              label="Leave event"
              variant="outline"
              loading={leaveMutation.isPending}
              onPress={() =>
                leaveMutation.mutate(r.id, {
                  onSuccess: () => router.back(),
                })
              }
            />
          )}
          {r.status === 'pending' && amCreator && (
            <Button
              label="Cancel event"
              variant="destructive"
              loading={cancelMutation.isPending}
              onPress={() =>
                cancelMutation.mutate(r.id, {
                  onSuccess: () => router.back(),
                })
              }
            />
          )}
          {r.status === 'active' &&
            joinable &&
            amParticipant &&
            myEntry?.status === 'active' && (
              <Button label="Take part" loading={isArming} onPress={takePart} />
            )}
          {r.status === 'active' && joinable && !amParticipant && (
            <Button
              label="Join and take part"
              loading={joinMutation.isPending}
              onPress={() => joinMutation.mutate(r.id)}
            />
          )}
          {r.status === 'active' && !joinable && !amParticipant && (
            <Text variant="secondary" className="text-center">
              It&apos;s too late to join this one - find the next event!
            </Text>
          )}
          {joinMutation.error ? (
            <Text className="mt-2 text-center text-sm text-red-400">
              {scheduledQuestErrorMessage(joinMutation.error)}
            </Text>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <ScreenHeader title={run.quest.title} showBackButton />
      <ScrollView className="flex-1 px-4">
        <Text variant="secondary" className="text-sm">
          {run.quest.durationMinutes} min · {run.quest.category} ·{' '}
          {run.quest.reward.xp} XP
        </Text>
        {renderBody(run)}
      </ScrollView>
    </ScreenContainer>
  );
}
