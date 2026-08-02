import { matchInvite, resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

import { checkInviteMatch } from './check-invite-match';

jest.mock('@/lib/services/invite-link', () => ({
  matchInvite: jest.fn(),
  resolveInviteCode: jest.fn(),
}));
jest.mock('react-native-play-install-referrer', () => ({
  PlayInstallReferrer: { getInstallReferrerInfo: jest.fn((cb: any) => cb(null, null)) },
}));

describe('checkInviteMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInviteStore.setState({ pendingInvite: null, stashedCode: null, matchChecked: false });
  });

  test('a stashed universal-link code wins: resolve, never fingerprint-match', async () => {
    useInviteStore.getState().stashCode('A1B2C3D4');
    (resolveInviteCode as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4', inviter: { characterName: 'Freya' }, isSelf: false, alreadyFriends: false,
    });

    await checkInviteMatch();

    expect(resolveInviteCode).toHaveBeenCalledWith('A1B2C3D4');
    expect(matchInvite).not.toHaveBeenCalled();
    expect(useInviteStore.getState().pendingInvite).toEqual({ code: 'A1B2C3D4', inviterName: 'Freya' });
  });

  test('no stash: fingerprint match sets the pending invite', async () => {
    (matchInvite as jest.Mock).mockResolvedValue({
      matched: true, kind: 'friend', code: 'A1B2C3D4', inviter: { characterName: 'Freya' },
    });

    await checkInviteMatch();

    expect(useInviteStore.getState().pendingInvite?.inviterName).toBe('Freya');
    expect(useInviteStore.getState().matchChecked).toBe(true);
  });

  test('self/friends resolves and campaign matches stay invisible', async () => {
    useInviteStore.getState().stashCode('A1B2C3D4');
    (resolveInviteCode as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4', inviter: { characterName: 'Me' }, isSelf: true, alreadyFriends: false,
    });
    await checkInviteMatch();
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('network failure leaves matchChecked false so a later launch retries', async () => {
    (matchInvite as jest.Mock).mockRejectedValue(new Error('offline'));
    await checkInviteMatch();
    expect(useInviteStore.getState().matchChecked).toBe(false);
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('does nothing when already checked', async () => {
    useInviteStore.setState({ matchChecked: true });
    await checkInviteMatch();
    expect(matchInvite).not.toHaveBeenCalled();
  });
});
