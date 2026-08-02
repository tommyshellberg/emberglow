import { render, waitFor } from '@/lib/test-utils';
import { router } from 'expo-router';

import { getAccessToken } from '@/api/token';
import { resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

import InviteLinkScreen from './[code]';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ code: 'A1B2C3D4' }),
}));
jest.mock('@/api/token', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/services/invite-link', () => ({
  resolveInviteCode: jest.fn(),
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

  test('with a session: resolves and queues the confirm', async () => {
    (getAccessToken as jest.Mock).mockReturnValue('token');
    (resolveInviteCode as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4',
      inviter: { characterName: 'Freya' },
      isSelf: false,
      alreadyFriends: false,
    });

    render(<InviteLinkScreen />);

    await waitFor(() =>
      expect(useInviteStore.getState().pendingInvite?.inviterName).toBe(
        'Freya'
      )
    );
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  test('without a session: stashes the code for post-onboarding', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);

    render(<InviteLinkScreen />);

    await waitFor(() =>
      expect(useInviteStore.getState().stashedCode).toBe('A1B2C3D4')
    );
    expect(resolveInviteCode).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
