import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronsLeft, ChevronsRight } from 'lucide-react-native';
import * as React from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';

import {
  durations,
  easing,
  fontFamily,
  palette,
  text,
  withAlpha,
} from '@/theme';

// ---------------------------------------------------------------------------
// Geometry & motion, lifted from the decisionSlider README (all values final).
// ---------------------------------------------------------------------------

/** Orb travel radius from track center, pt. */
const TRAVEL_RADIUS = 118;
/** Release beyond this fraction of the travel radius commits the choice. */
const COMMIT_THRESHOLD = 0.72;
const ORB_SIZE = 46;
/** Invisible padding around the orb (58pt effective slot). */
const ORB_PADDING = 6;
const TRACK_ZONE_HEIGHT = 60;
const TRACK_INSET = 8;
const HOLD_RING_SIZE = 66;
const HOLD_RING_STROKE = 5;
/**
 * The reference fills +0.04 per 32ms tick: 25 ticks × 32ms = 800ms linear,
 * expressed here as a single linear timing animation.
 */
const HOLD_DURATION_MS = 800;
/** Pause between visual commit and `onCommit` firing. */
const COMMIT_SETTLE_MS = 650;
/** Spring-back / commit-slide duration (`emberOut` bezier). */
const SETTLE_MS = 320;
const LABEL_FADE_MS = 300;
const LABEL_COLOR_MS = 200;
/** Nearer label switches Bone → Sandy above this proximity. */
const LABEL_ACTIVE_THRESHOLD = 0.15;
/** Chevron tint flips Bone 60% → Sandy above this proximity. */
const CHEVRON_TINT_THRESHOLD = 0.4;
/** Chevron centers sit at ±(R − 8) from track center. */
const CHEVRON_INSET = 8;
const CHEVRON_SIZE = 24;
/** Vertical rhythm between eyebrow, choice row, and track zone. */
const STACK_GAP = 14;
const DISABLED_OPACITY = 0.5;
/**
 * During a hold the ember core peaks at 90% — the final step to 1 is
 * reserved for the commit lock, so completion still reads as an event.
 * Must stay < 1 (reference: `p + hold * 0.9`).
 */
const HOLD_EMBER_CAP = 0.9;

/**
 * Worklet-safe colors, precomputed at module scope. Constraint: calling a
 * non-worklet helper (theme's `withAlpha`) from inside a worklet crashes the
 * UI thread at runtime — "Tried to synchronously call a non-worklet
 * function" — and Jest's reanimated mock runs worklets as plain JS, so no
 * test can catch it (device-verified 2026-07-12). Every color a worklet
 * needs must live here; they're static, so per-frame computation was waste
 * regardless.
 */
const LABEL_ACTIVE_COLOR = palette.sandy; // worklet-consumed (label color tween)
const LABEL_RESTING_COLOR = palette.bone; // worklet-consumed (label color tween)
// Consumed by the static `styles.label`, not a worklet — textShadowColor must
// stay out of the animated label style (see the labelVisuals return note).
const LABEL_GLOW_COLOR = withAlpha(palette.sandy, 0.45);

/**
 * True when a release at `x` (pt from track center) is past the commit
 * point — strictly beyond 0.72·R, matching the reference's `>`, so a
 * release at exactly the threshold springs back.
 */
export function isDecisionCommitRelease(x: number): boolean {
  'worklet';
  return Math.abs(x) > COMMIT_THRESHOLD * TRAVEL_RADIUS;
}

