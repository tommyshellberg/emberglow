/**
 * Guild Icons Configuration
 *
 * Defines the available guild icons with their SVG sources
 * and accessibility labels.
 */

import type { GuildIcon } from '../types/guild-types';

/**
 * Icon configuration including display and accessibility properties
 */
export interface GuildIconConfig {
  id: GuildIcon;
  label: string;
  description: string;
}

/**
 * Map guild icon IDs to their SVG sources
 * Must be manually maintained since React Native doesn't support dynamic require()
 */
export const GUILD_ICON_MAP: Record<GuildIcon, any> = {
  axe: require('@/../assets/icons/guild/axe.svg'),
  hammer: require('@/../assets/icons/guild/hammer.svg'),
  camping: require('@/../assets/icons/guild/camping.svg'),
  mug: require('@/../assets/icons/guild/mug.svg'),
  flame: require('@/../assets/icons/guild/flame.svg'),
  explorer: require('@/../assets/icons/guild/explorer.svg'),
  magic: require('@/../assets/icons/guild/magic.svg'),
  banner: require('@/../assets/icons/guild/banner.svg'),
  scroll: require('@/../assets/icons/guild/scroll.svg'),
  diamond: require('@/../assets/icons/guild/diamond.svg'),
};

/**
 * All available guild icons
 */
export const GUILD_ICONS: readonly GuildIconConfig[] = [
  {
    id: 'axe',
    label: 'Axe',
    description: 'For warriors and competitors',
  },
  {
    id: 'hammer',
    label: 'Hammer',
    description: 'For blacksmiths and crafters',
  },
  {
    id: 'camping',
    label: 'Camping',
    description: 'For outdoor adventurers',
  },
  {
    id: 'mug',
    label: 'Mug',
    description: 'For coffee and tea lovers',
  },
  {
    id: 'flame',
    label: 'Flame',
    description: 'For passionate spirits',
  },
  {
    id: 'explorer',
    label: 'Explorer',
    description: 'For outdoor adventurers',
  },
  {
    id: 'magic',
    label: 'Magic',
    description: 'For mystical minds',
  },
  {
    id: 'banner',
    label: 'Banner',
    description: 'For guilds and organizations',
  },
  {
    id: 'scroll',
    label: 'Scroll',
    description: 'For magical scrolls',
  },
  {
    id: 'diamond',
    label: 'Diamond',
    description: 'For precious gems',
  },
] as const;

/**
 * Get icon configuration by ID
 */
export function getGuildIconConfig(iconId: GuildIcon): GuildIconConfig {
  const config = GUILD_ICONS.find((icon) => icon.id === iconId);
  // Default to campfire if not found
  return config ?? GUILD_ICONS[2];
}

/**
 * Get SVG source for a guild icon
 */
export function getGuildIconSource(iconId: GuildIcon): any {
  return GUILD_ICON_MAP[iconId] ?? GUILD_ICON_MAP.banner;
}

/**
 * Default icon for new guilds
 */
export const DEFAULT_GUILD_ICON: GuildIcon = 'banner';
