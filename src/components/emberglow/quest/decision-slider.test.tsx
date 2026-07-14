import * as React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { act, fireEvent, render, screen } from '@/lib/test-utils';
import { palette, withAlpha } from '@/theme';

import {
  DecisionSlider,
  decisionCommitIndex,
  holdMilestonesCrossed,
  isDecisionCommitRelease,
  restingPulseBoost,
} from './decision-slider';

// The repo's root __mocks__/react-native-gesture-handler.ts (real public
// API over a mocked native layer) can render GestureDetector, but it gives
// tests no handle on the Pan callbacks the component registers — and the
// drag-commit describe block below drives those callbacks directly. So
// this suite overrides it locally: chainable gesture builders that capture
// their callbacks into registries (`__panCallbacks` / `__longPressCallbacks`)
// so tests can invoke the pan handlers as RNGH would, + a pass-through
// detector. The rest of the gesture math is worklet code exercised
// on-device, not in Jest.
jest.mock('react-native-gesture-handler', () => {
  const panCallbacks: Record<string, any> = {};
  const longPressCallbacks: Record<string, any> = {};
  const chainInto = (store: Record<string, any>) => {
    const chain: Record<string, (arg: unknown) => unknown> = {};
    const methods = [
      'activeOffsetX',
      'failOffsetY',
      'enabled',
      'maxPointers',
      'onStart',
      'onUpdate',
      'onEnd',
      'onBegin',
      'onFinalize',
      'minDuration',
      'maxDistance',
      'shouldCancelWhenOutside',
    ];
    for (const method of methods) {
      chain[method] = (arg: unknown) => {
        store[method] = arg;
        return chain;
      };
    }
    return chain;
  };
  return {
    __panCallbacks: panCallbacks,
    __longPressCallbacks: longPressCallbacks,
    Gesture: {
      Pan: () => chainInto(panCallbacks),
      LongPress: () => chainInto(longPressCallbacks),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

// expo-haptics is a native module the jest environment can't load; the
// component references its enums at call sites, so stub the surface.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const TWO_CHOICES = [
  'Trust the flickering magic within you, whatever it costs',
  'Turn back',
] as const;
const ONE_CHOICE = ['Wake up'] as const;

/** 650ms commit settle, per the decisionSlider README. */
const COMMIT_SETTLE_MS = 650;
/** 0.72 · R (118pt), per the decisionSlider README. */
const COMMIT_DISTANCE = 0.72 * 118;

const gestureMock = jest.requireMock('react-native-gesture-handler') as {
  __panCallbacks: Record<string, any>;
};
const hapticsMock = jest.requireMock('expo-haptics') as {
  selectionAsync: jest.Mock;
  impactAsync: jest.Mock;
};

/** Drive the captured Pan callbacks like RNGH would for a horizontal drag. */
function simulatePan({
  translationX,
  success,
}: {
  translationX: number;
  success: boolean;
}) {
  const pan = gestureMock.__panCallbacks;
  act(() => {
    pan.onStart();
    pan.onUpdate({ translationX });
    pan.onEnd({}, success);
  });
}

function mockAccessibility({
  screenReader = false,
  reduceMotion = false,
} = {}) {
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockResolvedValue(screenReader);
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(reduceMotion);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as any);
}

/** Flush the AccessibilityInfo promises the component reads on mount. */
async function flushMountEffects() {
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessibility();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('DecisionSlider — two-choice mode', () => {
  it('renders both choice labels with the "or" separator', async () => {
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} />);
    await flushMountEffects();

    expect(screen.getByText(TWO_CHOICES[0])).toBeOnTheScreen();
    expect(screen.getByText(TWO_CHOICES[1])).toBeOnTheScreen();
    expect(screen.getByText('or')).toBeOnTheScreen();
  });

  it('declares the label glow color in static style, keeping it off the animated (worklet) style', async () => {
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} />);
    await flushMountEffects();

    // textShadowColor is a color-valued, style-only attribute. On Fabric,
    // reanimated surfaces color props flat to Text's setNativeProps, tripping
    // RN's warnForStyleProps ("setting the style ... as a prop"). Keeping the
    // glow color + offset in the static stylesheet — never in the animated
    // worklet style — is what silences it; only textShadowRadius stays animated.
    const flat = StyleSheet.flatten(
      screen.getByText(TWO_CHOICES[0]).props.style
    );
    expect(flat.textShadowColor).toBe(withAlpha(palette.sandy, 0.45));
    expect(flat.textShadowOffset).toEqual({ width: 0, height: 0 });
  });

  it('shows the default eyebrow "The path splits"', async () => {
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} />);
    await flushMountEffects();

    expect(screen.getByText('The path splits')).toBeOnTheScreen();
  });

  it('renders the track and chevrons but no hold ring', async () => {
    render(
      <DecisionSlider
        choices={TWO_CHOICES}
        onCommit={jest.fn()}
        testID="slider"
      />
    );
    await flushMountEffects();

    expect(screen.getByTestId('slider-track')).toBeOnTheScreen();
    expect(screen.getByTestId('slider-chevron-left')).toBeOnTheScreen();
    expect(screen.getByTestId('slider-chevron-right')).toBeOnTheScreen();
    expect(screen.queryByTestId('slider-hold-ring')).not.toBeOnTheScreen();
  });

  it('anchors each choice with a per-choice testID', async () => {
    render(
      <DecisionSlider
        choices={TWO_CHOICES}
        onCommit={jest.fn()}
        testID="slider"
      />
    );
    await flushMountEffects();

    expect(screen.getByTestId('slider-choice-0')).toBeOnTheScreen();
    expect(screen.getByTestId('slider-choice-1')).toBeOnTheScreen();
  });
});

