export interface QuestRewardPreviewParticipant {
  userId: string;
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

export interface QuestRewardPreviewResponse {
  participantRewards: QuestRewardPreviewParticipant[];
  effects: {
    duration?: number;
  };
}
