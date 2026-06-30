import { getMapForQuest, getMapNameForQuest } from '../map-utils';

// Mock only the maps data dependencies
jest.mock('@/app/data/maps', () => {
  return {
    MAP_NAMES: {
      'map-1': 'Vaedros Kingdom',
      'map-2': 'Darkwood Forest',
    },
    QUEST_MAP_MAPPING: {
      'map-1': [
        { id: 'quest-1' },
        { id: 'quest-1a' },
        { id: 'quest-1b' },
        { id: 'quest-2' },
        { id: 'quest-3' },
      ],
      'map-2': [{ id: 'quest-4' }, { id: 'quest-5' }],
    },
  };
});

describe('Map Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMapForQuest', () => {
    it('should return the correct map ID for a quest in map-1', () => {
      expect(getMapForQuest('quest-1')).toBe('map-1');
      expect(getMapForQuest('quest-2')).toBe('map-1');
      expect(getMapForQuest('quest-3')).toBe('map-1');
    });

    it('should return the correct map ID for a quest in map-2', () => {
      expect(getMapForQuest('quest-4')).toBe('map-2');
      expect(getMapForQuest('quest-5')).toBe('map-2');
    });

    it('should handle side-quest IDs correctly', () => {
      expect(getMapForQuest('quest-1a')).toBe('map-1');
      expect(getMapForQuest('quest-1b')).toBe('map-1');
    });

    it('should default to map-1 when quest ID is not found', () => {
      expect(getMapForQuest('quest-99')).toBe('map-1');
      expect(getMapForQuest('invalid-id')).toBe('map-1');
    });
  });

  describe('getMapNameForQuest', () => {
    it('should return the correct map name for quests', () => {
      expect(getMapNameForQuest('quest-1')).toBe('Vaedros Kingdom');
      expect(getMapNameForQuest('quest-4')).toBe('Darkwood Forest');
    });

    it('should handle unknown quest IDs gracefully', () => {
      expect(getMapNameForQuest('quest-99')).toBe('Vaedros Kingdom');
    });
  });
});
