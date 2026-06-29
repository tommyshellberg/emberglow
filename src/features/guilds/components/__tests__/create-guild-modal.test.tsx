import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CreateGuildModal } from '../modals/create-guild-modal';
import {
  GUILD_FORM,
  GUILD_TITLES,
  GUILD_BUTTONS,
} from '../../constants/guild-strings';

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
jest.mock('@/components/ui/modal', () => ({
  Modal: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <>
      <span>{title}</span>
      {children}
    </>
  ),
  useModal: () => ({
    ref: { current: null },
    present: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

// Mock the GuildIcon component
jest.mock('../guild-icon', () => ({
  GuildIcon: ({ icon }: { icon: string }) => {
    const RN = jest.requireActual('react-native');
    return <RN.Text testID={`guild-icon-${icon}`}>{icon}</RN.Text>;
  },
}));

// Mock colors
jest.mock('@/components/ui/colors', () => ({
  __esModule: true,
  default: {
    guild: { 300: '#D4A574', 400: '#B8956A' },
    cream: { 300: '#E0E0E0', 500: '#F5F5F5' },
    primary: { 400: '#E55838' },
    neutral: { 400: '#666666' },
  },
}));

describe('CreateGuildModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal title', () => {
      const { getByText } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByText(GUILD_TITLES.CREATE_TITLE)).toBeTruthy();
    });

    it('should render name input', () => {
      const { getByPlaceholderText } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByPlaceholderText(GUILD_FORM.NAME_PLACEHOLDER)).toBeTruthy();
    });

    it('should render tagline input', () => {
      const { getByPlaceholderText } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByPlaceholderText(GUILD_FORM.TAGLINE_PLACEHOLDER)).toBeTruthy();
    });

    it('should render icon selector', () => {
      const { getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByTestId('icon-selector-grid')).toBeTruthy();
    });

    it('should render create button', () => {
      const { getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(getByTestId('create-guild-submit')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('should not submit when name and icon are missing', () => {
      // The form gates submission via a disabled button + a guard in
      // handleSubmit (requires a non-empty name and a selected icon), rather
      // than rendering an inline error message.
      const { getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.press(getByTestId('create-guild-submit'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('should call onSubmit with form data when valid', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Fill in the name
      fireEvent.changeText(
        getByPlaceholderText(GUILD_FORM.NAME_PLACEHOLDER),
        'Test Guild'
      );

      // Fill in tagline
      fireEvent.changeText(
        getByPlaceholderText(GUILD_FORM.TAGLINE_PLACEHOLDER),
        'A test tagline'
      );

      // Select an icon (required — the form no longer has a default icon)
      fireEvent.press(getByTestId('icon-button-flame'));

      // Submit
      fireEvent.press(getByTestId('create-guild-submit'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Guild',
            tagline: 'A test tagline',
            icon: 'flame',
          })
        );
      });
    });

    it('should allow selecting different icons', () => {
      const { getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Select flame icon
      fireEvent.press(getByTestId('icon-button-flame'));

      // Check that flame is now selected
      expect(getByTestId('selected-indicator-flame')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should disable submit button when loading', () => {
      const { getByTestId } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      const submitButton = getByTestId('create-guild-submit');
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should display error message when provided', () => {
      const { getByText } = render(
        <CreateGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
          error="Something went wrong"
        />
      );

      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });
});
