import { View } from 'react-native';

import { useSpirit } from '@/hooks/use-spirit';
import { DECAY_PER_DAY, MAX_SPIRIT } from '@/lib/spirit';

// Derived from the server-parity constants so a change to the decay formula
// loudly re-shapes the meter instead of silently desyncing (1 segment = 1 day).
const POINTS_PER_SEGMENT = DECAY_PER_DAY;
const SEGMENTS = MAX_SPIRIT / DECAY_PER_DAY;

export const SpiritMeter = () => {
  const { spirit, active } = useSpirit();

  if (!active || spirit === null) return null;

  const filled = Math.round(spirit / POINTS_PER_SEGMENT);

  return (
    <View testID="spirit-meter" className="flex-row gap-1">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <View
          key={i}
          testID="spirit-segment"
          className="h-2 w-4 rounded-sm bg-neutral-300"
        >
          {i < filled ? (
            <View
              testID="spirit-segment-filled"
              className="size-full rounded-sm bg-primary-400"
            />
          ) : null}
        </View>
      ))}
    </View>
  );
};
