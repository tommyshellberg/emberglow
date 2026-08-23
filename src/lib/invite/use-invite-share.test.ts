import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';
import { Share } from 'react-native';

import * as posthogModule from '@/lib/posthog';
import { getInviteLink } from '@/lib/services/invite-link';

import { useInviteShare } from './use-invite-share';

jest.mock('@/lib/services/invite-link', () => ({ getInviteLink: jest.fn() }));
jest.mock('@/lib/posthog');

describe('useInviteShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction } as any);
    (getInviteLink as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4',
      url: 'https://www.emberglowapp.com/i/A1B2C3D4',
    });
  });

  test('shareInvite fetches the link and opens the sheet with a src-tagged URL', async () => {
    const { result } = renderHook(() => useInviteShare('leaderboard'));

    await act(async () => {
      await result.current.shareInvite();
    });

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'https://www.emberglowapp.com/i/A1B2C3D4?src=leaderboard'
        ),
      })
    );
    expect(posthogModule.posthogClient.capture).toHaveBeenCalledWith(
      'invite_link_shared',
      { src: 'leaderboard' }
    );
  });

  test('a dismissed sheet captures nothing', async () => {
    (Share.share as jest.Mock).mockResolvedValueOnce({
      action: Share.dismissedAction,
    });
    const { result } = renderHook(() => useInviteShare('profile'));

    await act(async () => {
      await result.current.shareInvite();
    });

    expect(posthogModule.posthogClient.capture).not.toHaveBeenCalled();
  });

  test('a failed link fetch is silent and never opens the sheet', async () => {
    (getInviteLink as jest.Mock).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useInviteShare('profile'));

    await act(async () => {
      await result.current.shareInvite();
    });

    expect(Share.share).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  test('isSharing is true while the share is in flight', async () => {
    let resolveLink: (v: { code: string; url: string }) => void;
    (getInviteLink as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveLink = resolve;
      })
    );
    const { result } = renderHook(() => useInviteShare('profile'));

    let pending: Promise<void>;
    act(() => {
      pending = result.current.shareInvite();
    });
    await waitFor(() => expect(result.current.isSharing).toBe(true));

    await act(async () => {
      resolveLink!({ code: 'A1B2C3D4', url: 'https://x/i/A1B2C3D4' });
      await pending;
    });
    expect(result.current.isSharing).toBe(false);
  });
});
