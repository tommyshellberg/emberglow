import { BookOpen, Feather, Layers, Users } from 'lucide-react-native';
import * as React from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import QuestCard, { type HomeQuestMode } from '@/components/home/quest-card';
import {
  ANIMATION_TIMINGS,
  CARD_HEIGHT,
  CARD_WIDTH,
  DECK_HEIGHT,
  DECK_PEEK_OFFSET,
  DECK_REARMOST_OPACITY,
  DECK_SCALE_STEP,
  DECK_SWIPE_THRESHOLD,
} from '@/features/home/constants/home-constants';
import { colors, easing, fontFamily, palette, withAlpha } from '@/theme';

export interface QuestDeckItem {
  id: string;
  mode: HomeQuestMode;
  title: string;
  subtitle: string;
  duration: number;
  xp: number;
  description: string;
  progress: number;
  showProgress?: boolean;
  requiresPremium?: boolean;
  isCompleted?: boolean;
  onRestart?: () => void;
}

export interface QuestDeckProps {
  data: QuestDeckItem[];
  activeIndex: number;
  /** delta is +1 (next) or -1 (previous); the caller wraps modulo its own item count. */
  onAdvance: (delta: number) => void;
}

const MODE_META: Record<
  HomeQuestMode,
  { label: string; Icon: typeof BookOpen }
> = {
  story: { label: 'Story', Icon: BookOpen },
  custom: { label: 'Custom', Icon: Feather },
  cooperative: { label: 'Co-op', Icon: Users },
};

// Front card rests at the bottom of the (taller) deck container so the back
// cards have room to peek above its top edge ("The deck mechanic").
const CARD_TOP = DECK_HEIGHT - CARD_HEIGHT;

/**
 * The Play screen's stacked mode deck (story / custom / cooperative) — a
 * card-deck picker per the play-screen handoff, replacing a horizontal
 * carousel. Back cards peek 16/32pt above the front card, labeled with a
 * strip across their exposed edge; tapping any back card or swiping the
 * deck advances to the next mode.
 *
 * Uses `PanResponder` rather than `react-native-gesture-handler`'s
 * `Gesture`/`GestureDetector` API. Historical reason: the repo's
 * `__mocks__/react-native-gesture-handler.ts` was broken (stale
 * `src/mocks.ts` path), so `GestureDetector` couldn't render in tests.
 * That mock has since been fixed (it now mirrors the package's official
 * jestSetup, so `GestureDetector` works — see decision-slider.tsx), but
 * PanResponder is kept here: it works, and swapping gesture systems is a
 * behavior change with no payoff for this deck.
 */
export function QuestDeck({ data, activeIndex, onAdvance }: QuestDeckProps) {
  const total = data.length;
  const nextItem = data[(activeIndex + 1) % total];
  const nextLabel = nextItem ? MODE_META[nextItem.mode].label : '';

  const panResponder = React.useRef(
    PanResponder.create({
      // Only claim the responder once a drag is clearly horizontal and past
      // the swipe threshold, so vertical scrolling of the screen still wins.
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > DECK_SWIPE_THRESHOLD &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx <= -DECK_SWIPE_THRESHOLD) {
          onAdvance(1);
        } else if (gestureState.dx >= DECK_SWIPE_THRESHOLD) {
          onAdvance(-1);
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.deck}
        testID="quest-deck"
        {...panResponder.panHandlers}
      >
        {data.map((item, i) => {
          const order = (i - activeIndex + total) % total;
          return (
            <DeckCard
              key={item.id}
              item={item}
              order={order}
              total={total}
              onAdvance={() => onAdvance(1)}
            />
          );
        })}
      </View>
      <View style={styles.hintRow}>
        <Layers size={14} color={colors.text.muted} />
        <Text style={styles.hintText}>
          {`Swipe or tap the stack — ${nextLabel} is next`}
        </Text>
      </View>
    </View>
  );
}

function DeckCard({
  item,
  order,
  total,
  onAdvance,
}: {
  item: QuestDeckItem;
  order: number;
  total: number;
  onAdvance: () => void;
}) {
  const orderValue = useSharedValue(order);

  React.useEffect(() => {
    orderValue.value = withTiming(order, {
      duration: ANIMATION_TIMINGS.DECK_TRANSITION,
      easing: Easing.bezier(...easing.emberOut),
    });
  }, [order, orderValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const o = orderValue.value;
    const scale = 1 - o * DECK_SCALE_STEP;
    // RN scales from the view's own center, not a top-center pivot like the
    // web reference's `transform-origin: top center` — this extra
    // translateY corrects for that so the card still peeks up from a fixed
    // top edge instead of shrinking symmetrically around its middle. The
    // translate must come FIRST in the transform array: a later transform
    // operates in the earlier one's coordinate space, so translating after
    // the scale would shrink the offset by the scale factor and leave the
    // rearmost card ~5pt short of its 32pt peek.
    const translateY = -DECK_PEEK_OFFSET * o - (CARD_HEIGHT * (1 - scale)) / 2;
    // Only the rearmost card dims (0.55); every other order stays fully
    // opaque, including mid-stack peekers on decks deeper than 3.
    const opacity =
      total <= 1
        ? 1
        : total === 2
          ? interpolate(o, [0, 1], [1, DECK_REARMOST_OPACITY])
          : interpolate(
              o,
              [0, total - 2, total - 1],
              [1, 1, DECK_REARMOST_OPACITY]
            );

    return { transform: [{ translateY }, { scale }], opacity };
  });

  const meta = MODE_META[item.mode];
  const isFront = order === 0;

  const card = (
    <QuestCard
      mode={item.mode}
      title={item.title}
      subtitle={item.subtitle}
      duration={item.duration}
      xp={item.xp}
      description={item.description}
      progress={item.progress}
      showProgress={item.showProgress}
      requiresPremium={item.requiresPremium}
      isCompleted={item.isCompleted}
      onRestart={item.onRestart}
    />
  );

  return (
    <Animated.View
      style={[styles.cardSlot, animatedStyle, { zIndex: total - order }]}
    >
      {isFront ? (
        card
      ) : (
        <Pressable
          onPress={onAdvance}
          accessibilityRole="button"
          accessibilityLabel={`Show ${meta.label} card`}
        >
          {card}
          <View style={styles.strip} pointerEvents="none">
            <meta.Icon size={13} color={palette.sandy} />
            <Text style={styles.stripLabel}>{meta.label}</Text>
          </View>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  deck: {
    height: DECK_HEIGHT,
  },
  cardSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CARD_TOP,
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 6,
    backgroundColor: withAlpha(palette.richBlack, 0.6),
  },
  stripLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 12 * 0.08,
    textTransform: 'uppercase',
    color: palette.sandy,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  hintText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.text.muted,
  },
});
