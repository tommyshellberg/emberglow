// Journal screen types

export type FilterType = 'all' | 'story' | 'custom' | 'cooperative';
export type StatusFilter = 'all' | 'completed' | 'failed';

export interface QuestParticipantRewards {
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

export interface QuestParticipant {
  userId: string;
  ready: boolean;
  status: string;
  userName?: string;
  characterType?: string;
  phoneLocked?: boolean;
  characterName?: string;
  rewards?: QuestParticipantRewards;
}

export interface TransformedQuest {
  id: string;
  questRunId: string;
  customId?: string;
  title: string;
  mode: 'story' | 'custom' | 'cooperative';
  durationMinutes: number;
  reward: {
    xp: number;
  };
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  stopTime?: number;
  failureReason?: string;
  story?: string;
  category?: string;
  recap?: string;
  participants?: QuestParticipant[];
}
