import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { DurationBadge } from './duration-badge';

describe('DurationBadge', () => {
  describe('without duration reduction', () => {
    it('displays the original duration', () => {
      render(<DurationBadge duration={30} />);

      expect(screen.getByText('30 min')).toBeOnTheScreen();
    });

    it('displays duration when adjustedDuration equals duration', () => {
      render(<DurationBadge duration={30} adjustedDuration={30} />);

      expect(screen.getByText('30 min')).toBeOnTheScreen();
      // Should not show strikethrough - only one duration element
      expect(screen.queryByText(/Original duration/)).toBeNull();
    });

    it('displays duration when adjustedDuration is null', () => {
      render(<DurationBadge duration={30} adjustedDuration={null} />);

      expect(screen.getByText('30 min')).toBeOnTheScreen();
    });

    it('displays duration when adjustedDuration is undefined', () => {
      render(<DurationBadge duration={30} adjustedDuration={undefined} />);

      expect(screen.getByText('30 min')).toBeOnTheScreen();
    });
  });

  describe('with duration reduction', () => {
    it('shows strikethrough original and colored adjusted duration', () => {
      render(<DurationBadge duration={30} adjustedDuration={27} />);

      // Original duration with strikethrough
      expect(screen.getByText('30')).toBeOnTheScreen();

      // Adjusted duration
      expect(screen.getByText('27 min')).toBeOnTheScreen();
    });

    it('handles 10% Quick Start reduction correctly', () => {
      // 30 minutes * 0.9 = 27 minutes
      render(<DurationBadge duration={30} adjustedDuration={27} />);

      expect(screen.getByText('30')).toBeOnTheScreen();
      expect(screen.getByText('27 min')).toBeOnTheScreen();
    });

    it('handles large duration reductions', () => {
      // 60 minute quest reduced to 54 minutes
      render(<DurationBadge duration={60} adjustedDuration={54} />);

      expect(screen.getByText('60')).toBeOnTheScreen();
      expect(screen.getByText('54 min')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('does NOT show reduction when adjusted is higher than original', () => {
      // Should not happen, but handle gracefully
      render(<DurationBadge duration={30} adjustedDuration={40} />);

      // Should show normal display, not strikethrough
      expect(screen.getByText('30 min')).toBeOnTheScreen();
      expect(screen.queryByText('40 min')).toBeNull();
    });

    it('handles 1 minute duration', () => {
      render(<DurationBadge duration={1} />);

      expect(screen.getByText('1 min')).toBeOnTheScreen();
    });

    it('handles 0 adjusted duration', () => {
      // Edge case - 0 should still show reduction
      render(<DurationBadge duration={30} adjustedDuration={0} />);

      expect(screen.getByText('30')).toBeOnTheScreen();
      expect(screen.getByText('0 min')).toBeOnTheScreen();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility labels for normal duration', () => {
      render(<DurationBadge duration={30} />);

      expect(
        screen.getByLabelText('Duration: 30 minutes')
      ).toBeOnTheScreen();
    });

    it('has correct accessibility labels for reduced duration', () => {
      render(<DurationBadge duration={30} adjustedDuration={27} />);

      expect(
        screen.getByLabelText('Original duration: 30 minutes')
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Reduced duration: 27 minutes')
      ).toBeOnTheScreen();
    });
  });
});
