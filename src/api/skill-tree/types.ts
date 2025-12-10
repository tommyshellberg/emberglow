export interface PerkChoice {
  id: string;
  name: string;
  description: string;
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  category: 'universal' | 'character-specific';
  isUnlocked: boolean;
  isChoice: boolean;
  unlockedAt?: string;
  selectedChoice?: string;
  choices?: PerkChoice[];
  prerequisite?: string[];
}

export interface SkillTreeNode {
  nodeId: string;
  choice?: string;
  unlockedAt: string;
}

export interface SkillTreeResponse {
  currentLevel: number;
  characterType: string;
  unlockedNodes: string[];
  availablePerks: Perk[];
  canRespec: boolean;
  respecsUsed: number;
  lastRespecAt: string | null;
}

export interface UnlockPerkRequest {
  nodeId: string;
  choice?: string;
}

export interface UnlockPerkResponse {
  success: boolean;
  unlockedPerk: {
    nodeId: string;
    unlockedAt: string;
  };
  updatedSkillTree: SkillTreeResponse;
}

export interface RespecSkillTreeResponse {
  success: boolean;
  respecsUsed: number;
  availableSkillPoints: number;
  message: string;
}

export interface PerkEffect {
  type:
    | 'xp_multiplier'
    | 'duration_reduction'
    | 'streak_protection'
    | 'ability'
    | 'passive';
  value: number | boolean;
  condition?: string;
}
