import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import GuildDetailScreen from './[id]';

// Mock expo-router
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'guild-123' }),
  useRouter: () => mockRouter,
}));

// Mock the guild hook
const mockGuildData = {
  id: 'guild-123',
  name: 'Test Guild',
  icon: 'shield',
  tagline: 'A test guild',
  owner: {
    id: 'user-1',
    email: 'owner@test.com',
    character: { name: 'TestOwner' },
  },
  members: [
    {
      id: 'user-1',
      email: 'owner@test.com',
      character: { name: 'TestOwner' },
    },
    {
      id: 'user-2',
      email: 'member@test.com',
      character: { name: 'TestMember' },
    },
  ],
  stats: {
    questCount: 10,
    totalMinutes: 300,
  },
  inviteCode: 'ABC12345',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

jest.mock('@/features/guilds/hooks', () => ({
  useGuild: jest.fn(() => ({
    data: mockGuildData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useLeaveGuild: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useGenerateInviteCode: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdateGuild: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

// Mock user store
jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector({
      user: { id: 'user-1', email: 'owner@test.com' },
    })
  ),
}));

// Mock UI components to avoid navigation context issues
jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  return {
    View: RN.View,
    Text: RN.Text,
    Card: ({ children, ...props }: any) => (
      <RN.View testID="card" {...props}>
        {children}
      </RN.View>
    ),
    Pressable: RN.Pressable,
    ScrollView: RN.ScrollView,
    FocusAwareStatusBar: () => null,
    ScreenContainer: ({ children }: any) => <RN.View>{children}</RN.View>,
    ScreenHeader: ({ title, showBackButton, onBackPress, rightComponent }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {showBackButton && (
          <RN.Pressable onPress={onBackPress}>
            <RN.Text>Back</RN.Text>
          </RN.Pressable>
        )}
        {rightComponent}
      </RN.View>
    ),
    Image: ({ source, style, ...props }: any) => (
      <RN.View testID="ui-image" style={style} {...props} />
    ),
    Button: ({ label, onPress, loading, disabled, ...props }: any) => (
      <RN.Pressable onPress={onPress} disabled={disabled || loading} {...props}>
        <RN.Text>{loading ? 'Loading...' : label}</RN.Text>
      </RN.Pressable>
    ),
  };
});

// Mock colors - need __esModule and default for default export
jest.mock('@/components/ui/colors', () => ({
  __esModule: true,
  default: {
    guild: { 300: '#D4A574', 400: '#C49464' },
    neutral: { 300: '#888888' },
    cream: { 500: '#F5F5F5' },
    richBlack: { 500: '#000000' },
  },
}));

// Mock the Modal component
jest.mock('@/components/ui/modal', () => {
  const React = jest.requireActual('react');
  return {
    Modal: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
      }));
      return children;
    }),
    useModal: () => ({
      ref: { current: { present: jest.fn(), dismiss: jest.fn() } },
      present: jest.fn(),
      dismiss: jest.fn(),
    }),
  };
});

// Mock gorhom bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  return {
    BottomSheetModal: jest.fn(({ children }) => children),
    BottomSheetModalProvider: jest.fn(({ children }) => children),
    BottomSheetBackdrop: jest.fn(() => null),
    BottomSheetView: jest.fn(({ children }) => children),
    BottomSheetScrollView: jest.fn(({ children }) => children),
    BottomSheetFlatList: jest.fn((props) =>
      React.createElement('FlatList', props)
    ),
    createBottomSheetScrollableComponent: jest.fn(() =>
      jest.fn(({ children }: { children: React.ReactNode }) => children)
    ),
    useBottomSheet: () => ({ close: jest.fn() }),
    SCROLLABLE_TYPE: {
      FLATLIST: 'FlatList',
      SCROLLVIEW: 'ScrollView',
      SECTIONLIST: 'SectionList',
      VIRTUALIZED_LIST: 'VirtualizedList',
    },
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

describe('GuildDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the guild name', async () => {
      const { getAllByText } = render(<GuildDetailScreen />);

      await waitFor(() => {
        // Guild name appears in header and content
        expect(getAllByText('Test Guild').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render the guild tagline', async () => {
      const { getByText } = render(<GuildDetailScreen />);

      await waitFor(() => {
        expect(getByText('A test guild')).toBeTruthy();
      });
    });

    it('should render the members section', async () => {
      const { getByText } = render(<GuildDetailScreen />);

      await waitFor(() => {
        expect(getByText(/Members/i)).toBeTruthy();
      });
    });

    it('should render member count', async () => {
      const { getByText } = render(<GuildDetailScreen />);

      await waitFor(() => {
        // Should show 2/10 (2 members, max 10)
        expect(getByText(/2/)).toBeTruthy();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when fetching', () => {
      const { useGuild } = require('@/features/guilds/hooks');
      useGuild.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
      });

      const { getByTestId } = render(<GuildDetailScreen />);

      expect(getByTestId('guild-loading')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should show error message when fetch fails', () => {
      const { useGuild } = require('@/features/guilds/hooks');
      useGuild.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
      });

      const { getByText } = render(<GuildDetailScreen />);

      expect(getByText(/Unable to load guild/i)).toBeTruthy();
    });
  });

  describe('owner actions', () => {
    it('should show owner-specific actions when user is owner', async () => {
      const { getByTestId } = render(<GuildDetailScreen />);

      await waitFor(() => {
        expect(getByTestId('guild-settings-button')).toBeTruthy();
      });
    });
  });
});
