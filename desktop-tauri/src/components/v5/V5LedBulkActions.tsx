import {
  Power,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

export function V5LedBulkActions({
  busy,
  onAllOn,
  onAllOff,
  onReset,
  onRefresh
}: {
  busy: boolean;
  onAllOn:
    () => void;
  onAllOff:
    () => void;
  onReset:
    () => void;
  onRefresh:
    () => void;
}) {
  return (
    <div className="v5-led-bulk-actions">
      <button
        disabled={busy}
        onClick={onAllOn}
      >
        <Power size={17} />
        Mind bekapcsol
      </button>

      <button
        className="danger"
        disabled={busy}
        onClick={onAllOff}
      >
        <Power size={17} />
        Mind kikapcsol
      </button>

      <button
        className="secondary"
        disabled={busy}
        onClick={onReset}
      >
        <RotateCcw
          size={17}
        />
        Reset
      </button>

      <button
        className="secondary"
        disabled={busy}
        onClick={onRefresh}
      >
        <RefreshCw
          size={17}
        />
        Frissítés
      </button>
    </div>
  );
}
