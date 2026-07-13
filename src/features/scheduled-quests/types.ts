/**
 * Scheduled quest ("Event") types and pure helpers.
 * Server contract: unquest-server feat/scheduled-quests-v2.
 */

export type ScheduledQuestStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'failed';
export type ScheduledParticipantStatus =
  | 'active'
  | 'failed'
  | 'completed'
  | 'no_show';

export interface ScheduledParticipantUser {
  id: string;
  character?: { name: string; type: string; level: number };
}

export interface ScheduledParticipant {
  /** Populated by /scheduled/:id, /scheduled/mine and /discover; raw id elsewhere. */
  userId: ScheduledParticipantUser | string;
  ready: boolean;
  phoneLocked: boolean;
  phoneLockedAt?: string;
  status: ScheduledParticipantStatus;
  rewards?: {
    baseXP: number;
    adjustedXP: number;
    multiplier: number;
    perksApplied: string[];
  };
}

export interface ScheduledQuestRun {
  id: string;
  status: ScheduledQuestStatus;
  scheduledStartAt: string;
  completionPolicy: 'individual';
  visibility: 'public' | 'friends';
  maxParticipants: number;
  expiresAt?: string;
  actualStartTime?: string;
  scheduledEndTime?: string;
  completedAt?: string;
  cancellationReason?: string;
  quest: {
    title: string;
    category: string;
    durationMinutes: number;
    mode: string;
    reward: { xp: number };
  };
  participants: ScheduledParticipant[];
}

/** Mirrors JOIN_WINDOW_FRACTION in the server's scheduled-quest-scoring.js. */
export const JOIN_WINDOW_FRACTION = 0.25;

export const joinCutoffMs = (
  run: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>
) =>
  new Date(run.scheduledStartAt).getTime() +
  run.quest.durationMinutes * 60_000 * JOIN_WINDOW_FRACTION;

export const isJoinable = (run: ScheduledQuestRun, nowMs = Date.now()) =>
  run.status === 'pending' ||
  (run.status === 'active' && nowMs <= joinCutoffMs(run));

/** Half-open [start, end) window intersection, per spec §9. */
export const overlapsWindow = (
  a: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>,
  b: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>
) => {
  const aStart = new Date(a.scheduledStartAt).getTime();
  const aEnd = aStart + a.quest.durationMinutes * 60_000;
  const bStart = new Date(b.scheduledStartAt).getTime();
  const bEnd = bStart + b.quest.durationMinutes * 60_000;
  return aStart < bEnd && bStart < aEnd;
};
