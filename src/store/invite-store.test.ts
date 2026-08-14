import { useInviteStore } from './invite-store';

describe('invite store', () => {
  beforeEach(() => {
    useInviteStore.setState({
      pendingInvite: null,
      stashedCode: null,
      matchChecked: false,
    });
  });

  test('setPendingInvite / clearPendingInvite round-trip', () => {
    useInviteStore
      .getState()
      .setPendingInvite({ code: 'A1B2C3D4', inviterName: 'Freya' });
    expect(useInviteStore.getState().pendingInvite).toEqual({
      code: 'A1B2C3D4',
      inviterName: 'Freya',
    });
    useInviteStore.getState().clearPendingInvite();
    expect(useInviteStore.getState().pendingInvite).toBeNull();
  });

  test('reset clears the pending invite, the stash, and matchChecked', () => {
    useInviteStore.setState({
      pendingInvite: { code: 'A1B2C3D4', inviterName: 'Freya' },
      stashedCode: 'A1B2C3D4',
      matchChecked: true,
    });

    useInviteStore.getState().reset();

    expect(useInviteStore.getState().pendingInvite).toBeNull();
    expect(useInviteStore.getState().stashedCode).toBeNull();
    expect(useInviteStore.getState().matchChecked).toBe(false);
  });

  test('consumeStashedCode returns the code exactly once', () => {
    useInviteStore.getState().stashCode('A1B2C3D4');
    expect(useInviteStore.getState().consumeStashedCode()).toBe('A1B2C3D4');
    expect(useInviteStore.getState().consumeStashedCode()).toBeNull();
  });
});
