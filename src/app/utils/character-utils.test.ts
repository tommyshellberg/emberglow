import { getCharacterAvatar } from '../utils/character-utils';

// Image requires are stubbed by __mocks__/fileMock.js → 'test-file-stub'.
// The CHARACTERS data array uses require() for images, so each character's
// profileImage and image fields will equal 'test-file-stub' in tests.

jest.mock('@/app/data/characters', () => [
  {
    id: 'alchemist',
    type: 'Alchemist',
    title: 'Master of Transformation',
    description: 'Transforms idle time.',
    image: 'test-file-stub',
    profileImage: 'alchemist-profile-stub',
  },
  {
    id: 'bard',
    type: 'Bard',
    title: 'Voice of Inspiration',
    description: 'Creates harmony.',
    image: 'bard-image-stub',
    // No profileImage — tests the fallback to character.image
  },
  {
    id: 'no-images',
    type: 'Ghost',
    title: 'No Images',
    description: 'Missing everything.',
    // Neither image nor profileImage
  },
]);

describe('getCharacterAvatar', () => {
  it('returns the default avatar when characterType is undefined', () => {
    const result = getCharacterAvatar(undefined);
    // require('@/../assets/images/characters/alchemist-profile.jpg') is mocked
    expect(result).toBe('test-file-stub');
  });

  it('returns the default avatar when characterType is an empty string', () => {
    const result = getCharacterAvatar('');
    expect(result).toBe('test-file-stub');
  });

  it('returns profileImage when the character has one', () => {
    const result = getCharacterAvatar('alchemist');
    expect(result).toBe('alchemist-profile-stub');
  });

  it('falls back to character.image when profileImage is absent', () => {
    const result = getCharacterAvatar('bard');
    expect(result).toBe('bard-image-stub');
  });

  it('falls back to the default avatar when the character has neither image field', () => {
    const result = getCharacterAvatar('no-images');
    expect(result).toBe('test-file-stub');
  });

  it('returns the default avatar when characterType does not match any character', () => {
    const result = getCharacterAvatar('wizard-nonexistent');
    expect(result).toBe('test-file-stub');
  });
});
