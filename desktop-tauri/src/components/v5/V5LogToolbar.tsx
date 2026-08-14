import {
  Search,
  Trash2
} from 'lucide-react';

import { useI18n } from '../../i18n';

export function V5LogToolbar({
  query,
  onQuery,
  busy,
  apiAvailable,
  onClear
}: {
  query: string;
  onQuery: (value: string) => void;
  busy: boolean;
  apiAvailable: boolean;
  onClear: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="v5-log-toolbar">
      <label>
        <Search size={16} />

        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t('logs.toolbar.searchPlaceholder')}
        />
      </label>

      <button
        className="danger"
        disabled={busy || !apiAvailable}
        onClick={() => {
          if (
            globalThis.confirm(
              t('logs.toolbar.clearConfirm')
            )
          ) {
            onClear();
          }
        }}
      >
        <Trash2 size={16} />
        {t('logs.toolbar.clearArduino')}
      </button>
    </div>
  );
}
