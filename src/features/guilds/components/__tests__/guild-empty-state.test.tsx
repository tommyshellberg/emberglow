import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { GuildEmptyState } from '../guild-empty-state';
import { GUILD_EMPTY_STATE, GUILD_BUTTONS } from '../../constants/guild-strings';

describe('GuildEmptyState', () => {
  const mockOnCreatePress = jest.fn();
  const mockOnJoinPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the title', () => {
      const { getByText } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByText(GUILD_EMPTY_STATE.TITLE)).toBeTruthy();
    });

    it('should render the description', () => {
      const { getByText } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByText(GUILD_EMPTY_STATE.DESCRIPTION)).toBeTruthy();
    });

    it('should render create button', () => {
      const { getByText } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByText(GUILD_BUTTONS.CREATE)).toBeTruthy();
    });

    it('should render join button', () => {
      const { getByText } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByText(GUILD_BUTTONS.JOIN)).toBeTruthy();
    });

    it('should render flame icon', () => {
      const { getByTestId } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByTestId('empty-state-icon')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onCreatePress when create button is pressed', () => {
      const { getByTestId } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      fireEvent.press(getByTestId('create-guild-button'));

      expect(mockOnCreatePress).toHaveBeenCalledTimes(1);
    });

    it('should call onJoinPress when join button is pressed', () => {
      const { getByTestId } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      fireEvent.press(getByTestId('join-guild-button'));

      expect(mockOnJoinPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have accessible labels for buttons', () => {
      const { getByLabelText } = render(
        <GuildEmptyState
          onCreatePress={mockOnCreatePress}
          onJoinPress={mockOnJoinPress}
        />
      );

      expect(getByLabelText('Create a new guild')).toBeTruthy();
      expect(getByLabelText('Join an existing guild with invite code')).toBeTruthy();
    });
  });
});
