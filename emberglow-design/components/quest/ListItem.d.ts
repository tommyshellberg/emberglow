/** Row for logs, journals, settings — leading icon/image slot, title/subtitle, trailing value. */
export interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
