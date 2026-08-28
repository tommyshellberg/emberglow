import * as Sentry from '@sentry/react-native';
import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { durations } from '@/theme';

import { ANIMATION_TIMING } from './streak-celebration.constants';
import { generateStreakVisualization } from './streak-visualization.util';
import {
  SAFETY_NET_GRACE_MS,
  SAFETY_NET_RESUME_SETTLE_MS,
  useStreakAnimation,
} from './use-streak-animation';

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
}));

const STREAK = 3;
const streakDays = generateStreakVisualization(STREAK);
const litCount = STREAK;

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
 * A value no real animation ever produces. The global reanimated mock lands
 * every animation instantly; these tests are about the chain NOT delivering,
 * so `withTiming` is replaced with one that leaves every value parked at
 * DEAD. Any assertion that still passes with DEAD in place is vacuous, which
 * is exactly why it is not 0 or 1.
 */
const DEAD = -1;

function makeAnimationsDead() {
  jest
    .spyOn(Reanimated, 'withTiming')
    .mockImplementation(
      (() => DEAD) as unknown as typeof Reanimated.withTiming
    );
}

type AppStateHandler = (state: AppStateStatus) => void;

/** Puts the app in `state` and captures the hook's AppState listener. */
function setAppState(state: AppStateStatus) {
  const handlers: AppStateHandler[] = [];
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => state,
  });
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      const h = handler as AppStateHandler;
      handlers.push(h);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(h), 1);
        },
      };
    });
  return {
    become(next: AppStateStatus) {
      state = next;
      handlers.forEach((h) => h(next));
    },
  };
}

describe('useStreakAnimation safety net', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setAppState('active');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reveals the buttons when the animation chain never delivers', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    expect(result.current.buttonsOpacity.value).toBe(DEAD);

    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(result.current.buttonsTranslateY.value).toBe(0);
  });

  it('snaps the whole celebration to its final state, not just the buttons', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();

    const r = result.current;
    expect(r.discOpacity.value).toBe(1);
    expect(r.discScale.value).toBe(1);
    expect(r.count.value).toBe(STREAK);
    expect(r.titleOpacity.value).toBe(1);
    expect(r.titleTranslateY.value).toBe(0);
    expect(r.weekRowOpacity.value).toBe(1);
    expect(r.weekRowTranslateY.value).toBe(0);
    streakDays.forEach((day, i) => {
      expect(r.dayLitProgress[i].value).toBe(day.isCompleted ? 1 : 0);
      expect(r.dayScale[i].value).toBe(1);
    });
  });

  it('reports the miss to Sentry with what triage needs', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('streak-celebration'),
      expect.objectContaining({
        level: 'warning',
        extra: expect.objectContaining({
          buttonsOpacity: DEAD,
          appState: 'active',
          countTarget: STREAK,
          litCount,
        }),
      })
    );
  });

  it('waits for the rise to be over, plus the grace period, before stepping in', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();

    // A net that fires while the real rise could still be in flight would
    // pop the buttons in over the top of their own animation.
    jest.advanceTimersByTime(buttonsRiseEndMs + SAFETY_NET_GRACE_MS - 1);
    expect(result.current.buttonsOpacity.value).toBe(DEAD);

    jest.advanceTimersByTime(1);
    expect(result.current.buttonsOpacity.value).toBe(1);
  });

  it('stays silent when the animation delivered the buttons on its own', () => {
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('defers the check while the app is backgrounded, then checks after resume', () => {
    // Animation frames stop in the background while JS timers keep going
    // (Android) or all fire at once on resume (iOS). Judging the animation
    // before it has had a frame to catch up would be a false alarm.
    const app = setAppState('background');
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(DEAD);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();

    app.become('active');
    jest.advanceTimersByTime(SAFETY_NET_RESUME_SETTLE_MS - 1);
    expect(result.current.buttonsOpacity.value).toBe(DEAD);

    jest.advanceTimersByTime(1);
    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        extra: expect.objectContaining({ appState: 'active' }),
      })
    );
  });

  it('does not fire for a resume where the animation caught up on its own', () => {
    const app = setAppState('background');
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();
    app.become('active');
    jest.runAllTimers();

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('drops the pending safety net when the screen unmounts', () => {
    makeAnimationsDead();
    const { result, unmount } = renderHook(() =>
      useStreakAnimation(streakDays, STREAK)
    );

    result.current.playAnimations();
    unmount();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(DEAD);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('drops the pending safety net when the screen loses focus', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    result.current.cancelSafetyNet();
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(DEAD);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('drops a deferred (backgrounded) safety net on cancel too', () => {
    const app = setAppState('background');
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.runAllTimers();
    result.current.cancelSafetyNet();
    app.become('active');
    jest.runAllTimers();

    expect(result.current.buttonsOpacity.value).toBe(DEAD);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('restarts the safety net when the choreography replays', () => {
    makeAnimationsDead();
    const { result } = renderHook(() => useStreakAnimation(streakDays, STREAK));

    result.current.playAnimations();
    jest.advanceTimersByTime(2000);
    result.current.playAnimations();
    jest.advanceTimersByTime(2000);

    // 4s in total, but the second play restarted the clock — not yet.
    expect(result.current.buttonsOpacity.value).toBe(DEAD);

    jest.runAllTimers();
    expect(result.current.buttonsOpacity.value).toBe(1);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });
});
