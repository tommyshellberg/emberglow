import * as React from 'react';

import { DECK_SWIPE_THRESHOLD } from '@/features/home/constants/home-constants';
import { act, render, screen, setup } from '@/lib/test-utils';

import { QuestDeck, type QuestDeckItem } from './quest-deck';

const TOUCH_START_X = 200;
const TOUCH_Y = 100;
// Each leg of the simulated drag must clear the threshold on its own: React
// Native resets the drag distance to 0 at the moment the deck is granted the
// gesture, so the distance the release handler sees is only the travel after
// that point.
const SWIPE_LEG = DECK_SWIPE_THRESHOLD + 20;

/**
 * The subset of the deck's props we drive by hand. These are the handlers
 * `PanResponder.create(...).panHandlers` puts on the deck View. We call them
 * directly rather than through `fireEvent`, because `fireEvent` first asks
 * `onMoveShouldSetResponder()` with no arguments to decide whether the event
 * is deliverable; the deck answers "no" while its drag distance is still 0,
 * so `fireEvent` would drop every event and the test would pass vacuously.
 */
type PanHandlers = {
  onStartShouldSetResponderCapture: (event: unknown) => boolean;
  onMoveShouldSetResponderCapture: (event: unknown) => boolean;
  onMoveShouldSetResponder: (event: unknown) => boolean;
  onResponderGrant: (event: unknown) => boolean;
  onResponderMove: (event: unknown) => void;
  onResponderRelease: (event: unknown) => void;
};

/**
 * Builds the shape of a touch event that `PanResponder` reads. It only looks
 * at `touchHistory`, from which it works out how far the finger has moved
 * since the previous event.
 */
function touchEvent(
  previousPageX: number,
  currentPageX: number,
  timeStamp: number
) {
  return {
    nativeEvent: { touches: [{ identifier: 1 }] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timeStamp,
      touchBank: [
        {
          touchActive: true,
          startPageX: TOUCH_START_X,
          startPageY: TOUCH_Y,
          startTimeStamp: 0,
          currentPageX,
          currentPageY: TOUCH_Y,
          currentTimeStamp: timeStamp,
          previousPageX,
          previousPageY: TOUCH_Y,
          previousTimeStamp: timeStamp - 10,
        },
      ],
    },
  };
}

/**
 * Drags the deck sideways and lets go, in the same order React Native's touch
 * system does it on a device: finger down, move far enough that the deck
 * claims the gesture, deck is granted it, move further, finger up.
 *
 * `direction` is -1 for a swipe to the left and +1 for a swipe to the right.
 * Returns whether the deck claimed the gesture at all.
 */
function swipeDeck(direction: -1 | 1): boolean {
  const handlers = screen.getByTestId('quest-deck').props as PanHandlers;
  const afterFirstLeg = TOUCH_START_X + direction * SWIPE_LEG;
  const afterSecondLeg = TOUCH_START_X + direction * SWIPE_LEG * 2;

  let claimed = false;
  act(() => {
    handlers.onStartShouldSetResponderCapture(
      touchEvent(TOUCH_START_X, TOUCH_START_X, 10)
    );
    handlers.onMoveShouldSetResponderCapture(
      touchEvent(TOUCH_START_X, afterFirstLeg, 20)
    );
    claimed = handlers.onMoveShouldSetResponder(
      touchEvent(TOUCH_START_X, afterFirstLeg, 20)
    );
    if (!claimed) return;

    handlers.onResponderGrant(touchEvent(TOUCH_START_X, afterFirstLeg, 20));
    handlers.onResponderMove(touchEvent(afterFirstLeg, afterSecondLeg, 30));
    handlers.onResponderRelease(touchEvent(afterFirstLeg, afterSecondLeg, 30));
  });
  return claimed;
}

const data: QuestDeckItem[] = [
  {
    id: 'story',
    mode: 'story',
    title: "Stone Library & King's Method",
    subtitle: 'Vaedros Kingdom',
    duration: 45,
    xp: 90,
    description: 'Rowan and I confronted uncomfortable truths.',
    progress: 0.48,
    showProgress: true,
  },
  {
    id: 'custom',
    mode: 'custom',
    title: 'Start Custom Quest',
    subtitle: 'Free Play Mode',
    duration: 5,
    xp: 15,
    description: 'An adventure of your own design.',
    progress: 0,
  },
  {
    id: 'cooperative',
    mode: 'cooperative',
    title: 'Cooperative Quest',
    subtitle: 'Team Challenge',
    duration: 5,
    xp: 15,
    description: 'Invite a friend to stay off your phone together.',
    progress: 0,
  },
];

describe('QuestDeck', () => {
  it('renders all three cards, with the active one showing its full content and the others showing a strip label', () => {
    render(<QuestDeck data={data} activeIndex={0} onAdvance={jest.fn()} />);

    // Front card (story, order 0) — full content visible.
    expect(screen.getByText("Stone Library & King's Method")).toBeOnTheScreen();
    expect(
      screen.getByText('Rowan and I confronted uncomfortable truths.')
    ).toBeOnTheScreen();

    // Back cards (custom order 1, cooperative order 2) — strip labels visible.
    expect(screen.getByText('Custom')).toBeOnTheScreen();
    expect(screen.getByText('Co-op')).toBeOnTheScreen();
  });

  it('exposes back cards as accessible buttons that advance the deck', async () => {
    const onAdvance = jest.fn();
    const { user } = setup(
      <QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />
    );

    await user.press(screen.getByRole('button', { name: 'Show Custom card' }));

    expect(onAdvance).toHaveBeenCalledWith(1);
  });

  it('advances by 1 regardless of which back card is tapped', async () => {
    const onAdvance = jest.fn();
    const { user } = setup(
      <QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />
    );

    await user.press(screen.getByRole('button', { name: 'Show Co-op card' }));

    expect(onAdvance).toHaveBeenCalledWith(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('advances forward when swiped left', () => {
    const onAdvance = jest.fn();
    render(<QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />);

    expect(swipeDeck(-1)).toBe(true);
    expect(onAdvance).toHaveBeenCalledWith(1);
  });

  it('advances backward when swiped right', () => {
    const onAdvance = jest.fn();
    render(<QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />);

    expect(swipeDeck(1)).toBe(true);
    expect(onAdvance).toHaveBeenCalledWith(-1);
  });

  it('swipes call the onAdvance from the latest render, not the one from mount', () => {
    const onAdvanceAtMount = jest.fn();
    const onAdvanceNow = jest.fn();

    const { rerender } = render(
      <QuestDeck data={data} activeIndex={0} onAdvance={onAdvanceAtMount} />
    );
    rerender(<QuestDeck data={data} activeIndex={1} onAdvance={onAdvanceNow} />);

    swipeDeck(-1);

    expect(onAdvanceAtMount).not.toHaveBeenCalled();
    expect(onAdvanceNow).toHaveBeenCalledWith(1);
  });

  it('does not expose the front card as a "Show X card" button', () => {
    render(<QuestDeck data={data} activeIndex={0} onAdvance={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Show Story card' })
    ).not.toBeOnTheScreen();
  });
});
