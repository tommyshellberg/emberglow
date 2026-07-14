/**
 * Modal sheet sliding up from the bottom — announcements, invitations, pickers.
 * Fills its nearest positioned ancestor (a phone frame or the viewport).
 */
export interface BottomSheetProps {
  open?: boolean;
  onClose?: () => void;
  /** Erstoria heading centered at the top */
  title?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
