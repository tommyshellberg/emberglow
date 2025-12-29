import { act, renderHook } from '@testing-library/react-native';

import { useGuildStore, guildSelectors } from './guild-store';

describe('Guild Store', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useGuildStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('should have null currentGuildId', () => {
      const { result } = renderHook(() => useGuildStore());
      expect(result.current.currentGuildId).toBeNull();
    });

    it('should have all modals closed', () => {
      const { result } = renderHook(() => useGuildStore());
      expect(result.current.isCreateModalOpen).toBe(false);
      expect(result.current.isJoinModalOpen).toBe(false);
      expect(result.current.isInviteCodeModalOpen).toBe(false);
    });

    it('should have null inviteCodeGuildId', () => {
      const { result } = renderHook(() => useGuildStore());
      expect(result.current.inviteCodeGuildId).toBeNull();
    });
  });

  describe('setCurrentGuild', () => {
    it('should set the current guild ID', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.setCurrentGuild('guild-123');
      });

      expect(result.current.currentGuildId).toBe('guild-123');
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.setCurrentGuild('guild-123');
      });

      act(() => {
        result.current.setCurrentGuild(null);
      });

      expect(result.current.currentGuildId).toBeNull();
    });
  });

  describe('create modal', () => {
    it('should open and close the create modal', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.openCreateModal();
      });
      expect(result.current.isCreateModalOpen).toBe(true);

      act(() => {
        result.current.closeCreateModal();
      });
      expect(result.current.isCreateModalOpen).toBe(false);
    });
  });

  describe('join modal', () => {
    it('should open and close the join modal', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.openJoinModal();
      });
      expect(result.current.isJoinModalOpen).toBe(true);

      act(() => {
        result.current.closeJoinModal();
      });
      expect(result.current.isJoinModalOpen).toBe(false);
    });
  });

  describe('invite code modal', () => {
    it('should open with guild ID and close clearing the ID', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.openInviteCodeModal('guild-456');
      });
      expect(result.current.isInviteCodeModalOpen).toBe(true);
      expect(result.current.inviteCodeGuildId).toBe('guild-456');

      act(() => {
        result.current.closeInviteCodeModal();
      });
      expect(result.current.isInviteCodeModalOpen).toBe(false);
      expect(result.current.inviteCodeGuildId).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useGuildStore());

      // Set various states
      act(() => {
        result.current.setCurrentGuild('guild-789');
        result.current.openCreateModal();
        result.current.openInviteCodeModal('guild-abc');
      });

      // Verify states are set
      expect(result.current.currentGuildId).toBe('guild-789');
      expect(result.current.isCreateModalOpen).toBe(true);
      expect(result.current.isInviteCodeModalOpen).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.currentGuildId).toBeNull();
      expect(result.current.isCreateModalOpen).toBe(false);
      expect(result.current.isJoinModalOpen).toBe(false);
      expect(result.current.isInviteCodeModalOpen).toBe(false);
      expect(result.current.inviteCodeGuildId).toBeNull();
    });
  });

  describe('selectors', () => {
    it('should select currentGuildId', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.setCurrentGuild('guild-select-test');
      });

      const state = useGuildStore.getState();
      expect(guildSelectors.currentGuildId(state)).toBe('guild-select-test');
    });

    it('should select modal states', () => {
      const { result } = renderHook(() => useGuildStore());

      act(() => {
        result.current.openCreateModal();
      });

      const state = useGuildStore.getState();
      expect(guildSelectors.isCreateModalOpen(state)).toBe(true);
      expect(guildSelectors.isJoinModalOpen(state)).toBe(false);
    });
  });
});
