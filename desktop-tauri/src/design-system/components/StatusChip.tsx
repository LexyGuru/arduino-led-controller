import type {
  ReactNode
} from 'react';

type StatusTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral';

export function StatusChip({
  tone = 'neutral',
  children
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={
        `ds-status-chip ds-status-chip--${tone}`
      }
    >
      {children}
    </span>
  );
}
