import * as Sentry from '@sentry/react-native';
import { renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { durations } from '@/theme';

import { ANIMATION_TIMING } from './streak-celebration.constants';
import { generateStreakVisualization } from './streak-visualization.util';
import { useStreakAnimation } from './use-streak-animation';

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
}));

const streakDays = generateStreakVisualization(3);
const litCount = 3;

/** When the buttons' own rise ends, per the choreography in the hook. */
const buttonsRiseEndMs =
  ANIMATION_TIMING.COUNT_START_DELAY +
  ANIMATION_TIMING.COUNT_DURATION +
  ANIMATION_TIMING.WEEK_ROW_DELAY_AFTER_COUNT +
  ANIMATION_TIMING.DAY_IGNITE_START_OFFSET +
  litCount * ANIMATION_TIMING.DAY_STAGGER +
  ANIMATION_TIMING.BUTTONS_DELAY_AFTER_LAST_DAY +
  durations.base;

/**
 * The global reanimated mock makes every animation land instantly. These
 * tests are about the case where the UI-thread choreography never delivers
 * its final value, so `withTiming` is replaced with one that returns the
 * value it was given *from*, i.e. nothing moves.
 */
function makeAnimationsDead() {
  jest
    .spyOn(Reanimated, 'withTiming')
    .mockImplementation((() => 0) as unknown as typeof Reanimated.withTiming);
}

describe('useStreakAnimation buttons safety net', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reveals the buttons when the animation chain never delivers', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, 3));

    result.current.playAnimations();
    expect(result.current.buttonsOpacity.value).toBe(0);

    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(result.current.buttonsTranslateY.value).toBe(0);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it('waits for the rise to be over, plus a grace period, before stepping in', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, 3));

    result.current.playAnimations();

    // A net that fires while the real rise could still be in flight would
    // pop the buttons in over the top of their own animation.
    jest.advanceTimersByTime(buttonsRiseEndMs);
    expect(result.current.buttonsOpacity.value).toBe(0);

    jest.advanceTimersByTime(1000);
    expect(result.current.buttonsOpacity.value).toBe(1);
  });

  it('stays silent when the animation delivered the buttons on its own', () => {
    const { result } = renderHook(() => useStreakAnimation(streakDays, 3));

    result.current.playAnimations();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('drops the pending safety net when the screen unmounts', () => {
    makeAnimationsDead();
    const { result, unmount } = renderHook(() =>
      useStreakAnimation(streakDays, 3)
    );

    result.current.playAnimations();
    unmount();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(0);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('restarts the safety net when the choreography replays', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, 3));

    result.current.playAnimations();
    jest.advanceTimersByTime(2000);
    result.current.playAnimations();
    jest.advanceTimersByTime(2000);

    // 4s in total, but the second play restarted the clock — not yet.
    expect(result.current.buttonsOpacity.value).toBe(0);

    jest.runAllTimers();
    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });
});
