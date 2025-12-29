import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { JoinGuildModal } from '../modals/join-guild-modal';
import { GUILD_VALIDATION } from '../../constants/guild-strings';

// Mock the gorhom bottom-sheet with all needed exports
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

// Mock the Modal component
jest.mock('@/components/ui/modal', () => {
  const RN = jest.requireActual('react-native');
  return {
    Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {children}
      </RN.View>
    ),
    useModal: () => ({
      ref: { current: null },
      present: jest.fn(),
      dismiss: jest.fn(),
    }),
  };
});

describe('JoinGuildModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal title', () => {
      const { getByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByText('Join a Guild')).toBeTruthy();
    });

    it('should render invite code input', () => {
      const { getByTestId } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByTestId('guild-invite-code-input')).toBeTruthy();
    });

    it('should render join button', () => {
      const { getByTestId } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByTestId('join-guild-submit')).toBeTruthy();
    });

    it('should render helpful description text', () => {
      const { getByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByText(/Got an invite code from a friend/i)).toBeTruthy();
    });

    it('should render cancel button', () => {
      const { getByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('should show error when code is empty on submit', async () => {
      const { getByTestId, findByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.press(getByTestId('join-guild-submit'));

      expect(await findByText(GUILD_VALIDATION.INVITE_CODE_REQUIRED)).toBeTruthy();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid code format', async () => {
      const { getByTestId, findByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Enter an invalid code (too short)
      fireEvent.changeText(
        getByTestId('guild-invite-code-input'),
        'abc'
      );

      fireEvent.press(getByTestId('join-guild-submit'));

      expect(await findByText(GUILD_VALIDATION.INVITE_CODE_INVALID)).toBeTruthy();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('should call onSubmit with code when valid', async () => {
      const { getByTestId } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Enter a valid 8-character code
      fireEvent.changeText(
        getByTestId('guild-invite-code-input'),
        'ABCD1234'
      );

      fireEvent.press(getByTestId('join-guild-submit'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('ABCD1234');
      });
    });

    it('should auto-uppercase input', () => {
      const { getByTestId, getByDisplayValue } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.changeText(
        getByTestId('guild-invite-code-input'),
        'abcd1234'
      );

      expect(getByDisplayValue('ABCD1234')).toBeTruthy();
    });

    it('should call onClose when cancel is pressed', () => {
      const { getByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.press(getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable submit button when loading', () => {
      const { getByTestId } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      const submitButton = getByTestId('join-guild-submit');
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should display error message when provided', () => {
      const { getByText } = render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
          error="Invalid invite code"
        />
      );

      expect(getByText('Invalid invite code')).toBeTruthy();
    });
  });
});
