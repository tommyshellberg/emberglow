/**
 * The focus-timer ember ring — thin Cinnabar arc with a warm glow; center slot for the countdown.
 * @startingPoint section="Components" subtitle="Ember timer ring" viewport="700x330"
 */
export interface ProgressRingProps {
  /** 0–1 */
  progress?: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
