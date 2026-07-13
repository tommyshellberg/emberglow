/** Small pill status badge — quest state, XP, rarity. */
export interface BadgeProps {
  tone?: 'ember' | 'warm' | 'neutral' | 'success';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
