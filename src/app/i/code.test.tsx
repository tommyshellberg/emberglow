import { router } from 'expo-router';

import { getAccessToken } from '@/api/token';
import { hasProvisionalSession } from '@/lib/auth/provisional-session';
import { checkInviteMatch } from '@/lib/invite/check-invite-match';
import { render, waitFor } from '@/lib/test-utils';
import { useInviteStore } from '@/store/invite-store';

import InviteLinkScreen from './[code]';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ code: 'A1B2C3D4' }),
}));
jest.mock('@/api/token', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/auth/provisional-session', () => ({
  hasProvisionalSession: jest.fn(),
}));
jest.mock('@/lib/invite/check-invite-match', () => ({
  checkInviteMatch: jest.fn().mockResolvedValue(undefined),
}));

describe('invite universal link route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInviteStore.setState({
      pendingInvite: null,
      stashedCode: null,
      matchChecked: false,
    });
  });

  test('with a full session: stashes the code and fires the consumer', async () => {
    (getAccessToken as jest.Mock).mockReturnValue('token');
    (hasProvisionalSession as jest.Mock).mockReturnValue(false);

    render(<InviteLinkScreen />);

    await waitFor(() =>
      expect(useInviteStore.getState().stashedCode).toBe('A1B2C3D4')
    );
    expect(checkInviteMatch).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  test('with only a provisional session: still fires the consumer', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);
    (hasProvisionalSession as jest.Mock).mockReturnValue(true);

    render(<InviteLinkScreen />);

    await waitFor(() =>
      expect(useInviteStore.getState().stashedCode).toBe('A1B2C3D4')
    );
    expect(checkInviteMatch).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  test('without any session: stashes for post-onboarding, no consumer call', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);
    (hasProvisionalSession as jest.Mock).mockReturnValue(false);

    render(<InviteLinkScreen />);

    await waitFor(() =>
      expect(useInviteStore.getState().stashedCode).toBe('A1B2C3D4')
    );
    expect(checkInviteMatch).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
