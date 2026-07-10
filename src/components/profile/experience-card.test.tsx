import { render } from '@testing-library/react-native';
import React from 'react';

import { type Character } from '@/store/types';

import { ExperienceCard } from './experience-card';

// Mock the level progression data
jest.mock('@/app/data/level-progression', () => ({
  levels: [
    { level: 1, totalXPRequired: 0 },
    { level: 2, totalXPRequired: 100 },
    { level: 3, totalXPRequired: 250 },
    { level: 4, totalXPRequired: 475 },
    { level: 5, totalXPRequired: 812 },
  ],
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('ExperienceCard', () => {
  const createCharacter = (level: number, currentXP: number): Character => ({
    type: 'knight',
    name: 'Test Knight',
    level,
    currentXP, // This is total XP
    xpToNextLevel: 100, // Not used, but required by type
  });

  describe('XP calculations', () => {
    test('should show correct values for level 1 with 0 XP', () => {
      const character = createCharacter(1, 0);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 0 XP')).toBeTruthy();
      expect(getByText('100 XP to Level 2')).toBeTruthy();
      // Progress-within-level is rendered by the Emberglow XPBar now.
      expect(getByText('Level 1')).toBeTruthy();
      expect(getByText('0 / 100 XP')).toBeTruthy();
    });

    test('should show correct values for level 1 with 50 XP', () => {
      const character = createCharacter(1, 50);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 50 XP')).toBeTruthy();
      expect(getByText('50 XP to Level 2')).toBeTruthy();
      expect(getByText('50 / 100 XP')).toBeTruthy();
    });

    test('should show correct values for level 2 with 100 XP', () => {
      const character = createCharacter(2, 100);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 100 XP')).toBeTruthy();
      expect(getByText('150 XP to Level 3')).toBeTruthy();
      expect(getByText('Level 2')).toBeTruthy();
      expect(getByText('0 / 150 XP')).toBeTruthy();
    });

    test('should show correct values for level 2 with 200 XP', () => {
      const character = createCharacter(2, 200);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 200 XP')).toBeTruthy();
      expect(getByText('50 XP to Level 3')).toBeTruthy();
      expect(getByText('100 / 150 XP')).toBeTruthy();
    });

    test('should show correct values for level 3 with 250 XP', () => {
      const character = createCharacter(3, 250);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 250 XP')).toBeTruthy();
      expect(getByText('225 XP to Level 4')).toBeTruthy();
      expect(getByText('Level 3')).toBeTruthy();
      expect(getByText('0 / 225 XP')).toBeTruthy();
    });

    test('should show correct values for level 3 with 300 XP', () => {
      const character = createCharacter(3, 300);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 300 XP')).toBeTruthy();
      expect(getByText('175 XP to Level 4')).toBeTruthy();
      expect(getByText('50 / 225 XP')).toBeTruthy();
    });
  });

  describe('Total XP formatting', () => {
    test('should format large numbers with commas', () => {
      const character = createCharacter(10, 7486);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 7,486 XP')).toBeTruthy();
    });

    test('should handle very large XP values', () => {
      const character = createCharacter(50, 85016199806);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 85,016,199,806 XP')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    test('should handle maximum level gracefully', () => {
      const character = createCharacter(100, 54208157004695360000);
      const { getByText } = render(<ExperienceCard character={character} />);

      // At max level, there's no next level
      expect(getByText('0 XP to Level 101')).toBeTruthy();
    });

    test('should handle character at exact level threshold', () => {
      // Character has exactly the XP needed for their current level
      const character = createCharacter(3, 250);
      const { getByText } = render(<ExperienceCard character={character} />);

      expect(getByText('Total: 250 XP')).toBeTruthy();
      expect(getByText('225 XP to Level 4')).toBeTruthy();
      expect(getByText('0 / 225 XP')).toBeTruthy();
    });
  });

  describe('Progress bar calculations', () => {
    test('should calculate 0% progress at level start', () => {
      const character = createCharacter(2, 100);
      const { getByText } = render(<ExperienceCard character={character} />);

      // Progress is 0/150 = 0%
      expect(getByText('0 / 150 XP')).toBeTruthy();
    });

    test('should calculate 50% progress halfway through level', () => {
      const character = createCharacter(2, 175);
      const { getByText } = render(<ExperienceCard character={character} />);

      // Progress is 75/150 = 50%
      expect(getByText('75 / 150 XP')).toBeTruthy();
    });

    test('should calculate nearly 100% progress just before level up', () => {
      const character = createCharacter(2, 249);
      const { getByText } = render(<ExperienceCard character={character} />);

      // Progress is 149/150 = 99.3%
      expect(getByText('149 / 150 XP')).toBeTruthy();
      expect(getByText('1 XP to Level 3')).toBeTruthy();
    });
  });
});
