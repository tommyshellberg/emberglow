import {
  GUILD_ICONS,
  GUILD_ICON_COMPONENTS,
  getGuildIconConfig,
  getGuildIconComponent,
  DEFAULT_GUILD_ICON,
} from '../guild-icons';

describe('Guild Icons', () => {
  // Derive the canonical id list from the source of truth so this test does
  // not rot when icons are added or renamed.
  const iconIds = GUILD_ICONS.map((icon) => icon.id);

  describe('GUILD_ICONS', () => {
    it('should have 10 icons defined', () => {
      expect(GUILD_ICONS).toHaveLength(10);
    });

    it('should include the expected icon types', () => {
      expect(iconIds).toEqual([
        'axe',
        'hammer',
        'camping',
        'mug',
        'flame',
        'explorer',
        'magic',
        'banner',
        'scroll',
        'diamond',
      ]);
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

  describe('GUILD_ICON_COMPONENTS', () => {
    it('should have a Lucide icon component for every icon type', () => {
      iconIds.forEach((iconType) => {
        expect(GUILD_ICON_COMPONENTS[iconType]).toBeDefined();
      });
    });
  });

  describe('getGuildIconConfig', () => {
    it('should return correct config for axe icon', () => {
      const config = getGuildIconConfig('axe');
      expect(config.id).toBe('axe');
      expect(config.label).toBe('Axe');
    });

    it('should return correct config for camping icon', () => {
      const config = getGuildIconConfig('camping');
      expect(config.id).toBe('camping');
      expect(config.label).toBe('Camping');
    });

    it('should return correct config for all icon types', () => {
      iconIds.forEach((iconType) => {
        const config = getGuildIconConfig(iconType);
        expect(config.id).toBe(iconType);
      });
    });

    it('should return the default icon config for an unknown icon', () => {
      // Fallback is GUILD_ICONS[2] (see getGuildIconConfig implementation).
      const config = getGuildIconConfig('unknown' as never);
      expect(config).toEqual(GUILD_ICONS[2]);
    });
  });

  describe('getGuildIconComponent', () => {
    it('should return a Lucide icon component for a known icon', () => {
      const component = getGuildIconComponent('camping');
      expect(component).toBeDefined();
      expect(component).toBe(GUILD_ICON_COMPONENTS.camping);
    });

    it('should return the fallback component for an unknown icon', () => {
      const component = getGuildIconComponent('unknown' as never);
      expect(component).toBeDefined();
      // Fallback is the banner icon (see getGuildIconComponent implementation).
      expect(component).toBe(GUILD_ICON_COMPONENTS.banner);
    });
  });

  describe('DEFAULT_GUILD_ICON', () => {
    it('should be banner', () => {
      expect(DEFAULT_GUILD_ICON).toBe('banner');
    });
  });
});
