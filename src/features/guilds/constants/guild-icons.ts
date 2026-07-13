/**
 * Guild Icons Configuration
 *
 * Defines the available guild icons, mapping each id to a line-art
 * Lucide icon component (matching the Emberglow design system) and its
 * accessibility label. This module is the single source of truth for the
 * id → icon mapping — every consumer (GuildIcon, list rows, the picker
 * grid) resolves through `getGuildIconComponent`.
 */

import {
  Axe,
  Coffee,
  Compass,
  Flag,
  Flame,
  Gem,
  Hammer,
  Scroll,
  Tent,
  Wand,
} from 'lucide-react-native';

import type { GuildIcon } from '../types/guild-types';

/**
 * `typeof Flag` stands in for lucide-react-native's internal (unexported)
 * icon component signature — every icon in the package shares it.
 */
type GuildIconComponent = typeof Flag;

/**
 * Icon configuration including display and accessibility properties
 */
export interface GuildIconConfig {
  id: GuildIcon;
  label: string;
  description: string;
}

/**
 * Map guild icon IDs to their Lucide icon component.
 * Must be manually maintained since the id union is fixed.
 */
export const GUILD_ICON_COMPONENTS: Record<GuildIcon, GuildIconComponent> = {
  axe: Axe,
  hammer: Hammer,
  camping: Tent,
  mug: Coffee,
  flame: Flame,
  explorer: Compass,
  magic: Wand,
  banner: Flag,
  scroll: Scroll,
  diamond: Gem,
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
  // Default to camping (GUILD_ICONS[2]) if not found.
  return config ?? GUILD_ICONS[2];
}

/**
 * Get the Lucide icon component for a guild icon ID.
 * Falls back to the banner icon for unknown ids.
 */
export function getGuildIconComponent(iconId: GuildIcon): GuildIconComponent {
  return GUILD_ICON_COMPONENTS[iconId] ?? GUILD_ICON_COMPONENTS.banner;
}

/**
 * Default icon for new guilds
 */
export const DEFAULT_GUILD_ICON: GuildIcon = 'banner';
