export interface QuestTemplate {
  _id: string;
  customId: string;
  title: string;
  durationMinutes: number;
  reward: {
    xp: number;
  };
  mode: 'story' | 'custom';
  storylineId?: string;
  storylineOrder?: number;
  isPremium?: boolean;
  requiresPremium?: boolean;
  poiSlug?: string;
  story?: string;
  recap?: string;
  options?: QuestOption[];
  category?: string;
  decisionText?: string;
}

export interface QuestOption {
  id: string;
  text: string;
  nextQuestId: string | null;
  nextQuest?: QuestTemplate;
}

export interface NextAvailableQuestsResponse {
  quests: QuestTemplate[];
  hasMoreQuests: boolean;
  storylineComplete: boolean;
  options?: QuestOption[];
  storylineProgress?: {
    storylineId: string;
    totalQuests: number;
    completedQuests: number;
    progressPercentage: number;
    lastCompletedQuestId: string | null;
    isComplete: boolean;
  };
}

export interface QuestParticipantRewards {
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

export interface QuestRunParticipant {
  userId: string;
  ready: boolean;
  phoneLocked: boolean;
  status: 'active' | 'failed' | 'completed';
  rewards?: QuestParticipantRewards;
}

export interface QuestRun {
  _id: string;
  id: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  expiresAt?: string;
  completedAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledEndTime?: string;
  quest: {
    id: string;
    customId?: string; // The original quest template ID (e.g., 'quest-1', 'quest-4')
    title: string;
    durationMinutes: number;
    reward: {
      xp: number;
    };
    mode: 'story' | 'custom' | 'cooperative';
    poiSlug?: string;
    story?: string;
    recap?: string;
    options?: QuestOption[];
    category?: string;
    storylineId?: string;
  };
  participants: QuestRunParticipant[];
  failureReason?: string;
  failedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestRunsResponse {
  results: QuestRun[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface StorylineProgress {
  storylineId: string;
  totalQuests: number;
  completedQuests: number;
  progressPercentage: number;
  lastCompletedQuestId: string | null;
  isComplete: boolean;
}
