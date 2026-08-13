import { getItem } from '@/lib/storage';

import { hasProvisionalSession } from './provisional-session';

jest.mock('@/lib/storage');

const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;

/** Only the named key is present; every other key reads as absent. */
const onlyKey = (present: string, value: unknown = 'value') =>
  mockGetItem.mockImplementation((key: string) =>
    key === present ? (value as any) : null
  );

describe('hasProvisionalSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null);
  });

  it('is false when no provisional keys are on disk', () => {
    expect(hasProvisionalSession()).toBe(false);
  });

  // Both arms of the OR, because a guest can be missing either half: the
  // user id is written before the tokens (createProvisionalUser), and the
  // access token is the half `hydrate()` keys off.
  it.each(['provisionalUserId', 'provisionalAccessToken'])(
    'is true when %s alone is on disk',
    (key) => {
      onlyKey(key);

      expect(hasProvisionalSession()).toBe(true);
    }
  );

  // The refresh token deliberately SURVIVES conversion (verifyMagicLink and
  // socialSignIn clear the other three and leave it), so counting it would
  // wall every converted user out of the app forever.
  it('is false when only the provisional refresh token survives (post-conversion)', () => {
    onlyKey('provisionalRefreshToken');

    expect(hasProvisionalSession()).toBe(false);
  });

  // The three-key sites (resolver sync effect, profile-hooks) ask a different
  // question and keep their own check — this helper must not silently answer
  // it, or migrating them later becomes a no-op that looks safe.
  it('is false when only the provisional email is on disk', () => {
    onlyKey('provisionalEmail');

    expect(hasProvisionalSession()).toBe(false);
  });
});
