import type { QuestRun } from '@/api/quest/types';

import { MAX_REASONABLE_DURATION_MS } from '@/features/journal/constants/journal-constants';
import type { TransformedQuest } from '@/features/journal/types/journal-types';

/**
 * Calculates the stop time for a quest run from available date fields
 */
export function calculateStopTime(run: QuestRun): number | undefined {
  if (run.status !== 'completed' && run.status !== 'failed') {
    return undefined;
  }

  // Try different date fields in order of preference
  if (run.completedAt) {
    return new Date(run.completedAt).getTime();
  }

  if (run.actualEndTime) {
    return new Date(run.actualEndTime).getTime();
  }

  if (run.scheduledEndTime) {
    // Use scheduled end time as it's close to actual completion for short quests
    return new Date(run.scheduledEndTime).getTime();
  }

  if (run.updatedAt) {
    // Only use updatedAt as last resort, and only if it's reasonable
    const updatedTime = new Date(run.updatedAt).getTime();
    const startTime = run.startedAt ? new Date(run.startedAt).getTime() : 0;
    const timeDiff = updatedTime - startTime;

    // If updatedAt is more than 24 hours after start, use scheduled end time calculation
    if (
      timeDiff > MAX_REASONABLE_DURATION_MS &&
      run.startedAt &&
      run.quest.durationMinutes
    ) {
      return startTime + run.quest.durationMinutes * 60 * 1000;
    }

    return updatedTime;
  }

  return undefined;
}

/**
 * Transforms a QuestRun from the API into a TransformedQuest for display
 */
export function transformQuestRun(run: QuestRun): TransformedQuest | null {
  const stopTime = calculateStopTime(run);

  // Filter out quests without proper dates
  if (!stopTime || isNaN(stopTime)) {
    return null;
  }

  return {
    id: run.quest.id || run.quest.customId || `quest-${run._id || run.id}`,
    questRunId: run._id || run.id,
    customId: run.quest.customId,
    title: run.quest.title,
    mode: run.quest.mode,
    durationMinutes: run.quest.durationMinutes,
    reward: run.quest.reward,
    status: run.status,
    startTime: run.startedAt ? new Date(run.startedAt).getTime() : undefined,
    stopTime,
    failureReason: run.failureReason,
    story: run.quest.story,
    category: run.quest.category,
    recap: run.quest.recap,
    participants: run.participants,
  };
}

/**
 * Formats quest duration into a readable string
 */
export function formatDuration(quest: TransformedQuest): string {
  if (!quest.startTime || !quest.stopTime) {
    return 'Unknown';
  }

  // Calculate duration
  const durationMs = quest.stopTime - quest.startTime;
  const durationMinutes = Math.round(durationMs / 60000);

  // Sanity check: if duration is way longer than expected (e.g., more than 24 hours),
  // use the quest's defined duration instead
  if (durationMinutes > 1440 && quest.durationMinutes) {
    return `~${quest.durationMinutes} minutes`;
  }

  return `${durationMinutes} minutes`;
}
