import * as userService from '@/lib/services/user';
import { act, renderHook, waitFor } from '@/lib/test-utils';
import { useUserStore } from '@/store/user-store';

import { useProfileData } from './use-profile-data';

jest.mock('@/lib/services/user', () => ({
  getUserDetails: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetUserDetails = userService.getUserDetails as jest.Mock;

// The stale snapshot the store holds after sign-in: this account had ONE
// completed quest when it signed in. Every number below differs from the
// server response used in the tests, so an assertion cannot pass by the
// store simply keeping what it already had.
const STALE_USER = {
  id: 'user-1',
  email: 'chain@example.com',
  totalQuestsCompleted: 1,
  totalMinutesOffPhone: 2,
} as any;

const FRESH_SERVER_USER = {
  id: 'user-1',
  email: 'Chain@Example.com',
  totalQuestsCompleted: 2,
  totalMinutesOffPhone: 4,
} as any;

describe('useProfileData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({ user: STALE_USER });
  });

  it('replaces the stale user snapshot with the server response', async () => {
    mockGetUserDetails.mockResolvedValue(FRESH_SERVER_USER);

    const { result } = renderHook(() => useProfileData());

    await act(async () => {
      await result.current.fetchUserDetails();
    });

    const user = useUserStore.getState().user;
    expect(user?.totalQuestsCompleted).toBe(2);
    expect(user?.totalMinutesOffPhone).toBe(4);
  });

  it('still exposes the lower-cased email', async () => {
    mockGetUserDetails.mockResolvedValue(FRESH_SERVER_USER);

    const { result } = renderHook(() => useProfileData());

    await act(async () => {
      await result.current.fetchUserDetails();
    });

    await waitFor(() => {
      expect(result.current.userEmail).toBe('chain@example.com');
    });
  });

  it('keeps the existing snapshot when the fetch fails', async () => {
    mockGetUserDetails.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProfileData());

    await act(async () => {
      await result.current.fetchUserDetails();
    });

    // Stale-but-present beats a crash or a wiped store.
    expect(useUserStore.getState().user?.totalQuestsCompleted).toBe(1);
  });
});
