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
    <div className="v5-led-bulk-actions core-v3-led-command-bar" role="toolbar" aria-label={t('leds.title')}>
      <button
        className="core-v3-command-button"
        disabled={busy}
        onClick={onAllOn}
      >
        <Power size={17} />
        {t('leds.bulkAllOn')}
      </button>

      <button
        className="danger core-v3-command-button"
        disabled={busy}
        onClick={onAllOff}
      >
        <Power size={17} />
        {t('leds.bulkAllOff')}
      </button>

      <button
        className="secondary core-v3-command-button"
        disabled={busy}
        onClick={onReset}
      >
        <RotateCcw
          size={17}
        />
        {t('leds.bulkReset')}
      </button>

      <button
        className="secondary core-v3-command-button"
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
