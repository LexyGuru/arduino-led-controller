import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  WifiOff
} from 'lucide-react';

export function V5StatusBadge({
  state,
  label
}: {
  state:
    | 'ok'
    | 'warning'
    | 'error'
    | 'loading'
    | 'offline';
  label: string;
}) {
  const Icon =
    state === 'ok'
      ? CheckCircle2
      : state === 'loading'
        ? LoaderCircle
        : state === 'offline'
          ? WifiOff
          : AlertTriangle;

  return (
    <span
      className={
        `v5-status-badge ${state}`
      }
    >
      <Icon
        size={15}
        className={
          state ===
            'loading'
            ? 'spin'
            : ''
        }
      />
      {label}
    </span>
  );
}
