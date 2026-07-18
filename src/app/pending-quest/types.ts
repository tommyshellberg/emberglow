import { type ViewStyle } from 'react-native';
import { type useAnimatedStyle } from 'react-native-reanimated';

/**
 * Return type of `useAnimatedStyle`, which in Reanimated 4 is an opaque
 * handle (not a plain style object) meant only to be passed to a component's
 * `style` prop — see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle.
 */
type AnimatedStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

/**
 * Animation styles returned from the animation hook.
 *
 * Shared by both `pending-quest.tsx` and `cooperative-pending-quest.tsx` via
 * `usePendingQuestAnimations` — check both screens before changing this
 * shape.
 */
export interface AnimationStyles {
  headerStyle: AnimatedStyle;
  cardStyle: AnimatedStyle;
  buttonStyle: AnimatedStyle;
  shimmerStyle: AnimatedStyle;
}