/** Map a committed side to its index into `choices`. */
export function decisionCommitIndex(side: -1 | 1, single: boolean): 0 | 1 {
  return single || side === -1 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Resting pulse — a founder addition beyond the design handoff (the handoff
// has no resting pulse): while idle, the orb's ember core + glow gently
// breathe (plus a ≤2% scale breathe) so it reads as alive and touchable,
// especially in single-choice mode.
// ---------------------------------------------------------------------------

/** Full breathe cycle (rise + fall), ms. */
const PULSE_PERIOD_MS = 2200;
/**
 * Peak ember/glow boost while idle — what p ≈ 0.12 produces during a drag,
 * deliberately below PULSE_SUPPRESS_AT so real feedback always reads
 * stronger than the idle breathe.
 */
const PULSE_PEAK = 0.12;
/**
 * Interaction proximity at which the pulse is fully yielded. Matches
 * LABEL_ACTIVE_THRESHOLD: by the time any drag/hold feedback shows on the
 * labels, the pulse is gone.
 */
const PULSE_SUPPRESS_AT = LABEL_ACTIVE_THRESHOLD;
/** Orb scale at full pulse phase (brief allows ≤ 1.03). */
const PULSE_MAX_SCALE = 1.02;

/**
 * Ember-core boost the resting pulse adds to the orb's `p`, given the pulse
 * phase (0–1) and the current interaction proximity. Amplitude scales away
 * linearly with interaction, hitting zero at PULSE_SUPPRESS_AT — any drag
 * or hold overrides the idle breathe continuously, with no cancel/resume
 * choreography to fight the gesture.
 */
export function restingPulseBoost(phase: number, interactionP: number): number {
  'worklet';
  const yieldFactor = 1 - Math.min(interactionP / PULSE_SUPPRESS_AT, 1);
  return PULSE_PEAK * phase * yieldFactor;
}

// ---------------------------------------------------------------------------
// Hold-progress haptic milestones — a founder addition beyond the design
// handoff (which specs only the hold-start tick and the completion impact):
// a selection tick as the fill crosses 25/50/75%, completing the Duolingo-
// style commitment ramp of touch-tick → 25% → 50% → 75% → completion thud
// (~every 200ms across the 800ms hold). Drag-mode haptics are unchanged.
// ---------------------------------------------------------------------------

const HOLD_HAPTIC_MILESTONES = [0.25, 0.5, 0.75] as const;

/**
 * Which milestones fire as hold progress moves `from` → `to`. Half-open on
 * the low side (from < m ≤ to): a frame landing exactly on a milestone
 * fires it, and the next frame starting there doesn't re-fire it. An
 * early-release reset (to = 0) crosses nothing, which is exactly what
 * re-arms every milestone for the next hold attempt.
 */
export function holdMilestonesCrossed(from: number, to: number): number[] {
  'worklet';
  return HOLD_HAPTIC_MILESTONES.filter(
    (milestone) => from < milestone && to >= milestone
  );
}

/**
 * Obsidian body shades from the README's third radial gradient. Deliberately
 * not palette tokens: they are one-off "dark glass" shades between richBlack
 * and midnight that exist only inside this orb.
 */
const OBSIDIAN_CENTER = '#10192a';
const OBSIDIAN_MID = '#070d16';
const OBSIDIAN_EDGE = '#04070c';

/**
 * The ember core's center alpha is 0.15 + p·0.75 and its mid stop is
 * 0.06 + p·0.3 (README). Both share the ratio 0.4, so rendering the stops at
 * their p = 1 maxima (0.9 / 0.36) and scaling the whole layer's opacity by
 * (0.15 + p·0.75) / 0.9 reproduces both curves exactly.
 */
const CORE_STOP_CENTER_ALPHA = 0.9;
const CORE_STOP_MID_ALPHA = 0.36;
const coreLayerOpacity = (p: number) => {
  'worklet';
  return (0.15 + p * 0.75) / CORE_STOP_CENTER_ALPHA;
};

/**
 * CSS `radial-gradient(circle at x% y%)` extends to the farthest corner by
 * default; SVG radial gradients need that radius spelled out.
 */
const orbRadial = (cxRatio: number, cyRatio: number) => {
  const cx = ORB_SIZE * cxRatio;
  const cy = ORB_SIZE * cyRatio;
  const r = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(ORB_SIZE - cx, cy),
    Math.hypot(cx, ORB_SIZE - cy),
    Math.hypot(ORB_SIZE - cx, ORB_SIZE - cy)
  );
  return { cx, cy, r };
};

const HIGHLIGHT_GRADIENT = orbRadial(0.34, 0.26);
const CORE_GRADIENT = orbRadial(0.5, 0.68);
const BODY_GRADIENT = orbRadial(0.5, 0.4);

const HOLD_RING_RADIUS = (HOLD_RING_SIZE - HOLD_RING_STROKE) / 2;
const HOLD_RING_CIRCUMFERENCE = 2 * Math.PI * HOLD_RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const fireSelectionHaptic = () => {
  void Haptics.selectionAsync();
};
const fireSpringBackHaptic = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** True while VoiceOver/TalkBack or the system reduce-motion setting is on. */
function useAccessibilityFlags() {
  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const screenReaderSub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );
    const reduceMotionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );
    return () => {
      mounted = false;
      screenReaderSub.remove();
      reduceMotionSub.remove();
    };
  }, []);

  return { screenReaderEnabled, reduceMotionEnabled };
}

