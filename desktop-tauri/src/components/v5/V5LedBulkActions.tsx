import {
  Power,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

import { useI18n } from '../../i18n';

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
  const { t } = useI18n();

  return (
    <div className="v5-led-bulk-actions">
      <button
        disabled={busy}
        onClick={onAllOn}
      >
        <Power size={17} />
        {t('leds.bulkAllOn')}
      </button>

      <button
        className="danger"
        disabled={busy}
        onClick={onAllOff}
      >
        <Power size={17} />
        {t('leds.bulkAllOff')}
      </button>

      <button
        className="secondary"
        disabled={busy}
        onClick={onReset}
      >
        <RotateCcw
          size={17}
        />
        {t('leds.bulkReset')}
      </button>

      <button
        className="secondary"
        disabled={busy}
        onClick={onRefresh}
      >
        <RefreshCw
          size={17}
        />
        {t('leds.bulkRefresh')}
      </button>
    </div>
  );
}
