import { apiClient } from '@/api/common/client';

import { claimInvite, getInviteLink, matchInvite, resolveInviteCode } from './invite-link';

jest.mock('@/api/common/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

describe('invite-link service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getInviteLink hits GET /users/me/invite-link', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { code: 'A1B2C3D4', url: 'https://emberglowapp.com/i/A1B2C3D4' } });
    const result = await getInviteLink();
    expect(apiClient.get).toHaveBeenCalledWith('/users/me/invite-link');
    expect(result.url).toContain('/i/A1B2C3D4');
  });

  test('matchInvite posts platform + optional referrer', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { matched: false } });
    await matchInvite({ platform: 'android', installReferrer: 'emberglow_invite=A1B2C3D4' });
    expect(apiClient.post).toHaveBeenCalledWith('/invites/match', {
      platform: 'android',
      installReferrer: 'emberglow_invite=A1B2C3D4',
    });
  });

  test('resolveInviteCode and claimInvite target the right endpoints', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { code: 'A1B2C3D4', inviter: { characterName: 'Freya' }, isSelf: false, alreadyFriends: false } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { status: 'created', invitationId: 'x' } });

    await resolveInviteCode('A1B2C3D4');
    expect(apiClient.get).toHaveBeenCalledWith('/invites/resolve/A1B2C3D4');

    const claim = await claimInvite('A1B2C3D4');
    expect(apiClient.post).toHaveBeenCalledWith('/invites/claim', { code: 'A1B2C3D4' });
    expect(claim.status).toBe('created');
  });
});
