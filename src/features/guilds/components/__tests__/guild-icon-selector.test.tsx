import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { GuildIconSelector } from '../guild-icon-selector';

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

describe('GuildIconSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all 8 guild icons', () => {
      const { getAllByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      const iconButtons = getAllByTestId(/^icon-button-/);
      expect(iconButtons).toHaveLength(10);
    });

    it('should render each icon', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      // Check a few specific icons
      expect(getByTestId('guild-icon-camping')).toBeTruthy();
      expect(getByTestId('guild-icon-flame')).toBeTruthy();
      expect(getByTestId('guild-icon-banner')).toBeTruthy();
    });
  });

  describe('selection state', () => {
    it('should mark the selected icon', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="flame" onSelect={mockOnSelect} />
      );

      // The selected icon should have the selected indicator
      expect(getByTestId('selected-indicator-flame')).toBeTruthy();
    });

    it('should not show selected indicator for non-selected icons', () => {
      const { queryByTestId } = render(
        <GuildIconSelector selected="flame" onSelect={mockOnSelect} />
      );

      // camping is not selected, so no indicator
      expect(queryByTestId('selected-indicator-camping')).toBeNull();
      expect(queryByTestId('selected-indicator-axe')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('should call onSelect with icon id when pressed', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      fireEvent.press(getByTestId('icon-button-flame'));

      expect(mockOnSelect).toHaveBeenCalledWith('flame');
    });

    it('should call onSelect even when pressing already selected icon', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      fireEvent.press(getByTestId('icon-button-camping'));

      expect(mockOnSelect).toHaveBeenCalledWith('camping');
    });

    it('should call onSelect with different icons', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      fireEvent.press(getByTestId('icon-button-magic'));
      expect(mockOnSelect).toHaveBeenCalledWith('magic');

      fireEvent.press(getByTestId('icon-button-explorer'));
      expect(mockOnSelect).toHaveBeenCalledWith('explorer');
    });
  });

  describe('accessibility', () => {
    it('should have accessible labels for each icon', () => {
      const { getByLabelText } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      // Each icon should have an accessible label
      expect(getByLabelText('Select Axe icon')).toBeTruthy();
      expect(getByLabelText('Select Camping icon')).toBeTruthy();
      expect(getByLabelText('Select Flame icon')).toBeTruthy();
    });

    it('should indicate selected state in accessibility', () => {
      const { getByLabelText } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      const selectedIcon = getByLabelText('Select Camping icon');
      expect(selectedIcon.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('layout', () => {
    it('should use a grid layout', () => {
      const { getByTestId } = render(
        <GuildIconSelector selected="camping" onSelect={mockOnSelect} />
      );

      const container = getByTestId('icon-selector-grid');
      expect(container).toBeTruthy();
    });
  });
});
