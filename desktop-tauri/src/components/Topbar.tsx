import {
  CircleDot,
  Clock3,
  Cpu,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useI18n } from '../i18n';

export function Topbar({
  online,
  deviceLabel,
  firmwareVersion,
  timeSynced,
  message,
  busy,
  onRefresh
}: {
  online: boolean;
  deviceLabel: string;
  firmwareVersion?: string;
  timeSynced: boolean;
  message: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="topbar core-topbar core-v3-topbar">
      <div className="core-topbar-copy">
        <div className="core-topbar-kicker">
          <CircleDot size={13} />
          <span>{t('core.controlCenter')}</span>
          <span className="core-topbar-version">Core UI 3.0</span>
          <span className="beta4-topbar-version">Beta 5 UI</span>
        </div>
        <h1>Arduino LED Controller V5</h1>
        <p className="topbar-tagline">Direct Arduino Control & Automation</p>
      </div>

      <div className="core-topbar-actions visual31-topbar-hud">
        <div className="visual31-hud-telemetry" aria-label={t('core.controlCenter')}>
          <span className={`visual31-hud-node ${online ? 'is-ok' : 'is-offline'}`}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            <b>{deviceLabel}</b>
          </span>
          <span className="visual31-hud-node">
            <Cpu size={15} />
            <b>{firmwareVersion ?? '—'}</b>
          </span>
          <span className={`visual31-hud-node ${timeSynced ? 'is-ok' : 'is-warn'}`}>
            <Clock3 size={15} />
            <b>{timeSynced ? t('dashboard.synced') : t('dashboard.notSynced')}</b>
          </span>
        </div>
        <div className={`core-connection-chip ${online ? 'online' : 'offline'}`} data-connection-state={online ? 'online' : 'offline'} aria-live="polite">
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
