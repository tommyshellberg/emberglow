/**
 * Primary action button. Pill-shaped; Cinnabar for the one primary action per screen,
 * secondary/outline for everything else (e.g. "Abandon quest").
 * @startingPoint section="Components" subtitle="Pill buttons — primary, secondary, ghost, outline" viewport="700x330"
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
