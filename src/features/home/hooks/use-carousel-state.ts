import { useCallback, useEffect, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { ANIMATION_TIMINGS } from '@/features/home/constants/home-constants';

interface UseCarouselStateOptions {
  /** Number of cards in the deck — required to wrap `advance`/`select` correctly. */
  itemCount: number;
  onPaywallReset?: () => void;
}

/**
 * Active-card state for the Play screen's mode deck (see quest-deck.tsx).
 * `progress` animates to the new index on every change and drives the
 * background vignette's crossfade (index.tsx's `interpolateColor` over
 * `QUEST_MODES`).
 */
export function useCarouselState({
  itemCount,
  onPaywallReset,
}: UseCarouselStateOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useSharedValue(0);
  const count = Math.max(itemCount, 1);

  // Reset paywall modal when the active card changes
  useEffect(() => {
    if (onPaywallReset && activeIndex > 0) {
      onPaywallReset();
    }
  }, [activeIndex, onPaywallReset]);

  const select = useCallback(
    (index: number) => {
      const normalized = ((index % count) + count) % count;
      setActiveIndex(normalized);
      progress.value = withTiming(normalized, {
        duration: ANIMATION_TIMINGS.CAROUSEL_TRANSITION,
      });
    },
    [count, progress]
  );

  const advance = useCallback(
    (delta: number) => {
      select(activeIndex + delta);
    },
    [activeIndex, select]
  );

  return {
    activeIndex,
    progress,
    advance,
    select,
  };
}
