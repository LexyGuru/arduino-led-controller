import {
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export function V5ConnectionWarning({
  title,
  message,
  busy = false,
  onRetry
}: {
  title: string;
  message: string;
  busy?: boolean;
  onRetry?:
    () => void;
}) {
  return (
    <div className="v5-connection-warning">
      <AlertTriangle
        size={19}
      />

      <div>
        <strong>
          {title}
        </strong>
        <span>
          {message}
        </span>
      </div>

      {onRetry && (
        <button
          className="secondary"
          disabled={busy}
          onClick={onRetry}
        >
          <RefreshCw
            size={16}
            className={
              busy
                ? 'spin'
                : ''
            }
          />
          Újrapróbálás
        </button>
      )}
    </div>
  );
}
