import { participantDisplayName, participantUserId } from './participants';

describe('participant accessors', () => {
  const populated = {
    userId: {
      id: 'u1',
      character: { name: 'Thorin', type: 'knight', level: 4 },
    },
    ready: false,
    phoneLocked: false,
    status: 'active',
  } as any;
  const raw = {
    userId: 'u2',
    ready: false,
    phoneLocked: false,
    status: 'active',
  } as any;

  it('reads the id from populated and raw shapes', () => {
    expect(participantUserId(populated)).toBe('u1');
    expect(participantUserId(raw)).toBe('u2');
  });
  it('falls back to a generic display name when unpopulated', () => {
    expect(participantDisplayName(populated)).toBe('Thorin');
    expect(participantDisplayName(raw)).toBe('Adventurer');
  });
});
