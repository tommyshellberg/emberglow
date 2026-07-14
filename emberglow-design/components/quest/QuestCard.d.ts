/**
 * The core content unit: a quest with title, story hook, XP and duration,
 * optionally over hand-painted art with a bottom scrim.
 * @startingPoint section="Components" subtitle="Quest card over painted art" viewport="700x420"
 */
export interface QuestCardProps {
  title: string;
  description?: string;
  xp?: number;
  duration?: string;
  status?: 'Available' | 'In progress' | 'Complete';
  image?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