/**
 * The dark "obsidian" drag orb — three stacked radial gradients (glass
 * highlight over a warm ember core over the dark body) whose ember core
 * wakes as `p` rises. Layered shadows: the outer wrapper carries the
 * animated ember glow, the inner view the static drop shadow (iOS composes
 * one shadow per layer; the README's inset shadow is folded into the body
 * gradient's dark edge).
 */
function ObsidianOrb({
  p,
  pulse,
  reduceMotion,
}: {
  /** Proximity/hold progress, 0–1. Drives the ember core and glow. */
  p: SharedValue<number>;
  /** Resting-pulse boost (0–PULSE_PEAK). Drives the micro scale breathe. */
  pulse: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const glowStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        shadowRadius: 6,
        shadowOpacity: 0.12,
        transform: [{ scale: 1 }],
      };
    }
    return {
      shadowRadius: 20 * p.value + 6,
      shadowOpacity: 0.12 + p.value * 0.4,
      transform: [
        { scale: 1 + (PULSE_MAX_SCALE - 1) * (pulse.value / PULSE_PEAK) },
      ],
    };
  });

  const coreProps = useAnimatedProps(() => ({
    opacity: coreLayerOpacity(Math.min(p.value, 1)),
  }));

  const center = ORB_SIZE / 2;

  return (
    <Animated.View style={[styles.orbGlow, glowStyle]}>
      <View style={styles.orbShadow}>
        <Svg width={ORB_SIZE} height={ORB_SIZE}>
          <Defs>
            <RadialGradient
              id="orb-body"
              gradientUnits="userSpaceOnUse"
              cx={BODY_GRADIENT.cx}
              cy={BODY_GRADIENT.cy}
              rx={BODY_GRADIENT.r}
              ry={BODY_GRADIENT.r}
            >
              <Stop offset="0" stopColor={OBSIDIAN_CENTER} />
              <Stop offset="0.7" stopColor={OBSIDIAN_MID} />
              <Stop offset="1" stopColor={OBSIDIAN_EDGE} />
            </RadialGradient>
            <RadialGradient
              id="orb-core"
              gradientUnits="userSpaceOnUse"
              cx={CORE_GRADIENT.cx}
              cy={CORE_GRADIENT.cy}
              rx={CORE_GRADIENT.r}
              ry={CORE_GRADIENT.r}
            >
              <Stop
                offset="0"
                stopColor={palette.cinnabar}
                stopOpacity={CORE_STOP_CENTER_ALPHA}
              />
              <Stop
                offset="0.34"
                stopColor={palette.cinnabar}
                stopOpacity={CORE_STOP_MID_ALPHA}
              />
              <Stop offset="0.6" stopColor={palette.cinnabar} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id="orb-highlight"
              gradientUnits="userSpaceOnUse"
              cx={HIGHLIGHT_GRADIENT.cx}
              cy={HIGHLIGHT_GRADIENT.cy}
              rx={HIGHLIGHT_GRADIENT.r}
              ry={HIGHLIGHT_GRADIENT.r}
            >
              <Stop offset="0" stopColor={palette.bone} stopOpacity={0.2} />
              <Stop offset="0.22" stopColor={palette.bone} stopOpacity={0.04} />
              <Stop offset="0.34" stopColor={palette.bone} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={center} cy={center} r={center} fill="url(#orb-body)" />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={center}
            fill="url(#orb-core)"
            animatedProps={coreProps}
          />
          <Circle
            cx={center}
            cy={center}
            r={center}
            fill="url(#orb-highlight)"
          />
          <Circle
            cx={center}
            cy={center}
            r={center - 0.5}
            fill="none"
            stroke={withAlpha(palette.bone, 0.16)}
            strokeWidth={1}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

/**
 * Single-choice hold indicator — a hollow 66pt ring around the orb that
 * fills clockwise from 12 o'clock with hold progress (the RN stand-in for
 * the web reference's conic-gradient, per ProgressRing's arc recipe).
 */
function HoldRing({
  progress,
  testID,
}: {
  progress: SharedValue<number>;
  testID?: string;
}) {
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset:
      HOLD_RING_CIRCUMFERENCE * (1 - Math.min(progress.value, 1)),
  }));

  const center = HOLD_RING_SIZE / 2;
  const rotation = `rotate(-90 ${center} ${center})`;

  return (
    <View style={styles.holdRing} testID={testID} pointerEvents="none">
      <Svg width={HOLD_RING_SIZE} height={HOLD_RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          r={HOLD_RING_RADIUS}
          fill="none"
          stroke={withAlpha(palette.bone, 0.15)}
          strokeWidth={HOLD_RING_STROKE}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={HOLD_RING_RADIUS}
          fill="none"
          stroke={palette.sandy}
          strokeWidth={HOLD_RING_STROKE}
          strokeDasharray={HOLD_RING_CIRCUMFERENCE}
          animatedProps={ringProps}
          transform={rotation}
        />
      </Svg>
    </View>
  );
}

