/** Text field on inset dark surface; warm Sandy focus ring. */
export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  hint?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
}
