import { type ViewStyle } from 'react-native';

/**
 * Animation styles returned from the animation hook.
 *
 * Shared by both `pending-quest.tsx` and `cooperative-pending-quest.tsx` via
 * `usePendingQuestAnimations` — check both screens before changing this
 * shape.
 */
export interface AnimationStyles {
  headerStyle: ViewStyle;
  cardStyle: ViewStyle;
  buttonStyle: ViewStyle;
  shimmerStyle: ViewStyle;
}