export type DecisionSliderProps = {
  /**
   * 1 label = hold-to-commit mode; 2 labels = drag mode. Never more (spec
   * invariant) — enforced by the tuple type, and by a dev-mode throw for
   * consumers holding runtime arrays.
   */
  choices: readonly [string] | readonly [string, string];
  /** Called once after the 650ms commit settle. Index into `choices`. */
  onCommit: (index: number) => void;
  /**
   * Eyebrow text override. Omit for the spec defaults ("The path splits" /
   * "One path remains"); null hides it.
   */
  eyebrow?: string | null;
  /**
   * Gestures off + reduced opacity; commit unreachable. If this flips true
   * during the 650ms settle window, the commit is suppressed but the visuals
   * stay locked (committed look) and `onCommit` will never fire, even after
   * re-enabling — consumers that can disable mid-flight should key-remount
   * to reset rather than re-enable.
   */
  disabled?: boolean;
  testID?: string;
};

type Side = -1 | 1;

/**
 * Story-quest decision control — commit a choice by dragging the obsidian
 * orb toward it (two choices) or holding the orb while a ring fills (single
 * choice). Replaces button CTAs for narrative decisions.
 *
 * With a screen reader active, each choice label is a tappable button that
 * commits directly — the drag is an enhancement, never the only path.
 *
 * The idle orb carries a subtle resting pulse (ember core, glow, ≤2% scale
 * breathe) — a founder addition beyond the design handoff, which has no
 * resting pulse; do not flag it as spec drift. It yields to interaction,
 * stops when committed/disabled, and is skipped under reduced motion.
 * Likewise founder-added: hold-fill haptic ticks at 25/50/75% progress
 * (see the hold-progress milestones section) — the handoff specs only the
 * hold-start tick and the completion impact.
 */
