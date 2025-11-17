// Shared types
export type XP = number;
export type Minutes = number;
export type Timestamp = number;

export interface Reward {
  xp: XP;
  // Future: items, achievements, etc.
}

export interface BaseQuestTemplate {
  id: string;
  _id?: string; // MongoDB ObjectId for server quests
  title: string;
  durationMinutes: number;
  reward: Reward;
}

// Define the options structure separately for reuse
export interface QuestOption {
  id: string;
  text: string;
  nextQuestId: string | null;
}

export interface StoryQuestTemplate extends BaseQuestTemplate {
  poiSlug: string;
  mode: 'story';
  story: string;
  recap: string;
  options: QuestOption[];
}

export interface CustomQuestTemplate extends BaseQuestTemplate {
  mode: 'custom';
  category: string;
  inviteeIds?: string[]; // For cooperative quests
}

export type QuestStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export interface QuestReflection {
  mood?: number; // 1-5 scale (1=angry, 2=frown, 3=meh, 4=smile, 5=laugh)
  text?: string;
  activities?: string[]; // Activity categories selected
  createdAt: number;
  prompt?: string; // Which prompt was shown to the user
}

export type Quest = (StoryQuestTemplate | CustomQuestTemplate) & {
  startTime: number;
  stopTime?: number; // When the quest ended, for any reason
  status: QuestStatus;
  customId?: string; // Preserve the original quest template ID (e.g., 'quest-1', 'quest-4')
  questRunId?: string; // Server quest run ID for reflection tracking
  reflection?: QuestReflection; // Optional reflection data
  participants?: QuestParticipant[]; // Quest participants with rewards (for completed quests)
};

export interface Character {
  type: CharacterType;
  name: string;
  level: number;
  currentXP: XP;
}

export type CharacterType =
  | 'alchemist'
  | 'bard'
  | 'druid'
  | 'knight'
  | 'scholar'
  | 'wizard';

export interface Account {
  id: string;
  created: Timestamp;
  lastActive: Timestamp;
}

export interface User {
  id: string;
  type: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  friends: string[];
  pendingFriends: string[];
  blockedUsers: string[];
  inventory: any[];
  completedQuests: string[];
  dailyQuestStreak: number;
  featureFlags: string[];
}

export type POI = {
  slug: string;
  name: string;
  x: number;
  y: number;
  isRevealed: boolean;
  mapId: string;
};

// Cooperative Quest Types
export interface QuestParticipantRewards {
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  perksApplied: string[];
}

export interface QuestParticipant {
  userId: string;
  ready: boolean;
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'active'
    | 'completed'
    | 'failed';
  userName?: string;
  characterType?: CharacterType;
  phoneLocked?: boolean;
  characterName?: string;
  rewards?: QuestParticipantRewards;
}

export interface CooperativeQuestRun {
  id: string;
  questId: string;
  hostId: string;
  participants: QuestParticipant[];
  status: 'pending' | 'active' | 'completed' | 'failed';
  invitationId?: string;
  actualStartTime?: number;
  scheduledEndTime?: number;
  createdAt: number;
  updatedAt: number;
}

export interface QuestInvitation {
  id: string;
  questRunId: string;
  questTitle: string;
  questDuration: number;
  hostId: string;
  hostName: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}
