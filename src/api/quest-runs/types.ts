export interface QuestRewardPreviewParticipant {
  userId: string;
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

export interface DurationDetails {
  original: number;
  modified: number;
  modifier: number;
  appliedPerks: string[];
}

export interface XPDetails {
  original: number;
  modified: number;
  multiplier: number;
  appliedPerks: string[];
}

export interface QuestRewardPreviewResponse {
  participantRewards: QuestRewardPreviewParticipant[];
  effects: {
    duration?: number | null;
    durationDetails?: DurationDetails;
    xp?: XPDetails | null;
  };
}
