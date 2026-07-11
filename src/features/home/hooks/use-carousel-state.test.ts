import { act, renderHook } from '@testing-library/react-native';

import { useCarouselState } from './use-carousel-state';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const actualReanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actualReanimated,
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (value: number) => value,
  };
});

describe('useCarouselState', () => {
  describe('Initialization', () => {
    it('should initialize with activeIndex 0', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      expect(result.current.activeIndex).toBe(0);
    });

    it('should initialize progress shared value to 0', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      expect(result.current.progress.value).toBe(0);
    });
  });

  describe('advance', () => {
    it('moves forward by 1 on advance(1)', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      act(() => {
        result.current.advance(1);
      });

      expect(result.current.activeIndex).toBe(1);
    });

    it('wraps to 0 when advancing past the last index', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      // Separate `act` calls so each `advance` picks up the freshly
      // re-rendered closure over the previous call's `activeIndex`.
      act(() => {
        result.current.advance(1);
      });
      act(() => {
        result.current.advance(1);
      });
      act(() => {
        result.current.advance(1);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('wraps to the last index when advancing backward from 0', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      act(() => {
        result.current.advance(-1);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('updates the progress shared value to the new index', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));
      // The mock `useSharedValue` returns a fresh object per render, so
      // capture the ref from *this* render before triggering the state
      // update that mutates it (matches the mutate-in-place contract real
      // Reanimated shared values have).
      const progressRef = result.current.progress;

      act(() => {
        result.current.advance(1);
      });

      expect(progressRef.value).toBe(1);
    });
  });

  describe('select', () => {
    it('jumps directly to the given index', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      act(() => {
        result.current.select(2);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('normalizes an out-of-range index modulo the item count', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      act(() => {
        result.current.select(4);
      });

      expect(result.current.activeIndex).toBe(1);
    });
  });

  describe('Paywall Reset', () => {
    it('should call onPaywallReset when activeIndex changes', () => {
      const onPaywallReset = jest.fn();
      const { result } = renderHook(() =>
        useCarouselState({ itemCount: 3, onPaywallReset })
      );

      act(() => {
        result.current.advance(1);
      });

      expect(onPaywallReset).toHaveBeenCalledTimes(1);
    });

    it('should not call onPaywallReset if callback not provided', () => {
      const { result } = renderHook(() => useCarouselState({ itemCount: 3 }));

      expect(() => {
        act(() => {
          result.current.advance(1);
        });
      }).not.toThrow();
    });
  });
});
