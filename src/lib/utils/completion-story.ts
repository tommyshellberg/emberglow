import { AVAILABLE_CUSTOM_QUEST_STORIES } from '@/app/data/quests';

/** The quest fields the completion-story lookup needs. Structural on
 * purpose: both live quests (QuestWithMode) and journal rows
 * (TransformedQuest) satisfy it. */
export interface CompletionStorySource {
  id: string;
  mode?: 'story' | 'custom' | 'cooperative' | 'holdout';
  category?: string;
  story?: string;
}

const hashId = (id: string): number =>
  id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

/**
 * Resolve the story shown on a quest's completion and detail screens.
 *
 * - story quests: their authored story
 * - custom and hold-out quests: a category-matched vignette from
 *   AVAILABLE_CUSTOM_QUEST_STORIES; a category with no stories falls back
 *   to one picked by quest-id hash. The id hash also picks within the
 *   category, so the same quest always shows the same story.
 * - anything else (cooperative): null; the caller supplies its default.
 */
export function getCompletionStory(
  quest: CompletionStorySource
): string | null {
  if (quest.mode === 'story') {
    return quest.story ?? null;
  }
  if (quest.mode !== 'custom' && quest.mode !== 'holdout') {
    return null;
  }

  const wanted = quest.category?.toLowerCase();
  let matching = wanted
    ? AVAILABLE_CUSTOM_QUEST_STORIES.filter(
        (s) => s.category.toLowerCase() === wanted
      )
    : [];

  if (matching.length === 0) {
    const categories = [
      ...new Set(AVAILABLE_CUSTOM_QUEST_STORIES.map((s) => s.category)),
    ];
    const fallback = categories[hashId(quest.id) % categories.length];
    matching = AVAILABLE_CUSTOM_QUEST_STORIES.filter(
      (s) => s.category === fallback
    );
  }

  if (matching.length === 0) {
    return null;
  }
  return matching[hashId(quest.id) % matching.length].story;
}
