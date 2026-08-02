import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { claimInvite } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

import { InviteConfirmModal } from './invite-confirm-modal';

jest.mock('@/lib/services/invite-link', () => ({ claimInvite: jest.fn() }));

describe('InviteConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInviteStore.setState({
      pendingInvite: { code: 'A1B2C3D4', inviterName: 'Freya' },
      stashedCode: null,
      matchChecked: true,
    });
  });

  test('names the inviter; confirm claims and clears', async () => {
    (claimInvite as jest.Mock).mockResolvedValue({ status: 'created', invitationId: 'x' });

    render(<InviteConfirmModal />);
    expect(screen.getByText(/Freya invited you/i)).toBeTruthy();

    fireEvent.press(screen.getByTestId('invite-confirm-accept'));
    await waitFor(() => expect(claimInvite).toHaveBeenCalledWith('A1B2C3D4'));
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('dismiss clears WITHOUT claiming', () => {
    render(<InviteConfirmModal />);
    fireEvent.press(screen.getByTestId('invite-confirm-dismiss'));
    expect(claimInvite).not.toHaveBeenCalled();
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('renders nothing when no pending invite', () => {
    useInviteStore.setState({ pendingInvite: null });
    render(<InviteConfirmModal />);
    expect(screen.queryByTestId('invite-confirm-accept')).toBeNull();
  });
});
