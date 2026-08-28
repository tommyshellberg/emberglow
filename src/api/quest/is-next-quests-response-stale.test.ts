import { isNextQuestsResponseStale } from './is-next-quests-response-stale';

const response = (customIds: string[]) =>
  ({
    quests: customIds.map((customId) => ({ customId })),
    hasMoreQuests: true,
    storylineComplete: false,
  }) as any;

describe('isNextQuestsResponseStale', () => {
  it('is stale when the quest just completed is still offered as a next option', () => {
    expect(
      isNextQuestsResponseStale(response(['quest-1a', 'quest-1b']), 'quest-1a')
    ).toBe(true);
  });

  it('is fresh when the offered quests no longer include the completed one', () => {
    expect(isNextQuestsResponseStale(response(['quest-2']), 'quest-1a')).toBe(
      false
    );
  });

  it('is fresh when nothing has been completed locally', () => {
    expect(isNextQuestsResponseStale(response(['quest-1']), undefined)).toBe(
      false
    );
  });

  it('is fresh when there is no response yet', () => {
    expect(isNextQuestsResponseStale(undefined, 'quest-1')).toBe(false);
  });
});
