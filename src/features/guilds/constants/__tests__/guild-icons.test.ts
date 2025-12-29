import {
  GUILD_ICONS,
  GUILD_ICON_MAP,
  getGuildIconConfig,
  getGuildIconSource,
  DEFAULT_GUILD_ICON,
} from '../guild-icons';
import type { GuildIcon } from '../../types/guild-types';

describe('Guild Icons', () => {
  describe('GUILD_ICONS', () => {
    it('should have 8 icons defined', () => {
      expect(GUILD_ICONS).toHaveLength(8);
    });

    it('should include all expected icon types', () => {
      const iconIds = GUILD_ICONS.map((icon) => icon.id);
      expect(iconIds).toContain('axe');
      expect(iconIds).toContain('bow');
      expect(iconIds).toContain('campfire');
      expect(iconIds).toContain('island');
      expect(iconIds).toContain('flame');
      expect(iconIds).toContain('explorer');
      expect(iconIds).toContain('magic');
      expect(iconIds).toContain('powerup');
    });

    it('should have all required properties for each icon', () => {
      GUILD_ICONS.forEach((icon) => {
        expect(icon).toHaveProperty('id');
        expect(icon).toHaveProperty('label');
        expect(icon).toHaveProperty('description');
        expect(typeof icon.id).toBe('string');
        expect(typeof icon.label).toBe('string');
        expect(typeof icon.description).toBe('string');
      });
    });
  });

  describe('GUILD_ICON_MAP', () => {
    it('should have SVG source for each icon type', () => {
      const iconTypes: GuildIcon[] = [
        'axe',
        'bow',
        'campfire',
        'island',
        'flame',
        'explorer',
        'magic',
        'powerup',
      ];

      iconTypes.forEach((iconType) => {
        expect(GUILD_ICON_MAP[iconType]).toBeDefined();
      });
    });
  });

  describe('getGuildIconConfig', () => {
    it('should return correct config for axe icon', () => {
      const config = getGuildIconConfig('axe');
      expect(config.id).toBe('axe');
      expect(config.label).toBe('Axe');
    });

    it('should return correct config for campfire icon', () => {
      const config = getGuildIconConfig('campfire');
      expect(config.id).toBe('campfire');
      expect(config.label).toBe('Campfire');
    });

    it('should return correct config for all icon types', () => {
      const iconTypes: GuildIcon[] = [
        'axe',
        'bow',
        'campfire',
        'island',
        'flame',
        'explorer',
        'magic',
        'powerup',
      ];

      iconTypes.forEach((iconType) => {
        const config = getGuildIconConfig(iconType);
        expect(config.id).toBe(iconType);
      });
    });

    it('should return default icon config for unknown icon', () => {
      // This tests the fallback behavior when an invalid icon is passed
      // TypeScript would prevent this in normal usage, but we test the runtime fallback
      const config = getGuildIconConfig('unknown' as GuildIcon);
      expect(config.id).toBe('campfire'); // campfire is the fallback (index 2)
    });
  });

  describe('getGuildIconSource', () => {
    it('should return SVG source for campfire icon', () => {
      const source = getGuildIconSource('campfire');
      expect(source).toBeDefined();
    });

    it('should return SVG source for island icon', () => {
      const source = getGuildIconSource('island');
      expect(source).toBeDefined();
    });

    it('should return fallback source for unknown icon', () => {
      const source = getGuildIconSource('unknown' as GuildIcon);
      expect(source).toBeDefined();
      expect(source).toBe(GUILD_ICON_MAP.campfire);
    });
  });

  describe('DEFAULT_GUILD_ICON', () => {
    it('should be campfire', () => {
      expect(DEFAULT_GUILD_ICON).toBe('campfire');
    });
  });
});