export function DecisionSlider({
  choices,
  onCommit,
  eyebrow,
  disabled = false,
  testID,
}: DecisionSliderProps) {
  if (__DEV__ && (choices.length < 1 || choices.length > 2)) {
    throw new Error(
      `DecisionSlider requires exactly 1 or 2 choices, got ${choices.length} ` +
        '(spec invariant: a decision is always one or two equal paths).'
    );
  }

  const single = choices.length === 1;
  const { screenReaderEnabled, reduceMotionEnabled } = useAccessibilityFlags();

  const x = useSharedValue(0);
  const dragBase = useSharedValue(0);
  const inCommitZone = useSharedValue(false);
  const holdProgress = useSharedValue(0);

  // `committedSide` locks the labels; `firedRef` is the reference's
  // commit-once guard (no double commit from a re-drag or a second hold
  // completing during the 650ms settle window).
  const [committedSide, setCommittedSide] = React.useState<Side | null>(null);
  const firedRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const settleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Latest-props ref: gesture worklets capture `commitChoice` when a drag or
  // hold begins, and the settle timeout outlives the render that armed it —
  // both must see the freshest `onCommit`/`disabled`, not a stale capture.
  const latest = React.useRef({ onCommit, disabled, single });
  React.useEffect(() => {
    latest.current = { onCommit, disabled, single };
  });

  const commitChoice = React.useCallback((side: Side) => {
    // firedRef: commit exactly once. mountedRef: a runOnJS-delivered commit
    // can land in the JS tick after unmount, arming a timer the unmount
    // cleanup already missed. disabled: a cancellation-driven disable can
    // race the release — a just-disabled control must not commit.
    if (firedRef.current || !mountedRef.current || latest.current.disabled) {
      return;
    }
    firedRef.current = true;
    setCommittedSide(side);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const index = decisionCommitIndex(side, latest.current.single);
    settleTimerRef.current = setTimeout(() => {
      if (latest.current.disabled) return;
      latest.current.onCommit(index);
    }, COMMIT_SETTLE_MS);
  }, []);

  // The web reference leaks its settle timeout on unmount; clean it up here.
  // Re-arm mountedRef on mount: under a StrictMode mount→cleanup→remount
  // cycle refs persist, so cleanup alone would leave it false forever.
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  // Milestone ticks route through a JS-side guard: the a11y tap path jumps
  // holdProgress straight to 1, which would burst all three ticks on top of
  // the commit impact — firedRef is already set by then, so they're dropped.
  const fireHoldMilestoneHaptic = React.useCallback(() => {
    if (firedRef.current) return;
    void Haptics.selectionAsync();
  }, []);

  // Worklet-side milestone tracker (same previous/current pattern as the
  // inCommitZone threshold haptic): each 25/50/75% crossing ticks once per
  // hold attempt. The early-release reset to 0 crosses nothing, re-arming
  // all milestones for the next attempt. holdProgress only moves in single
  // mode, so this never fires for drags.
  useAnimatedReaction(
    () => holdProgress.value,
    (current, previous) => {
      if (previous === null) return;
      const crossed = holdMilestonesCrossed(previous, current);
      for (let i = 0; i < crossed.length; i += 1) {
        runOnJS(fireHoldMilestoneHaptic)();
      }
    },
    [fireHoldMilestoneHaptic]
  );

  const interactive = !disabled && committedSide === null;

  const panGesture = Gesture.Pan()
    .enabled(interactive && !single)
    // A second resting finger would steer the averaged translation toward a
    // commit — decisions are one-finger gestures.
    .maxPointers(1)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onStart(() => {
      cancelAnimation(x);
      dragBase.value = x.value;
    })
    .onUpdate((event) => {
      // 1:1 finger tracking — no transitions while dragging.
      const next = Math.max(
        -TRAVEL_RADIUS,
        Math.min(TRAVEL_RADIUS, dragBase.value + event.translationX)
      );
      x.value = next;
      const crossed = isDecisionCommitRelease(next);
      if (crossed !== inCommitZone.value) {
        inCommitZone.value = crossed;
        runOnJS(fireSelectionHaptic)();
      }
    })
    .onEnd((_event, success) => {
      const settle = {
        duration: SETTLE_MS,
        easing: Easing.bezier(...easing.emberOut),
      };
      // RNGH invokes onEnd on gesture CANCELLATION too (success === false):
      // `.enabled(false)` mid-drag, iOS touch-cancel from a system alert or
      // edge swipe. A cancelled drag must never commit, and the zone tracker
      // resets so the next threshold crossing fires its haptic again.
      if (!success) {
        inCommitZone.value = false;
        x.value = withTiming(0, settle);
        return;
      }
      if (isDecisionCommitRelease(x.value)) {
        const side: Side = x.value >= 0 ? 1 : -1;
        x.value = withTiming(side * TRAVEL_RADIUS, settle);
        runOnJS(commitChoice)(side);
      } else {
        x.value = withTiming(0, settle);
        runOnJS(fireSpringBackHaptic)();
      }
    });

  const holdGesture = Gesture.LongPress()
    .enabled(interactive && single)
    // Activation is irrelevant — the fill is driven from onBegin/onFinalize —
    // but minDuration must outlast the hold so LongPress never "activates"
    // and ends the touch early.
    .minDuration(HOLD_DURATION_MS * 2)
    .maxDistance(ORB_SIZE)
    .onBegin(() => {
      runOnJS(fireSelectionHaptic)();
      holdProgress.value = withTiming(
        1,
        { duration: HOLD_DURATION_MS, easing: Easing.linear },
        (finished) => {
          if (finished) {
            runOnJS(commitChoice)(1);
          }
        }
      );
    })
    .onFinalize(() => {
      // Released (or moved off) early: reset instantly, like the reference.
      if (holdProgress.value < 1) {
        cancelAnimation(holdProgress);
        holdProgress.value = 0;
      }
    });

  const isCommitted = committedSide !== null;

  /** Proximity 0–1 driving the ember core, glow, trail, and chevrons. */
  const pValue = useDerivedValue(() => {
    if (isCommitted) return 1;
    if (single) return holdProgress.value * HOLD_EMBER_CAP;
    return Math.min(Math.abs(x.value) / TRAVEL_RADIUS, 1);
  }, [isCommitted, single]);

  // Resting-pulse driver: an infinite UI-thread breathe (no per-frame JS, no
  // React state). Runs only while idle-eligible; interaction yielding is
  // continuous via restingPulseBoost inside `orbP`, so a drag or hold never
  // fights the repeat — its contribution just scales to zero.
  const pulsePhase = useSharedValue(0);
  const pulseActive = !disabled && !isCommitted && !reduceMotionEnabled;

  React.useEffect(() => {
    if (!pulseActive) {
      // Committed, disabled, or reduced motion: static rest state.
      cancelAnimation(pulsePhase);
      pulsePhase.value = withTiming(0, { duration: durations.fast });
      return;
    }
    pulsePhase.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: PULSE_PERIOD_MS / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: PULSE_PERIOD_MS / 2,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1
    );
    return () => cancelAnimation(pulsePhase);
  }, [pulseActive, pulsePhase]);

  // Suppressed pulse contribution, 0–PULSE_PEAK. `pValue` already computes
  // the interaction proximity (and is 1 when committed, where the yield
  // factor bottoms out at 0 — equivalent to an explicit committed check).
  const pulseBoost = useDerivedValue(
    () => restingPulseBoost(pulsePhase.value, pValue.value),
    []
  );

  /** What the orb renders: interaction proximity + resting pulse. */
  const orbP = useDerivedValue(
    () => Math.min(pValue.value + pulseBoost.value, 1),
    []
  );

  const orbSlotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: single ? 0 : x.value }],
  }));

  const labelVisuals = React.useCallback(
    (options: { mySide: Side; xVal: number; committed: Side | null }) => {
      'worklet';
      const { mySide, xVal, committed } = options;
      const p = Math.min(Math.abs(xVal) / TRAVEL_RADIUS, 1);
      const side = xVal === 0 ? 0 : Math.sign(xVal);
      const active =
        committed !== null
          ? committed === mySide
          : side === mySide && p > LABEL_ACTIVE_THRESHOLD;
      const dim = committed !== null && committed !== mySide;
      // textShadowColor/textShadowOffset are constant and live in the static
      // `styles.label` (see note there): a color-valued style-only attribute in
      // the animated style is surfaced flat by reanimated on Fabric, tripping
      // RN's warnForStyleProps. Only the radius is dynamic, and it's safe to
      // animate (a plain style attribute, unlike the color).
      return {
        color: withTiming(active ? LABEL_ACTIVE_COLOR : LABEL_RESTING_COLOR, {
          duration: LABEL_COLOR_MS,
        }),
        opacity: withTiming(dim ? 0.3 : active ? 1 : 0.85, {
          duration: LABEL_FADE_MS,
        }),
        textShadowRadius: active && !reduceMotionEnabled ? 14 * p : 0,
      };
    },
    [reduceMotionEnabled]
  );

  const leftLabelStyle = useAnimatedStyle(() =>
    labelVisuals({ mySide: -1, xVal: x.value, committed: committedSide })
  );
  // In single mode the sole label is the chosen side (side 1, the hold
  // commit) — it locks Sandy on commit and never dims. (The web reference
  // dims it via its two-choice code path; the README's "other label fades"
  // rule has no "other" label here, so that artifact isn't copied.)
  const rightLabelStyle = useAnimatedStyle(() =>
    labelVisuals({ mySide: 1, xVal: x.value, committed: committedSide })
  );

  const chevronVisuals = React.useCallback(
    (options: { mySide: Side; xVal: number; committed: Side | null }) => {
      'worklet';
      const { mySide, xVal, committed } = options;
      const p =
        committed !== null ? 1 : Math.min(Math.abs(xVal) / TRAVEL_RADIUS, 1);
      const side = committed ?? (xVal === 0 ? 0 : Math.sign(xVal));
      return side === mySide ? p : 0;
    },
    []
  );

  const leftChevronStyle = useAnimatedStyle(() => ({
    opacity:
      0.25 +
      chevronVisuals({ mySide: -1, xVal: x.value, committed: committedSide }) *
        0.75,
  }));
  const rightChevronStyle = useAnimatedStyle(() => ({
    opacity:
      0.25 +
      chevronVisuals({ mySide: 1, xVal: x.value, committed: committedSide }) *
        0.75,
  }));
  const leftChevronTintStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      chevronVisuals({ mySide: -1, xVal: x.value, committed: committedSide }) >
        CHEVRON_TINT_THRESHOLD
        ? 1
        : 0,
      { duration: durations.fast }
    ),
  }));
  const rightChevronTintStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      chevronVisuals({ mySide: 1, xVal: x.value, committed: committedSide }) >
        CHEVRON_TINT_THRESHOLD
        ? 1
        : 0,
      { duration: durations.fast }
    ),
  }));

  const trailLeftStyle = useAnimatedStyle(() => {
    const width = Math.max(-x.value, 0);
    return {
      width,
      shadowRadius: reduceMotionEnabled ? 0 : 12 * pValue.value,
      shadowOpacity: reduceMotionEnabled || width === 0 ? 0 : 0.5,
    };
  });
  const trailRightStyle = useAnimatedStyle(() => {
    const width = Math.max(x.value, 0);
    return {
      width,
      shadowRadius: reduceMotionEnabled ? 0 : 12 * pValue.value,
      shadowOpacity: reduceMotionEnabled || width === 0 ? 0 : 0.5,
    };
  });

  const eyebrowText =
    eyebrow === undefined
      ? single
        ? 'One path remains'
        : 'The path splits'
      : eyebrow;

  const handleAccessibleTap = (index: number) => {
    if (disabled || !screenReaderEnabled || firedRef.current) return;
    const side: Side = single || index === 1 ? 1 : -1;
    if (single) {
      holdProgress.value = 1;
    } else {
      x.value = withTiming(side * TRAVEL_RADIUS, {
        duration: SETTLE_MS,
        easing: Easing.bezier(...easing.emberOut),
      });
    }
    commitChoice(side);
  };

  const renderChoice = (index: number) => {
    const alignStyle = single
      ? styles.labelCenter
      : index === 0
        ? styles.labelLeft
        : styles.labelRight;
    const animatedStyle =
      !single && index === 0 ? leftLabelStyle : rightLabelStyle;
    return (
      <Pressable
        style={styles.choicePressable}
        testID={childID(`choice-${index}`)}
        accessibilityRole="button"
        accessibilityLabel={choices[index]}
        // Post-commit taps are swallowed by the commit-once guard, so tell
        // assistive tech the button is off rather than silently inert.
        accessibilityState={{ disabled: disabled || isCommitted }}
        onPress={() => handleAccessibleTap(index)}
      >
        <Animated.Text style={[styles.label, alignStyle, animatedStyle]}>
          {choices[index]}
        </Animated.Text>
      </Pressable>
    );
  };

  const childID = (suffix: string) =>
    testID ? `${testID}-${suffix}` : undefined;

  return (
    <View
      style={[styles.root, disabled ? styles.disabled : null]}
      testID={testID}
    >
      {eyebrowText !== null ? (
        <Text style={styles.eyebrow}>{eyebrowText}</Text>
      ) : null}

      <View style={[styles.choiceRow, single ? styles.choiceRowSingle : null]}>
        {renderChoice(0)}
        {!single ? (
          <>
            <Text style={styles.orSeparator}>or</Text>
            {renderChoice(1)}
          </>
        ) : null}
      </View>

      <GestureDetector gesture={single ? holdGesture : panGesture}>
        <View style={styles.trackZone}>
          {!single ? (
            <>
              <View style={styles.track} testID={childID('track')} />
              <Animated.View
                style={[styles.trail, styles.trailLeftAnchor, trailLeftStyle]}
                testID={childID('trail-left')}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={[palette.sandy, withAlpha(palette.sandy, 0.05)]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.trailFill}
                />
              </Animated.View>
              <Animated.View
                style={[styles.trail, styles.trailRightAnchor, trailRightStyle]}
                testID={childID('trail-right')}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={[withAlpha(palette.sandy, 0.05), palette.sandy]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.trailFill}
                />
              </Animated.View>
              <Animated.View
                style={[styles.chevron, styles.chevronLeft, leftChevronStyle]}
                testID={childID('chevron-left')}
                pointerEvents="none"
              >
                <ChevronsLeft
                  size={CHEVRON_SIZE}
                  color={withAlpha(palette.bone, 0.6)}
                />
                <Animated.View
                  style={[styles.chevronTint, leftChevronTintStyle]}
                >
                  <ChevronsLeft size={CHEVRON_SIZE} color={palette.sandy} />
                </Animated.View>
              </Animated.View>
              <Animated.View
                style={[styles.chevron, styles.chevronRight, rightChevronStyle]}
                testID={childID('chevron-right')}
                pointerEvents="none"
              >
                <ChevronsRight
                  size={CHEVRON_SIZE}
                  color={withAlpha(palette.bone, 0.6)}
                />
                <Animated.View
                  style={[styles.chevronTint, rightChevronTintStyle]}
                >
                  <ChevronsRight size={CHEVRON_SIZE} color={palette.sandy} />
                </Animated.View>
              </Animated.View>
            </>
          ) : (
            <HoldRing progress={holdProgress} testID={childID('hold-ring')} />
          )}
          <Animated.View
            style={[styles.orbSlot, orbSlotStyle]}
            testID={childID('orb')}
          >
            <ObsidianOrb
              p={orbP}
              pulse={pulseBoost}
              reduceMotion={reduceMotionEnabled}
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const LABEL_FONT_SIZE = 16;
const OR_FONT_SIZE = 11;

const styles = StyleSheet.create({
  root: {
    gap: STACK_GAP,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  eyebrow: {
    ...text.eyebrow,
    color: palette.cinnabar,
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    minHeight: 44,
  },
  choiceRowSingle: {
    minHeight: 24,
  },
  choicePressable: {
    flex: 1,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: LABEL_FONT_SIZE * 1.35,
    // The glow's color + offset are declared statically here, not in the
    // animated label style. textShadowColor is a color-valued, style-only
    // attribute; on the New Architecture reanimated hands color props to
    // Text's setNativeProps flat (top-level), so RN's warnForStyleProps flags
    // "setting the style { textShadowColor: ... } as a prop". Radius (the only
    // animated part) stays in labelVisuals and merges over this at render.
    textShadowColor: LABEL_GLOW_COLOR,
    textShadowOffset: { width: 0, height: 0 },
  },
  labelLeft: {
    textAlign: 'left',
  },
  labelRight: {
    textAlign: 'right',
  },
  labelCenter: {
    textAlign: 'center',
  },
  orSeparator: {
    alignSelf: 'center',
    flexShrink: 0,
    fontFamily: fontFamily.semibold,
    fontSize: OR_FONT_SIZE,
    letterSpacing: OR_FONT_SIZE * 0.18,
    textTransform: 'uppercase',
    color: withAlpha(palette.bone, 0.35),
  },
  trackZone: {
    height: TRACK_ZONE_HEIGHT,
  },
  track: {
    position: 'absolute',
    top: '50%',
    left: TRACK_INSET,
    right: TRACK_INSET,
    height: 2,
    marginTop: -1,
    borderRadius: 1,
    backgroundColor: withAlpha(palette.bone, 0.1),
  },
  // The glow shadow lives on this (non-clipping) container while the
  // gradient rounds itself — iOS drops shadows from views that clip with
  // `overflow: hidden` (see QuestCard's layering note).
  trail: {
    position: 'absolute',
    top: '50%',
    height: 4,
    marginTop: -2,
    zIndex: 1,
    shadowColor: palette.sandy,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  trailLeftAnchor: {
    right: '50%',
  },
  trailRightAnchor: {
    left: '50%',
  },
  trailFill: {
    flex: 1,
    borderRadius: 2,
  },
  chevron: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(CHEVRON_SIZE / 2),
  },
  chevronLeft: {
    marginLeft: -(TRAVEL_RADIUS - CHEVRON_INSET) - CHEVRON_SIZE / 2,
  },
  chevronRight: {
    marginLeft: TRAVEL_RADIUS - CHEVRON_INSET - CHEVRON_SIZE / 2,
  },
  chevronTint: {
    ...StyleSheet.absoluteFillObject,
  },
  holdRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: HOLD_RING_SIZE,
    height: HOLD_RING_SIZE,
    marginTop: -(HOLD_RING_SIZE / 2),
    marginLeft: -(HOLD_RING_SIZE / 2),
  },
  orbSlot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(ORB_SIZE / 2 + ORB_PADDING),
    marginLeft: -(ORB_SIZE / 2 + ORB_PADDING),
    padding: ORB_PADDING,
    zIndex: 2,
  },
  // Both shadow layers get a circular background so iOS derives the shadow
  // from a solid shape instead of rasterizing the SVG's alpha channel. The
  // orb's own edge shade keeps it invisible behind the artwork.
  orbGlow: {
    borderRadius: ORB_SIZE / 2,
    backgroundColor: OBSIDIAN_EDGE,
    shadowColor: palette.cinnabar,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  orbShadow: {
    borderRadius: ORB_SIZE / 2,
    backgroundColor: OBSIDIAN_EDGE,
    shadowColor: palette.richBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.65,
    elevation: 8,
  },
});
