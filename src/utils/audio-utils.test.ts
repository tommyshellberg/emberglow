import { useCharacterStore } from '@/store/character-store';
import { useSettingsStore } from '@/store/settings-store';
import { type CharacterType } from '@/store/types';

import { getEffectiveNarratorVoice, getNarrationPaths } from './audio-utils';

const setCharacter = (type: CharacterType | null) => {
  useCharacterStore.setState({
    character: type ? { type, name: 'Test', level: 1, currentXP: 0 } : null,
  });
};

describe('getEffectiveNarratorVoice', () => {
  beforeEach(() => {
    useSettingsStore.setState({ narratorVoice: null });
    setCharacter(null);
  });

  it('explicit setting wins over character default', () => {
    setCharacter('knight'); // default male
    useSettingsStore.setState({ narratorVoice: 'female' });
    expect(getEffectiveNarratorVoice()).toBe('female');
  });

  it.each([
    ['alchemist', 'female'],
    ['bard', 'female'],
    ['druid', 'female'],
    ['knight', 'male'],
    ['scout', 'male'],
    ['wizard', 'male'],
  ] as const)('derives %s default as %s when unset', (type, expected) => {
    setCharacter(type);
    expect(getEffectiveNarratorVoice()).toBe(expected);
  });

  it('falls back to male with no character at all', () => {
    expect(getEffectiveNarratorVoice()).toBe('male');
  });
});

describe('getNarrationPaths', () => {
  beforeEach(() => {
    useSettingsStore.setState({ narratorVoice: null });
    setCharacter(null);
  });

  it('female voice: suffixed primary with male fallback', () => {
    useSettingsStore.setState({ narratorVoice: 'female' });
    expect(getNarrationPaths('quest-1')).toEqual({
      primaryPath: 'storylines/vaedros/quest-1-female.mp3',
      fallbackPath: 'storylines/vaedros/quest-1.mp3',
    });
  });

  it('male voice: unsuffixed primary, no fallback', () => {
    useSettingsStore.setState({ narratorVoice: 'male' });
    expect(getNarrationPaths('quest-1')).toEqual({
      primaryPath: 'storylines/vaedros/quest-1.mp3',
      fallbackPath: null,
    });
  });

  it('respects a non-default storyline id', () => {
    useSettingsStore.setState({ narratorVoice: 'female' });
    expect(getNarrationPaths('quest-2a', 'other').primaryPath).toBe(
      'storylines/other/quest-2a-female.mp3'
    );
  });

  it('derives voice from character when unset (druid → female paths)', () => {
    setCharacter('druid');
    expect(getNarrationPaths('quest-1').primaryPath).toBe(
      'storylines/vaedros/quest-1-female.mp3'
    );
  });
});
