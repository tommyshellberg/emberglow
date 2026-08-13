import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { Share } from 'react-native';

import { getInviteLink } from '@/lib/services/invite-link';
import * as posthogModule from '@/lib/posthog';

import { InviteLinkButton } from './invite-link-button';

jest.mock('@/lib/services/invite-link', () => ({ getInviteLink: jest.fn() }));
jest.mock('@/lib/posthog');
jest
  .spyOn(Share, 'share')
  .mockResolvedValue({ action: Share.sharedAction } as any);

describe('InviteLinkButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction } as any);
  });
  test('press → fetch link → share sheet with the src-tagged URL', async () => {
    (getInviteLink as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4',
      url: 'https://emberglowapp.com/i/A1B2C3D4',
    });

    render(<InviteLinkButton />);
    fireEvent.press(screen.getByTestId('invite-link-button'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'https://emberglowapp.com/i/A1B2C3D4?src=profile'
          ),
        })
      );
    });

    // Verify PostHog event is captured after successful share
    await waitFor(() => {
      expect(posthogModule.posthogClient.capture).toHaveBeenCalledWith(
        'invite_link_shared',
        { src: 'profile' }
      );
    });
  });

  test('share failure is silent (no crash, no share sheet)', async () => {
    (getInviteLink as jest.Mock).mockRejectedValue(new Error('network'));
    render(<InviteLinkButton />);
    fireEvent.press(screen.getByTestId('invite-link-button'));
    await waitFor(() => expect(getInviteLink).toHaveBeenCalled());
    expect(Share.share).not.toHaveBeenCalled();
  });

  test('user dismisses share sheet → no PostHog capture', async () => {
    (getInviteLink as jest.Mock).mockResolvedValue({
      code: 'A1B2C3D4',
      url: 'https://emberglowapp.com/i/A1B2C3D4',
    });
    (Share.share as jest.Mock).mockResolvedValueOnce({
      action: Share.dismissedAction,
    });

    render(<InviteLinkButton />);
    fireEvent.press(screen.getByTestId('invite-link-button'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });

    // Verify PostHog event is NOT captured when share is dismissed
    expect(posthogModule.posthogClient.capture).not.toHaveBeenCalled();
  });
});
