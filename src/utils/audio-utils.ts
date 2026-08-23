import { useCharacterStore } from '@/store/character-store';
import { useSettingsStore } from '@/store/settings-store';
import { type CharacterType, type NarratorVoice } from '@/store/types';

/**
 * Audio utility functions for quest audio management
 */

/**
 * Get the S3 audio path for a quest based on its custom ID
 * @param customId - The quest custom ID (e.g., 'quest-1', 'quest-1a')
 * @param storylineId - The storyline ID (defaults to 'vaedros')
 * @returns The S3 path for the quest audio file
 */
export function getQuestAudioPath(
  customId: string,
  storylineId: string = 'vaedros'
): string {
  return `storylines/${storylineId}/${customId}.mp3`;
}

/**
 * Character-default narrator voices. A Record over CharacterType so adding a
 * new character fails compilation until a voice is assigned.
 */
export const DEFAULT_VOICE_BY_CHARACTER: Record<CharacterType, NarratorVoice> =
  {
    alchemist: 'female',
    bard: 'female',
    druid: 'female',
    knight: 'male',
    scout: 'male',
    wizard: 'male',
  };

/**
 * Effective voice: explicit user choice, else the character's default, else
 * male (pre-character edge, e.g. narration previewed before onboarding
 * completes). Reads stores via getState — safe outside React.
 */
export function getEffectiveNarratorVoice(): NarratorVoice {
  const explicit = useSettingsStore.getState().narratorVoice;
  if (explicit) {
    return explicit;
  }
  const characterType = useCharacterStore.getState().character?.type;
  return characterType ? DEFAULT_VOICE_BY_CHARACTER[characterType] : 'male';
}

export type NarrationPaths = {
  primaryPath: string;
  fallbackPath: string | null;
};

/**
 * Voice-aware narration paths. Male files are the canonical unsuffixed set,
 * so the female primary falls back to the male path; male needs no fallback.
 */
export function getNarrationPaths(
  customId: string,
  storylineId: string = 'vaedros'
): NarrationPaths {
  const malePath = getQuestAudioPath(customId, storylineId);
  if (getEffectiveNarratorVoice() === 'female') {
    return {
      primaryPath: getQuestAudioPath(`${customId}-female`, storylineId),
      fallbackPath: malePath,
    };
  }
  return { primaryPath: malePath, fallbackPath: null };
}

/**
 * Check if a quest should have audio
 * Story quests have audio, custom quests don't
 * @param questMode - The quest mode ('story' or 'custom')
 * @returns Whether the quest should have audio
 */
export function questHasAudio(questMode: string): boolean {
  return questMode === 'story';
}
