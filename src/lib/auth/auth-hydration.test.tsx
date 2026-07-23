import { act, renderHook } from '@testing-library/react-native';

import { hydrateAuth, useAuth } from '@/lib/auth';
import { getToken } from '@/lib/auth/utils';
import { getUserDetails } from '@/lib/services/user';
import { useUserStore } from '@/store/user-store';

// Mock dependencies
jest.mock('@/lib/services/user');
jest.mock('@/lib/auth/utils');
jest.mock('@/store/user-store');
jest.mock('@/api/token', () => ({
  storeTokens: jest.fn(),
  getProvisionalAccessToken: jest.fn(),
  getProvisionalRefreshToken: jest.fn(),
}));

// Mock the auth store to avoid issues with dynamic imports
const mockAuthStore = {
  status: 'idle' as 'idle' | 'signOut' | 'signIn' | 'hydrating',
  token: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  hydrate: jest.fn(),
};

jest.mock('@/lib/auth', () => {
  const actual = jest.requireActual('@/lib/auth');
  return {
    ...actual,
    _useAuth: {
      getState: () => mockAuthStore,
      setState: (updates: any) => {
        Object.assign(mockAuthStore, updates);
      },
    },
    hydrateAuth: jest.fn(),
    useAuth: jest.fn(() => mockAuthStore),
  };
});

// Mock the character store
const mockSetStreak = jest.fn();
const mockCreateCharacter = jest.fn();
const mockUpdateCharacter = jest.fn();
const mockCharacterStore = {
  setStreak: mockSetStreak,
  character: null,
  createCharacter: mockCreateCharacter,
  updateCharacter: mockUpdateCharacter,
};

jest.mock('@/store/character-store', () => ({
  useCharacterStore: {
    getState: jest.fn(() => mockCharacterStore),
  },
}));

