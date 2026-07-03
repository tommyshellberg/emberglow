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
