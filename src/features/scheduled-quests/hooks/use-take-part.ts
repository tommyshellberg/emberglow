import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';
import { type CustomQuestTemplate } from '@/store/types';

import { participantUserId } from '../lib/participants';
import { type ScheduledQuestRun } from '../types';

interface UseTakePartResult {
  takePart: () => Promise<void>;
  isArming: boolean;
}

/**
 * T-0 handoff (spec §3/§6): hand the already-active server run to the
 * standard cooperative start machinery, exactly like
 * cooperative-quest-ready.tsx's handleQuestCreatedResponse:
 * setCooperativeQuestRun -> prepareQuest -> QuestTimer.prepareQuest with an
 * explicit questRunId -> /cooperative-pending-quest. The physical phone
 * lock remains the real trigger; QuestTimer's coop branch then anchors the
 * local timer to the server's actualStartTime, so the countdown ends at the
 * shared Tend even for late lock-ins.
 *
 * The template MUST be mode 'cooperative' (same literal as the ready
 * screen): navigation-state-resolver.ts treats only
 * pendingQuest.mode === 'cooperative' as cooperative, and any other mode
 * makes the NavigationGate push the solo /pending-quest screen on
 * relaunch/foreground while armed. CustomQuestTemplate types mode as
 * 'custom', hence the localized cast below - do not widen the shared type
 * or edit the resolver (out of scope, and #324 touches the resolver).
 */
export function useTakePart(
  run: ScheduledQuestRun | undefined
): UseTakePartResult {
  const router = useRouter();
  const [isArming, setIsArming] = useState(false);

  const takePart = useCallback(async () => {
    if (!run || isArming) return;
    setIsArming(true);
    try {
      const questTemplate = {
        id: `scheduled-${run.id}`,
        title: run.quest.title,
        durationMinutes: run.quest.durationMinutes,
        reward: { xp: run.quest.reward.xp },
        mode: 'cooperative', // resolver contract - see docstring
        category: 'cooperative',
      } as unknown as CustomQuestTemplate;

      const questStore = useQuestStore.getState();
      questStore.setCooperativeQuestRun({
        id: run.id,
        questId: questTemplate.id,
        hostId: participantUserId(run.participants[0]) ?? '',
        status: 'active',
        completionPolicy: run.completionPolicy,
        participants: run.participants.map((p) => ({
          userId: participantUserId(p) ?? '',
          ready: p.ready,
          status: 'active',
          phoneLocked: p.phoneLocked,
        })),
        actualStartTime: run.actualStartTime
          ? new Date(run.actualStartTime).getTime()
          : undefined,
        scheduledEndTime: run.scheduledEndTime
          ? new Date(run.scheduledEndTime).getTime()
          : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      questStore.prepareQuest(questTemplate);
      await QuestTimer.prepareQuest(questTemplate, run.id);
      router.push('/cooperative-pending-quest');
    } finally {
      setIsArming(false);
    }
  }, [run, isArming, router]);

  return { takePart, isArming };
}
