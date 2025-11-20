/**
 * Tests for Profile Screen Custom Hooks
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { useCharacterSync } from './profile-hooks';

describe('useCharacterSync', () => {
  let mockCharacterStore: any;
  let mockGetStorageItem: jest.Mock;
  let mockGetUserDetails: jest.Mock;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock character store
    mockCharacterStore = jest.fn((selector) => {
      if (selector) {
        return selector({
          character: null,
          createCharacter: jest.fn(),
          updateCharacter: jest.fn(),
          setStreak: jest.fn(),
        });
      }
      return {
        character: null,
        createCharacter: jest.fn(),
        updateCharacter: jest.fn(),
        setStreak: jest.fn(),
      };
    });
    mockCharacterStore.getState = jest.fn(() => ({
      character: null,
      createCharacter: jest.fn(),
      updateCharacter: jest.fn(),
      setStreak: jest.fn(),
    }));

    // Create mock storage
    mockGetStorageItem = jest.fn(() => null);

    // Create mock user service
    mockGetUserDetails = jest.fn();

    // Create mock router
    mockRouter = {
      replace: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when character exists', () => {
    it('should not call getUserDetails', () => {
      mockCharacterStore.mockImplementation((selector) => {
        if (selector) {
          return selector({
            character: { name: 'TestHero', type: 'knight', level: 5, currentXP: 150 },
          });
        }
        return { character: { name: 'TestHero', type: 'knight', level: 5, currentXP: 150 } };
      });

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      expect(result.current.isRedirecting).toBe(false);
      expect(mockGetUserDetails).not.toHaveBeenCalled();
    });
  });

  describe('when character does not exist', () => {
    it('should sync character from server for verified users with legacy format', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        type: 'wizard',
        name: 'MerlinTheWise',
        level: 10,
        xp: 500,
        dailyQuestStreak: 7,
      };

      const mockStoreInstance = {
        createCharacter: jest.fn(),
        updateCharacter: jest.fn(),
        setStreak: jest.fn(),
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockCharacterStore.getState.mockReturnValue(mockStoreInstance);

      renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockStoreInstance.createCharacter).toHaveBeenCalledWith('wizard', 'MerlinTheWise');
      });

      expect(mockStoreInstance.updateCharacter).toHaveBeenCalledWith({
        type: 'wizard',
        name: 'MerlinTheWise',
        level: 10,
        currentXP: 500,
      });

      expect(mockStoreInstance.setStreak).toHaveBeenCalledWith(7);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should handle user with legacy character data but missing streak', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        type: 'knight',
        name: 'BraveSir',
        level: 3,
        xp: 75,
        // No dailyQuestStreak
      };

      const mockStoreInstance = {
        createCharacter: jest.fn(),
        updateCharacter: jest.fn(),
        setStreak: jest.fn(),
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockCharacterStore.getState.mockReturnValue(mockStoreInstance);

      renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      // First wait for getUserDetails to be called
      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockStoreInstance.createCharacter).toHaveBeenCalledWith('knight', 'BraveSir');
      });

      expect(mockStoreInstance.updateCharacter).toHaveBeenCalledWith({
        type: 'knight',
        name: 'BraveSir',
        level: 3,
        currentXP: 75,
      });

      // Should not call setStreak if dailyQuestStreak is undefined
      expect(mockStoreInstance.setStreak).not.toHaveBeenCalled();
    });

    it('should default to level 1 if level is missing', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        type: 'scout',
        name: 'SwiftRunner',
        // No level
        xp: 0,
      };

      const mockStoreInstance = {
        createCharacter: jest.fn(),
        updateCharacter: jest.fn(),
        setStreak: jest.fn(),
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockCharacterStore.getState.mockReturnValue(mockStoreInstance);

      renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      // First wait for getUserDetails to be called
      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockStoreInstance.updateCharacter).toHaveBeenCalledWith({
          type: 'scout',
          name: 'SwiftRunner',
          level: 1,
          currentXP: 0,
        });
      });
    });

    it('should redirect provisional users to onboarding when no character', async () => {
      jest.useRealTimers();

      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        // No character data (type, name, level)
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockGetStorageItem.mockImplementation((key) => {
        if (key === 'provisionalUserId') return 'provisional-123';
        return null;
      });

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(
        () => {
          expect(result.current.isRedirecting).toBe(true);
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/choose-character');
        },
        { timeout: 3000 }
      );

      jest.useFakeTimers();
    });

    it('should redirect when provisional access token exists', async () => {
      jest.useRealTimers();

      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockGetStorageItem.mockImplementation((key) => {
        if (key === 'provisionalAccessToken') return 'token-abc';
        return null;
      });

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(
        () => {
          expect(result.current.isRedirecting).toBe(true);
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/choose-character');
        },
        { timeout: 3000 }
      );

      jest.useFakeTimers();
    });

    it('should redirect when provisional email exists', async () => {
      jest.useRealTimers();

      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      mockGetStorageItem.mockImplementation((key) => {
        if (key === 'provisionalEmail') return 'provisional@example.com';
        return null;
      });

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(
        () => {
          expect(result.current.isRedirecting).toBe(true);
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/choose-character');
        },
        { timeout: 3000 }
      );

      jest.useFakeTimers();
    });

    it('should not redirect verified users without character data', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'verified@example.com',
        // No character data
      };

      mockGetUserDetails.mockResolvedValue(mockUser);
      // No provisional data
      mockGetStorageItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      // Should not redirect for verified users
      expect(result.current.isRedirecting).toBe(false);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockGetUserDetails.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCharacterSync({
          characterStore: mockCharacterStore,
          getStorageItem: mockGetStorageItem,
          getUserDetails: mockGetUserDetails,
          router: mockRouter,
        })
      );

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      // Should not crash or redirect
      expect(result.current.isRedirecting).toBe(false);
      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Should log the error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error syncing character data:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
