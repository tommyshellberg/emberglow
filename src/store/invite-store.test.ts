import { useInviteStore } from './invite-store';

describe('invite store', () => {
  beforeEach(() => {
    useInviteStore.setState({ pendingInvite: null, stashedCode: null, matchChecked: false });
  });

  test('setPendingInvite / clearPendingInvite round-trip', () => {
    useInviteStore.getState().setPendingInvite({ code: 'A1B2C3D4', inviterName: 'Freya' });
    expect(useInviteStore.getState().pendingInvite).toEqual({ code: 'A1B2C3D4', inviterName: 'Freya' });
    useInviteStore.getState().clearPendingInvite();
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('consumeStashedCode returns the code exactly once', () => {
    useInviteStore.getState().stashCode('A1B2C3D4');
    expect(useInviteStore.getState().consumeStashedCode()).toBe('A1B2C3D4');
    expect(useInviteStore.getState().consumeStashedCode()).toBeNull();
  });
});
