import * as Sentry from '@sentry/react-native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  runOnJS,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, easing } from '@/theme';

import { ANIMATION_TIMING, DAY_IGNITE } from './streak-celebration.constants';
import { type StreakDay } from './streak-visualization.util';

const EMBER_EASE = Easing.bezier(...easing.emberOut);
const COUNT_EASE = Easing.out(Easing.cubic);

function fireImpactHaptic(isLast: boolean) {
  Haptics.impactAsync(
    isLast
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light
  );
}

function fireSuccessHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

interface UseStreakAnimationReturn {
  discOpacity: SharedValue<number>;
  discScale: SharedValue<number>;
  count: SharedValue<number>;
  titleOpacity: SharedValue<number>;
  titleTranslateY: SharedValue<number>;
  weekRowOpacity: SharedValue<number>;
  weekRowTranslateY: SharedValue<number>;
  /** One ignition progress value (0 -> 1) per day, driving lit color/glow. */
  dayLitProgress: SharedValue<number>[];
  /** One punch-scale value per day, briefly overshooting past 1 on ignite. */
  dayScale: SharedValue<number>[];
  buttonsOpacity: SharedValue<number>;
  buttonsTranslateY: SharedValue<number>;
  playAnimations: () => void;
  /** Stop a pending safety-net check; call when the screen loses focus. */
  cancelSafetyNet: () => void;
}

const RISE_DISTANCE = 14;

/**
 * How long after the buttons' rise SHOULD have finished before the JS-side
 * safety net stops waiting and reveals them itself.
 */
export const SAFETY_NET_GRACE_MS = 1000;

/**
 * After the app resumes, how long to give the UI thread to draw a frame
 * before judging the animation. Reanimated animations are timestamp-driven
 * and jump to completion on the first frame after resume; the JS timer that
 * runs the check can fire before that frame, so checking immediately would
 * call a healthy animation dead.
 */
export const SAFETY_NET_RESUME_SETTLE_MS = 500;

/**
 * Custom hook to manage all animations for the streak celebration screen:
 * counter disc pop-in -> count-up -> title rise -> week row rise -> day
 * ignition (staggered, haptic per day) -> buttons rise.
 *
 * @param streakDays - Array of 7 streak days to animate
 * @param streak - Current streak count (count-up target)
 * @returns Animation values and a play function
 */
