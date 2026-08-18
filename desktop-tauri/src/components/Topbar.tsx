import {
  CircleDot,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useI18n } from '../i18n';

export function Topbar({
  online,
  message,
  busy,
  onRefresh
}: {
  online: boolean;
  message: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="topbar core-topbar">
      <div className="core-topbar-copy">
        <div className="core-topbar-kicker">
          <CircleDot size={13} />
          <span>{t('core.controlCenter')}</span>
          <span className="core-topbar-version">Core UI 2.0</span>
          <span className="beta4-topbar-version">Beta 5 UI</span>
        </div>
        <h1>Arduino LED Controller V5</h1>
        <p className="topbar-tagline">Direct Arduino Control & Automation</p>
      </div>

      <div className="core-topbar-actions">
        <div className={`core-connection-chip ${online ? 'online' : 'offline'}`}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          <div>
            <strong>{t(online ? 'common.online' : 'common.offline')}</strong>
            <p className="status-line">{message}</p>
          </div>
        </div>

        <button
          type="button"
          className="secondary core-refresh-button"
          onClick={onRefresh}
          disabled={busy}
          aria-label={t('common.refresh')}
        >
          <RefreshCw size={17} className={busy ? 'spin' : ''} />
          <span className="refresh-label">{t('common.refresh')}</span>
        </button>
      </div>
    </header>
  );
}
