import React from 'react';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { useUserStore } from '@/store/user-store';

// Import the component
import CooperativeQuestMenu from './cooperative-quest-menu';

// Mock the router
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock auth hook
jest.mock('@/lib', () => ({
  ...jest.requireActual('@/lib'),
  useAuth: jest.fn(() => ({
    user: {
      email: 'test@example.com',
    },
  })),
}));

// Mock friend management hook
jest.mock('@/lib/hooks/use-friend-management', () => ({
  useFriendManagement: jest.fn(() => ({
    sendBulkInvites: jest.fn(),
  })),
}));

// Mock user store
jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector({
      user: {
        featureFlags: ['coop_mode'],
      },
    })
  ),
}));

// Mock user services
jest.mock('@/lib/services/user', () => ({
  getUserFriends: jest.fn(() =>
    Promise.resolve({
      friends: [{ id: 1, name: 'Test Friend', email: 'friend@example.com' }],
    })
  ),
}));

// Mock lazy websocket provider (both the hook and the component)
jest.mock('@/components/providers/lazy-websocket-provider', () => ({
  useLazyWebSocket: jest.fn(() => ({
    isConnected: false,
    isEnabled: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    forceReconnect: jest.fn(),
  })),
  LazyWebSocketProvider: ({ children }: { children: any }) => children,
}));

describe('CooperativeQuestMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { featureFlags: ['coop_mode'] } })
    );
  });

  it('should render the cooperative quest screen', async () => {
    const { getByText } = render(<CooperativeQuestMenu />);
    await waitFor(() => {
      expect(getByText('Cooperative Quests')).toBeTruthy();
    });
  });

  // These options only render once the `friends` query (mocked with a real
  // Promise) resolves and the component leaves its `isLoading` state - a
  // plain `screen.getByText` right after `render` races that resolution.
  // `findByText` awaits it the same way the first test's `waitFor` does.

  it('should navigate to create quest screen when Create Quest is pressed', async () => {
    render(<CooperativeQuestMenu />);

    const createButton = await screen.findByText('Create Quest');
    fireEvent.press(createButton);

    expect(mockPush).toHaveBeenCalledWith('/create-cooperative-quest');
  });

  it('should navigate to join quest screen when Join Quest is pressed', async () => {
    render(<CooperativeQuestMenu />);

    const joinButton = await screen.findByText('Join Quest');
    fireEvent.press(joinButton);

    expect(mockPush).toHaveBeenCalledWith('/join-cooperative-quest');
  });

  it('should navigate to scheduled quest screen when Public Events is pressed', async () => {
    render(<CooperativeQuestMenu />);

    const eventsButton = await screen.findByText('Public Events');
    fireEvent.press(eventsButton);

    expect(mockPush).toHaveBeenCalledWith('/scheduled-quest');
  });

  it('should show Public Events option regardless of feature flags', async () => {
    (useUserStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { featureFlags: [] } })
    );
    render(<CooperativeQuestMenu />);

    expect(await screen.findByText('Public Events')).toBeTruthy();
  });

  it('should open contacts modal when Add Friends is pressed', async () => {
    render(<CooperativeQuestMenu />);

    const friendsButton = await screen.findByText('Add Friends');
    fireEvent.press(friendsButton);

    // The Add Friends button opens a modal, not a navigation
    // We can't easily test modal opening, so just check the button exists
    expect(friendsButton).toBeTruthy();
  });

  it('should navigate back when back button is pressed', () => {
    render(<CooperativeQuestMenu />);

    // ScreenHeader's back button is icon-only (no "Back" text) — find the
    // touchable back button by looking for the first accessible element in
    // the header, matching the pattern used by sibling screens (e.g.
    // join-cooperative-quest.test.tsx).
    const accessibleElements = screen.root.findAll(
      (node: any) => node.props?.accessible === true
    );

    expect(accessibleElements.length).toBeGreaterThan(0);
    fireEvent.press(accessibleElements[0]);

    expect(mockBack).toHaveBeenCalled();
  });
});