export function useStreakAnimation(
  streakDays: StreakDay[],
  streak: number
): UseStreakAnimationReturn {
  const discOpacity = useSharedValue(0);
  const discScale = useSharedValue(0.6);
  const count = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(RISE_DISTANCE);
  const weekRowOpacity = useSharedValue(0);
  const weekRowTranslateY = useSharedValue(RISE_DISTANCE);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(RISE_DISTANCE);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dayLitProgress = streakDays.map(() => useSharedValue(0));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dayScale = streakDays.map(() => useSharedValue(1));

  const litCount = streakDays.filter((day) => day.isCompleted).length;
  const countTarget = Math.max(streak, 1);

  const safetyNetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const safetyNetResume = useRef<{ remove: () => void } | undefined>(undefined);

  const cancelSafetyNet = useCallback(() => {
    clearTimeout(safetyNetTimer.current);
    safetyNetTimer.current = undefined;
    safetyNetResume.current?.remove();
    safetyNetResume.current = undefined;
  }, []);

  useEffect(() => cancelSafetyNet, [cancelSafetyNet]);

  /** Every value at the end of the choreography, in one step. */
  const snapToFinalState = useCallback(() => {
    discOpacity.value = 1;
    discScale.value = 1;
    count.value = countTarget;
    titleOpacity.value = 1;
    titleTranslateY.value = 0;
    weekRowOpacity.value = 1;
    weekRowTranslateY.value = 0;
    streakDays.forEach((day, index) => {
      dayLitProgress[index].value = day.isCompleted ? 1 : 0;
      dayScale[index].value = 1;
    });
    buttonsOpacity.value = 1;
    buttonsTranslateY.value = 0;
    // Same reasoning as playAnimations' deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakDays, countTarget]);

  const checkSafetyNet = useCallback(() => {
    safetyNetTimer.current = undefined;
    if (buttonsOpacity.value >= 1) return;

    Sentry.captureMessage(
      'streak-celebration: buttons never became visible, safety net fired',
      {
        level: 'warning',
        extra: {
          buttonsOpacity: buttonsOpacity.value,
          appState: AppState.currentState,
          platform: Platform.OS,
          streak,
          countTarget,
          litCount,
        },
      }
    );
    snapToFinalState();
    // buttonsOpacity is a stable ref; see playAnimations' deps note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapToFinalState, streak, countTarget, litCount]);

  /**
   * Run the check now if the app is on screen. If it is not, animation
   * frames may have stopped (Android) or be about to catch up in one go
   * (iOS), so wait for the app to become active and give it a frame first.
   */
  const runSafetyNet = useCallback(() => {
    safetyNetTimer.current = undefined;
    if (AppState.currentState === 'active') {
      checkSafetyNet();
      return;
    }
    safetyNetResume.current = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      safetyNetResume.current?.remove();
      safetyNetResume.current = undefined;
      safetyNetTimer.current = setTimeout(
        checkSafetyNet,
        SAFETY_NET_RESUME_SETTLE_MS
      );
    });
  }, [checkSafetyNet]);

  const playAnimations = useCallback(() => {
    // Reset all animation values first.
    discOpacity.value = 0;
    discScale.value = 0.6;
    count.value = 1;
    titleOpacity.value = 0;
    titleTranslateY.value = RISE_DISTANCE;
    weekRowOpacity.value = 0;
    weekRowTranslateY.value = RISE_DISTANCE;
    buttonsOpacity.value = 0;
    buttonsTranslateY.value = RISE_DISTANCE;
    dayLitProgress.forEach((value) => {
      value.value = 0;
    });
    dayScale.forEach((value) => {
      value.value = 1;
    });

    // 1 - Counter disc pop-in.
    discOpacity.value = withDelay(
      ANIMATION_TIMING.DISC_DELAY,
      withTiming(1, { duration: durations.base, easing: EMBER_EASE })
    );
    discScale.value = withDelay(
      ANIMATION_TIMING.DISC_DELAY,
      withTiming(1, { duration: durations.slow, easing: EMBER_EASE })
    );

    // 2 - Count-up 1 -> streak, success haptic when it lands.
    count.value = withDelay(
      ANIMATION_TIMING.COUNT_START_DELAY,
      withTiming(
        countTarget,
        { duration: ANIMATION_TIMING.COUNT_DURATION, easing: COUNT_EASE },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(fireSuccessHaptic)();
          }
        }
      )
    );

    const countEnd =
      ANIMATION_TIMING.COUNT_START_DELAY + ANIMATION_TIMING.COUNT_DURATION;

    // 3 - Title rise.
    const titleDelay = countEnd - ANIMATION_TIMING.TITLE_LEAD;
    titleOpacity.value = withDelay(
      titleDelay,
      withTiming(1, { duration: durations.base, easing: EMBER_EASE })
    );
    titleTranslateY.value = withDelay(
      titleDelay,
      withTiming(0, { duration: durations.base, easing: EMBER_EASE })
    );

    // 4 - Week row rise.
    const weekAt = countEnd + ANIMATION_TIMING.WEEK_ROW_DELAY_AFTER_COUNT;
    weekRowOpacity.value = withDelay(
      weekAt,
      withTiming(1, { duration: durations.base, easing: EMBER_EASE })
    );
    weekRowTranslateY.value = withDelay(
      weekAt,
      withTiming(0, { duration: durations.base, easing: EMBER_EASE })
    );

    // 5 - Day-by-day ignition, left to right starting at the first lit day.
    let ignitedSoFar = 0;
    streakDays.forEach((day, index) => {
      if (!day.isCompleted) return;

      const isLast = ignitedSoFar === litCount - 1;
      const igniteDelay =
        weekAt +
        ANIMATION_TIMING.DAY_IGNITE_START_OFFSET +
        ignitedSoFar * ANIMATION_TIMING.DAY_STAGGER;

      dayLitProgress[index].value = withDelay(
        igniteDelay,
        withTiming(1, { duration: durations.base, easing: EMBER_EASE })
      );
      dayScale[index].value = withDelay(
        igniteDelay,
        withSequence(
          withTiming(
            DAY_IGNITE.BOUNCE_SCALE,
            { duration: DAY_IGNITE.BOUNCE_DURATION, easing: EMBER_EASE },
            (finished) => {
              'worklet';
              if (finished) {
                runOnJS(fireImpactHaptic)(isLast);
              }
            }
          ),
          withSpring(1, {
            damping: DAY_IGNITE.SPRING_DAMPING,
            stiffness: DAY_IGNITE.SPRING_STIFFNESS,
          })
        )
      );

      ignitedSoFar += 1;
    });

    // 6 - Buttons rise, after the last day ignites.
    const buttonsDelay =
      weekAt +
      ANIMATION_TIMING.DAY_IGNITE_START_OFFSET +
      litCount * ANIMATION_TIMING.DAY_STAGGER +
      ANIMATION_TIMING.BUTTONS_DELAY_AFTER_LAST_DAY;
    buttonsOpacity.value = withDelay(
      buttonsDelay,
      withTiming(1, { duration: durations.base, easing: EMBER_EASE })
    );
    buttonsTranslateY.value = withDelay(
      buttonsDelay,
      withTiming(0, { duration: durations.base, easing: EMBER_EASE })
    );

    // 7 - Safety net. Until here everything on this screen — and above all
    // the buttons, its only exit — rests on a ~3s chain of UI-thread
    // animations started at focus. In production that chain has failed to
    // deliver (buttons never appeared; only an app restart fixed it — seen
    // repeatedly around quests completed with the phone away / poor
    // network, Aug 2026). The trigger is not reproducible on the simulator,
    // so rather than guess at it: once the rise should be over, if the
    // buttons still aren't visible, snap the whole celebration to its final
    // state from the JS side and report it so the real frequency and
    // conditions show up in Sentry.
    cancelSafetyNet();
    safetyNetTimer.current = setTimeout(
      runSafetyNet,
      buttonsDelay + durations.base + SAFETY_NET_GRACE_MS
    );
    // Deliberately omit day-circle values from deps: they're stable refs
    // (created once via useSharedValue) whose .value is mutated, not
    // replaced, so re-running this effect for their identity would be
    // both unnecessary and (for the array itself) impossible to satisfy
    // exhaustive-deps cleanly since the array length is derived from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    streakDays,
    streak,
    litCount,
    countTarget,
    cancelSafetyNet,
    runSafetyNet,
  ]);

  return {
    discOpacity,
    discScale,
    count,
    titleOpacity,
    titleTranslateY,
    weekRowOpacity,
    weekRowTranslateY,
    dayLitProgress,
    dayScale,
    buttonsOpacity,
    buttonsTranslateY,
    playAnimations,
    cancelSafetyNet,
  };
}
