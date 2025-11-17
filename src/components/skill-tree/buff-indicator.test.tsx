import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { BuffIndicator } from './buff-indicator';

describe('BuffIndicator', () => {
  describe('Visual display', () => {
    it('renders buff name', () => {
      render(<BuffIndicator name="Streak Master" active={true} />);

      expect(screen.getByText('Streak Master')).toBeTruthy();
    });

    it('renders buff icon when provided', () => {
      render(
        <BuffIndicator name="Streak Master" icon="flame" active={true} />
      );

      expect(screen.getByTestId('buff-icon-flame')).toBeTruthy();
    });

    it('shows active state visually', () => {
      render(<BuffIndicator name="Streak Master" active={true} />);

      const container = screen.getByTestId('buff-indicator-streak-master');
      expect(container.props.className).toContain('border-primary-400');
    });

    it('shows inactive state visually', () => {
      render(<BuffIndicator name="Second Wind" active={false} />);

      const container = screen.getByTestId('buff-indicator-second-wind');
      expect(container.props.className).toContain('opacity-40');
    });
  });

  describe('Expiration time', () => {
    it('shows time remaining when expiresAt is provided', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      render(
        <BuffIndicator
          name="Streak Bonus"
          active={true}
          expiresAt={futureTime}
        />
      );

      // Should show time in hours format
      const timeText = screen.queryByText('2h');
      expect(timeText).toBeTruthy();
    });

    it('does not show time when expiresAt is not provided', () => {
      render(<BuffIndicator name="Second Wind" active={true} />);

      expect(screen.queryByText(/h/)).toBeNull();
    });
  });

  describe('Charges', () => {
    it('shows charge count when provided', () => {
      render(
        <BuffIndicator name="Resilient Spirit" active={true} charges={2} />
      );

      expect(screen.getByText('2')).toBeTruthy();
    });

    it('does not show charges when not provided', () => {
      render(<BuffIndicator name="Streak Master" active={true} />);

      expect(screen.queryByTestId('buff-charges')).toBeNull();
    });

    it('shows zero charges correctly', () => {
      render(
        <BuffIndicator name="Resilient Spirit" active={false} charges={0} />
      );

      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('renders with correct test ID', () => {
      render(<BuffIndicator name="Test Buff" active={true} />);

      expect(screen.getByTestId('buff-indicator-test-buff')).toBeTruthy();
    });

    it('handles buff names with special characters in test ID', () => {
      render(<BuffIndicator name="Knight's Will" active={true} />);

      // Apostrophe gets split into dash, so "Knight's" becomes "knight-s"
      expect(screen.getByTestId('buff-indicator-knight-s-will')).toBeTruthy();
    });
  });

  describe('Size variants', () => {
    it('renders small size', () => {
      render(<BuffIndicator name="Test" active={true} size="sm" />);

      const container = screen.getByTestId('buff-indicator-test');
      expect(container.props.className).toContain('px-2');
    });

    it('renders default size', () => {
      render(<BuffIndicator name="Test" active={true} />);

      const container = screen.getByTestId('buff-indicator-test');
      expect(container.props.className).toContain('px-3');
    });
  });
});