describe('DecisionSlider — single-choice mode', () => {
  it('renders one label and no "or" separator', async () => {
    render(<DecisionSlider choices={ONE_CHOICE} onCommit={jest.fn()} />);
    await flushMountEffects();

    expect(screen.getByText('Wake up')).toBeOnTheScreen();
    expect(screen.queryByText('or')).not.toBeOnTheScreen();
  });

  it('shows the default eyebrow "One path remains"', async () => {
    render(<DecisionSlider choices={ONE_CHOICE} onCommit={jest.fn()} />);
    await flushMountEffects();

    expect(screen.getByText('One path remains')).toBeOnTheScreen();
  });

  it('renders the hold ring but no track or chevrons', async () => {
    render(
      <DecisionSlider
        choices={ONE_CHOICE}
        onCommit={jest.fn()}
        testID="slider"
      />
    );
    await flushMountEffects();

    expect(screen.getByTestId('slider-hold-ring')).toBeOnTheScreen();
    expect(screen.queryByTestId('slider-track')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('slider-chevron-left')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('slider-chevron-right')).not.toBeOnTheScreen();
    expect(screen.getByTestId('slider-choice-0')).toBeOnTheScreen();
    expect(screen.queryByTestId('slider-choice-1')).not.toBeOnTheScreen();
  });
});

describe('DecisionSlider — eyebrow prop', () => {
  it('renders an override string instead of the default', async () => {
    render(
      <DecisionSlider
        choices={TWO_CHOICES}
        onCommit={jest.fn()}
        eyebrow="Choose wisely"
      />
    );
    await flushMountEffects();

    expect(screen.getByText('Choose wisely')).toBeOnTheScreen();
    expect(screen.queryByText('The path splits')).not.toBeOnTheScreen();
  });

  it('hides the eyebrow entirely when null', async () => {
    render(
      <DecisionSlider
        choices={TWO_CHOICES}
        onCommit={jest.fn()}
        eyebrow={null}
      />
    );
    await flushMountEffects();

    expect(screen.queryByText('The path splits')).not.toBeOnTheScreen();
    expect(screen.queryByText('One path remains')).not.toBeOnTheScreen();
  });
});

describe('DecisionSlider — screen-reader tap commit', () => {
  it('commits the tapped choice index after the 650ms settle, not before', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[1] }));

    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS - 1));
    expect(onCommit).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1);
  });

  it('commits index 0 for a single-choice hold slider', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={ONE_CHOICE} onCommit={onCommit} />);
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: 'Wake up' }));
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it('fires onCommit only once for rapid repeated taps (commit-once guard)', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    const button = screen.getByRole('button', { name: TWO_CHOICES[0] });
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[1] }));
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 3));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it('does not fire onCommit when unmounted during the settle window', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    const { unmount } = render(
      <DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />
    );
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[0] }));
    unmount();
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not commit on label tap when no screen reader is active (drag is the only path)', async () => {
    mockAccessibility({ screenReader: false });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[0] }));
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('DecisionSlider — disabled', () => {
  it('blocks the screen-reader tap commit path', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(
      <DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} disabled />
    );
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[0] }));
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('renders the whole block at reduced opacity', async () => {
    render(
      <DecisionSlider
        choices={TWO_CHOICES}
        onCommit={jest.fn()}
        disabled
        testID="slider"
      />
    );
    await flushMountEffects();

    const root = screen.getByTestId('slider');
    expect(root).toHaveStyle({ opacity: 0.5 });
  });

  it('exposes the disabled state to assistive tech', async () => {
    mockAccessibility({ screenReader: true });
    render(
      <DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} disabled />
    );
    await flushMountEffects();

    expect(screen.getByRole('button', { name: TWO_CHOICES[0] })).toBeDisabled();
  });

  it('blocks the commit when disabled flips during the settle window', async () => {
    mockAccessibility({ screenReader: true });
    jest.useFakeTimers();
    const onCommit = jest.fn();
    const { rerender } = render(
      <DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />
    );
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[0] }));
    rerender(
      <DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} disabled />
    );
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('DecisionSlider — choices invariant', () => {
  it('throws in dev for an empty choices array', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() =>
      render(<DecisionSlider choices={[] as never} onCommit={jest.fn()} />)
    ).toThrow(/1 or 2 choices/);

    consoleError.mockRestore();
  });

  it('throws in dev for more than two choices', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const three = ['a', 'b', 'c'] as unknown as readonly [string, string];

    expect(() =>
      render(<DecisionSlider choices={three} onCommit={jest.fn()} />)
    ).toThrow(/1 or 2 choices/);

    consoleError.mockRestore();
  });
});

