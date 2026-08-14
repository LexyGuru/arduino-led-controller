import {
  Activity,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff
} from 'lucide-react';

import { useI18n } from '../../i18n';

import type {
  ArduinoStatus,
  ConnectionHealthState
} from '../../types';

function ageLabel(value: number | null) {
  if (!value) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function DeviceHealthPanel({
  health,
  status,
  networkErrorCount,
  onRetry
}: {
  health: ConnectionHealthState;
  status: ArduinoStatus | null;
  networkErrorCount: number;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const healthy = health.state === 'healthy';
  const recovering = health.state === 'recovering';
  const stateLabel = t(`beta2.health.state.${health.state}`);
  const stateMessage = t(`beta2.health.message.${health.state}`);

  return (
    <section className={`panel beta2-health-panel ${health.state}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('beta2.health.eyebrow')}</p>
          <h2>{t('beta2.health.title')}</h2>
        </div>
        {healthy
          ? <ShieldCheck className="ok" />
          : recovering
            ? <RefreshCw className="spin" />
            : <WifiOff className="bad" />}
      </div>

      <div className="beta2-health-state">
        <strong className={healthy ? 'ok' : recovering ? 'warning' : 'bad'}>{stateLabel}</strong>
        <span>{stateMessage}</span>
      </div>

      <div className="beta2-health-grid">
        <div><span><Activity size={15}/>{t('beta2.health.consecutiveFailures')}</span><strong>{health.consecutiveFailures}</strong></div>
        <div><span><RefreshCw size={15}/>{t('beta2.health.nextPolling')}</span><strong>{Math.round(health.pollIntervalMs / 1000)}s</strong></div>
        <div><span><Clock3 size={15}/>{t('beta2.health.lastSuccess')}</span><strong>{ageLabel(health.lastSuccessAt)}</strong></div>
        <div><span><Clock3 size={15}/>{t('beta2.health.lastFailure')}</span><strong>{ageLabel(health.lastFailureAt)}</strong></div>
        <div><span><Wifi size={15}/>{t('beta2.health.wifi')}</span><strong>{status?.rssi == null ? '—' : `${status.rssi} dBm`}</strong></div>
        <div><span><Activity size={15}/>{t('beta2.health.networkErrors')}</span><strong>{networkErrorCount}</strong></div>
      </div>

      <div className="beta2-health-actions">
        <div>
          <span>{t('beta2.health.lastError')}</span>
          <code>{health.lastError ?? t('beta2.health.noError')}</code>
        </div>
        <button className="secondary" onClick={onRetry}>
          <RefreshCw size={16} />
          {t('beta2.health.retryNow')}
        </button>
      </div>
    </section>
  );
}