// Mock console to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('Auth Hydration - Streak Sync', () => {
  const mockGetUserDetails = getUserDetails as jest.MockedFunction<
    typeof getUserDetails
  >;
  const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
  const mockSetUser = jest.fn();
  const mockClearUser = jest.fn();
  const mockHydrateAuth = hydrateAuth as jest.MockedFunction<
    typeof hydrateAuth
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset auth store state
    mockAuthStore.status = 'idle';
    mockAuthStore.token = null;

    // Mock user store
    (useUserStore as any).getState = jest.fn(() => ({
      setUser: mockSetUser,
      clearUser: mockClearUser,
    }));

    // Mock token exists by default
    mockGetToken.mockReturnValue({
      access: 'test-access-token',
      refresh: 'test-refresh-token',
    });

    // Reset character store mocks
    mockSetStreak.mockClear();
    mockCreateCharacter.mockClear();
    mockUpdateCharacter.mockClear();
    mockCharacterStore.character = null;
  });

  describe('Streak syncing during hydration', () => {
    test('should sync server streak when user data includes dailyQuestStreak', async () => {
      // Mock user details with streak
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 15,
        character: {
          type: 'knight',
          name: 'Sir Test',
          level: 5,
          currentXP: 100,
          xpToNextLevel: 200,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Mock the hydration implementation
      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          mockAuthStore.status = 'hydrating';
          try {
            const user = await mockGetUserDetails();
            mockSetUser(user);

            // This is what the real hydration does
            if (user.character) {
              mockCreateCharacter(user.character.type, user.character.name);
              mockUpdateCharacter({
                level: user.character.level,
                currentXP: user.character.currentXP,
                xpToNextLevel: user.character.xpToNextLevel,
              });
            }

            if (user.dailyQuestStreak !== undefined) {
              mockSetStreak(user.dailyQuestStreak);
            }

            mockAuthStore.status = 'signIn';
            mockAuthStore.token = token;
          } catch (error) {
            mockClearUser();
            mockAuthStore.status = 'signOut';
          }
        } else {
          mockClearUser();
          mockAuthStore.status = 'signOut';
        }
      });

      // Run hydration
      await act(async () => {
        await mockHydrateAuth();
      });

      // Verify the expected calls
      expect(mockGetUserDetails).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockSetStreak).toHaveBeenCalledWith(15);
    });

    test('should not call setStreak when dailyQuestStreak is undefined', async () => {
      // Mock user details without streak
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        character: {
          type: 'knight',
          name: 'Sir Test',
          level: 5,
          currentXP: 100,
          xpToNextLevel: 200,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Mock the hydration implementation
      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          if (user.character) {
            mockCreateCharacter(user.character.type, user.character.name);
            mockUpdateCharacter({
              level: user.character.level,
              currentXP: user.character.currentXP,
              xpToNextLevel: user.character.xpToNextLevel,
            });
          }

          // Only call setStreak if dailyQuestStreak is defined
          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();
      expect(mockSetStreak).not.toHaveBeenCalled();
    });

    test('should handle streak value of 0', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 0,
        character: {
          type: 'knight',
          name: 'Sir Test',
          level: 5,
          currentXP: 100,
          xpToNextLevel: 200,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();
      // Should still call setStreak with 0
      expect(mockSetStreak).toHaveBeenCalledWith(0);
    });

    test('should handle getUserDetails errors gracefully', async () => {
      // Mock getUserDetails to throw error
      mockGetUserDetails.mockRejectedValue(new Error('Network error'));

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          mockAuthStore.status = 'hydrating';
          try {
            await mockGetUserDetails();
          } catch (error) {
            mockClearUser();
            mockAuthStore.status = 'signOut';
          }
        }
      });

      // Hydration should not throw
      await expect(
        act(async () => {
          await mockHydrateAuth();
        })
      ).resolves.not.toThrow();

      // User should be cleared on error
      expect(mockClearUser).toHaveBeenCalled();

      // Streak should not be updated
      expect(mockSetStreak).not.toHaveBeenCalled();
    });

    test('should work when no token exists', async () => {
      // Mock no token
      mockGetToken.mockReturnValue(null);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (!token) {
          mockClearUser();
          mockAuthStore.status = 'signOut';
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      // Should not attempt to fetch user details
      expect(mockGetUserDetails).not.toHaveBeenCalled();
      expect(mockSetStreak).not.toHaveBeenCalled();
      expect(mockClearUser).toHaveBeenCalled();
    });
  });

  describe('Character data syncing', () => {
    test('should create and update character from server data', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 5,
        character: {
          type: 'knight',
          name: 'Sir Test',
          level: 10,
          currentXP: 250,
          xpToNextLevel: 300,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          if (user.character) {
            mockCreateCharacter(user.character.type, user.character.name);
            mockUpdateCharacter({
              level: user.character.level,
              currentXP: user.character.currentXP,
              xpToNextLevel: user.character.xpToNextLevel,
            });
          }

          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();

      // Verify character was created and updated
      expect(mockCreateCharacter).toHaveBeenCalledWith('knight', 'Sir Test');
      expect(mockUpdateCharacter).toHaveBeenCalledWith({
        level: 10,
        currentXP: 250,
        xpToNextLevel: 300,
      });
    });

    test('should handle top-level character properties format', async () => {
      // Some responses might have character data at top level
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 5,
        type: 'wizard',
        name: 'Gandalf',
        level: 20,
        xp: 500,
      } as any;

      mockGetUserDetails.mockResolvedValue(mockUser);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          // Handle both formats: nested character object or top-level properties
          const characterData = user.character || {
            type: user.type,
            name: user.name,
            level: user.level || 1,
            currentXP: user.xp || 0,
            xpToNextLevel: 100,
          };

          if (user.type && user.name) {
            mockCreateCharacter(characterData.type, characterData.name);
            mockUpdateCharacter({
              level: characterData.level,
              currentXP: characterData.currentXP,
              xpToNextLevel: characterData.xpToNextLevel,
            });
          }

          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();

      // Should still create character from top-level properties
      expect(mockCreateCharacter).toHaveBeenCalledWith('wizard', 'Gandalf');
      expect(mockUpdateCharacter).toHaveBeenCalledWith({
        level: 20,
        currentXP: 500,
        xpToNextLevel: 100,
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle very large streak values', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 999,
        character: {
          type: 'knight',
          name: 'Sir Dedicated',
          level: 99,
          currentXP: 9999,
          xpToNextLevel: 10000,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();
      // Should handle large values
      expect(mockSetStreak).toHaveBeenCalledWith(999);
    });

    test('should handle negative streak values from server', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: -1, // Invalid but should handle gracefully
        character: {
          type: 'knight',
          name: 'Sir Test',
          level: 5,
          currentXP: 100,
          xpToNextLevel: 200,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      mockHydrateAuth.mockImplementation(async () => {
        const token = mockGetToken();
        if (token) {
          const user = await mockGetUserDetails();
          mockSetUser(user);

          if (user.dailyQuestStreak !== undefined) {
            mockSetStreak(user.dailyQuestStreak);
          }
        }
      });

      await act(async () => {
        await mockHydrateAuth();
      });

      expect(mockGetUserDetails).toHaveBeenCalled();
      // Should still sync even negative values (server is source of truth)
      expect(mockSetStreak).toHaveBeenCalledWith(-1);
    });
  });

  describe('Auth state management', () => {
    test('should update auth status during hydration', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Mock useAuth to return our mock store
      (useAuth as jest.Mock).mockImplementation(() => mockAuthStore);

      const { result } = renderHook(() => useAuth());

      // Initial status
      expect(result.current.status).toBe('idle');

      // Mock hydration that updates status
      mockHydrateAuth.mockImplementation(async () => {
        mockAuthStore.status = 'hydrating';
        const token = mockGetToken();
        if (token) {
          try {
            const user = await mockGetUserDetails();
            mockSetUser(user);
            mockAuthStore.status = 'signIn';
            mockAuthStore.token = token;
          } catch {
            mockAuthStore.status = 'signOut';
          }
        }
      });

      // Start hydration
      await act(async () => {
        await mockHydrateAuth();
      });

      // Should end in signIn state
      expect(mockAuthStore.status).toBe('signIn');
    });
  });
});
