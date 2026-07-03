import {
  deriveDisplaySpirit,
  isSpiritFadingEnabled,
  type SpiritDisplay,
} from '@/lib/spirit';
import { useCharacterStore } from '@/store/character-store';

export const useSpirit = (): SpiritDisplay & { restorationCount: number } => {
  const serverSpirit = useCharacterStore((s) => s.serverSpirit);
  const serverSpiritAt = useCharacterStore((s) => s.serverSpiritAt);
  const restorationCount = useCharacterStore((s) => s.restorationCount);

  if (!isSpiritFadingEnabled()) {
    return { spirit: null, faded: false, active: false, restorationCount };
  }
  return {
    ...deriveDisplaySpirit({ serverSpirit, serverSpiritAt }),
    restorationCount,
  };
};

/**
 * Non-hook reader for the faded state. Use at quest-start call sites that are
 * not inside a render body (e.g. inside event handlers / mutations) where a
 * hook would be inappropriate. Reads the latest store snapshot directly.
 */
export const isFadedNow = (): boolean => {
  if (!isSpiritFadingEnabled()) return false;
  const { serverSpirit, serverSpiritAt } = useCharacterStore.getState();
  return deriveDisplaySpirit({ serverSpirit, serverSpiritAt }).faded;
};
