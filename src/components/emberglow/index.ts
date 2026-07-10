/**
 * Emberglow design system — public barrel.
 *
 * Import base components from here rather than reaching into
 * `core/`, `quest/`, or `overlay/` directly.
 */

// core
export type { BadgeProps, BadgeTone } from './core/badge';
export { Badge } from './core/badge';
export type { ButtonProps, ButtonSize, ButtonVariant } from './core/button';
export { Button } from './core/button';
export type { EyebrowLabelProps, EyebrowLabelTone } from './core/eyebrow-label';
export { EyebrowLabel } from './core/eyebrow-label';
export type { IconButtonProps } from './core/icon-button';
export { IconButton } from './core/icon-button';
export type { InputProps } from './core/input';
export { Input } from './core/input';
export type { SwitchProps } from './core/switch';
export { Switch } from './core/switch';

// quest
export type { ListItemProps } from './quest/list-item';
export { ListItem } from './quest/list-item';
export type { ProgressRingProps } from './quest/progress-ring';
export { ProgressRing, ringGeometry } from './quest/progress-ring';
export type { QuestCardProps, QuestCardStatus } from './quest/quest-card';
export { QuestCard } from './quest/quest-card';
export type { XPBarProps } from './quest/xp-bar';
export { XPBar, xpBarProgress } from './quest/xp-bar';

// overlay
export type { BottomSheetProps } from './overlay/bottom-sheet';
export { BottomSheet, useEmberglowBottomSheet } from './overlay/bottom-sheet';
