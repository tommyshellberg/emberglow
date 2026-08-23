import CHARACTERS from './characters';

describe('CHARACTERS', () => {
  // The carousel renders this array in order, and intro narration plays per
  // card, so the order doubles as the voice sequence. Alternate female/male
  // voices: alchemist, bard, druid are female; knight, scout, wizard are male.
  it('alternates female and male narrator voices', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual([
      'alchemist',
      'knight',
      'bard',
      'scout',
      'druid',
      'wizard',
    ]);
  });
});