describe('DecisionSlider — drag commit path (via captured pan callbacks)', () => {
  it('commits index 1 when released beyond the threshold on the right', async () => {
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    simulatePan({ translationX: COMMIT_DISTANCE + 10, success: true });
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1);
  });

  it('commits index 0 when released beyond the threshold on the left', async () => {
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    simulatePan({ translationX: -(COMMIT_DISTANCE + 10), success: true });
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it('never commits from a cancelled gesture, even past the threshold', async () => {
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    simulatePan({ translationX: COMMIT_DISTANCE + 10, success: false });
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
    expect(hapticsMock.impactAsync).not.toHaveBeenCalled();
  });

  it('springs back without committing when released below the threshold', async () => {
    jest.useFakeTimers();
    const onCommit = jest.fn();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={onCommit} />);
    await flushMountEffects();

    simulatePan({ translationX: COMMIT_DISTANCE - 10, success: true });
    act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS * 2));

    expect(onCommit).not.toHaveBeenCalled();
    expect(hapticsMock.impactAsync).toHaveBeenCalledWith('light');
  });

  it('re-fires the threshold haptic after a cancelled drag (zone tracker resets)', async () => {
    jest.useFakeTimers();
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} />);
    await flushMountEffects();

    simulatePan({ translationX: COMMIT_DISTANCE + 10, success: false });
    expect(hapticsMock.selectionAsync).toHaveBeenCalledTimes(1);

    simulatePan({ translationX: COMMIT_DISTANCE + 10, success: false });
    expect(hapticsMock.selectionAsync).toHaveBeenCalledTimes(2);
  });
});

describe('isDecisionCommitRelease', () => {
  it('is false at exactly the threshold and true just beyond, on both sides', () => {
    expect(isDecisionCommitRelease(COMMIT_DISTANCE)).toBe(false);
    expect(isDecisionCommitRelease(COMMIT_DISTANCE + 0.01)).toBe(true);
    expect(isDecisionCommitRelease(-COMMIT_DISTANCE)).toBe(false);
    expect(isDecisionCommitRelease(-(COMMIT_DISTANCE + 0.01))).toBe(true);
  });
});

describe('decisionCommitIndex', () => {
  it('maps left to 0, right to 1, and single-mode always to 0', () => {
    expect(decisionCommitIndex(-1, false)).toBe(0);
    expect(decisionCommitIndex(1, false)).toBe(1);
    expect(decisionCommitIndex(1, true)).toBe(0);
  });
});

describe('restingPulseBoost', () => {
  it('peaks well below interaction feedback at rest and yields to any interaction', () => {
    // Full pulse phase at rest: peak ember boost of 0.12 — below the 0.15
    // label-active threshold, so drag feedback always reads stronger.
    expect(restingPulseBoost(1, 0)).toBeCloseTo(0.12);
    // Zero phase contributes nothing.
    expect(restingPulseBoost(0, 0)).toBe(0);
    // Halfway to the suppression threshold: amplitude halved.
    expect(restingPulseBoost(1, 0.075)).toBeCloseTo(0.06);
    // At and beyond the threshold (where labels start reacting), fully gone.
    expect(restingPulseBoost(1, 0.15)).toBe(0);
    expect(restingPulseBoost(1, 0.8)).toBe(0);
  });
});

describe('holdMilestonesCrossed', () => {
  it('fires each milestone exactly once as progress rises frame by frame', () => {
    expect(holdMilestonesCrossed(0, 0.2)).toEqual([]);
    expect(holdMilestonesCrossed(0.2, 0.3)).toEqual([0.25]);
    // A frame starting exactly on a milestone does not re-fire it.
    expect(holdMilestonesCrossed(0.25, 0.3)).toEqual([]);
    // A landing exactly on a milestone fires it.
    expect(holdMilestonesCrossed(0.4, 0.5)).toEqual([0.5]);
  });

  it('fires every milestone skipped over by a large jump', () => {
    expect(holdMilestonesCrossed(0.3, 1)).toEqual([0.5, 0.75]);
    expect(holdMilestonesCrossed(0, 1)).toEqual([0.25, 0.5, 0.75]);
  });

  it('fires nothing on an early-release reset, re-arming the next attempt', () => {
    expect(holdMilestonesCrossed(0.6, 0)).toEqual([]);
    // Next attempt rises from 0 again and re-fires normally.
    expect(holdMilestonesCrossed(0, 0.26)).toEqual([0.25]);
  });
});

describe('DecisionSlider — post-commit accessibility', () => {
  it('marks the choice buttons disabled for assistive tech after a commit', async () => {
    mockAccessibility({ screenReader: true });
    render(<DecisionSlider choices={TWO_CHOICES} onCommit={jest.fn()} />);
    await flushMountEffects();

    fireEvent.press(screen.getByRole('button', { name: TWO_CHOICES[1] }));

    expect(screen.getByRole('button', { name: TWO_CHOICES[0] })).toBeDisabled();
    expect(screen.getByRole('button', { name: TWO_CHOICES[1] })).toBeDisabled();
  });
});
