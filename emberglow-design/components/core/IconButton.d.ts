/** Round icon-only button (44px minimum hit target). Active state gets a warm Sandy tint. */
export interface IconButtonProps {
  label: string;
  size?: number;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
