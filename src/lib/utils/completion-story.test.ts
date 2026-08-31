import { AVAILABLE_CUSTOM_QUEST_STORIES } from '@/app/data/quests';

import { getCompletionStory } from './completion-story';

/** Category ids offered by the picker (QuestForm/category-slider.tsx). */
const PICKER_CATEGORY_IDS = [
  'fitness',
  'work',
  'self-care',
  'social',
  'learning',
  'creative',
  'household',
  'outdoors',
  'other',
];

const quest = (overrides: Record<string, unknown> = {}) => ({
  id: 'quest-abc',
  mode: 'custom' as const,
  category: 'fitness',
  ...overrides,
});

describe('getCompletionStory', () => {
  it('returns the authored story for story quests', () => {
    expect(
      getCompletionStory(quest({ mode: 'story', story: 'The road went on.' }))
    ).toBe('The road went on.');
  });

  it('returns null for a story quest without story text', () => {
    expect(
      getCompletionStory(quest({ mode: 'story', story: undefined }))
    ).toBeNull();
  });

  it('returns null for cooperative quests', () => {
    expect(getCompletionStory(quest({ mode: 'cooperative' }))).toBeNull();
  });

  it.each(['fitness', 'social', 'self-care', 'learning'])(
    'matches a %s custom quest to a story of that category',
    (category) => {
      const story = getCompletionStory(quest({ category }));
      expect(story).toEqual(expect.any(String));
      expect(
        AVAILABLE_CUSTOM_QUEST_STORIES.some(
          (s) => s.story === story && s.category === category
        )
      ).toBe(true);
    }
  );

  it('gives hold-out quests the same category-matched stories', () => {
    const story = getCompletionStory(
      quest({ mode: 'holdout', category: 'fitness' })
    );
    expect(story).toEqual(expect.any(String));
    expect(
      AVAILABLE_CUSTOM_QUEST_STORIES.some(
        (s) => s.story === story && s.category === 'fitness'
      )
    ).toBe(true);
  });

  it('falls back deterministically for an unknown category', () => {
    const a = getCompletionStory(quest({ category: 'does-not-exist' }));
    const b = getCompletionStory(quest({ category: 'does-not-exist' }));
    expect(a).toEqual(expect.any(String));
    expect(a).toBe(b);
  });

  it('returns the same story for the same quest id', () => {
    expect(getCompletionStory(quest())).toBe(getCompletionStory(quest()));
  });

  it('tags every pool story with a picker category id', () => {
    // 'Reading' and capitalized tags matched nothing the picker can produce.
    const tags = [
      ...new Set(AVAILABLE_CUSTOM_QUEST_STORIES.map((s) => s.category)),
    ];
    for (const tag of tags) {
      expect(PICKER_CATEGORY_IDS).toContain(tag);
    }
  });
});
