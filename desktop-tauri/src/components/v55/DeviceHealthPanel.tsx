import { I18nText } from "../../i18n";
import { Activity, Clock3, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import type { ArduinoStatus, ConnectionHealthState, NetworkLog } from '../../types';
import type { DashboardStatistics } from '../../utils/v55Statistics';
function normalizeTelemetryTimestampMs(value: number | null, now = Date.now()): number | null {
    if (value == null ||
        !Number.isFinite(value) ||
        value <= 0) {
        return null;
    }
    // ConnectionHealth timestamps are Date.now() milliseconds.
    // Native Rust NetworkLog timestamps are UNIX seconds.
    const timestamp = value < 10000000000
        ? value * 1000
        : value;
    const minimumPlausible = Date.UTC(2000, 0, 1);
    const maximumFutureSkew = now + 5 * 60 * 1000;
    if (!Number.isFinite(timestamp) ||
        timestamp < minimumPlausible ||
        timestamp > maximumFutureSkew) {
        return null;
    }
    return timestamp;
}
function ageLabel(value: number | null, now = Date.now()) {
    const timestamp = normalizeTelemetryTimestampMs(value, now);
    if (timestamp == null) {
        return '—';
    }
    const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
function countdownLabel(target: number | null, now: number) {
    if (!target)
        return '—';
    return `${Math.max(0, Math.ceil((target - now) / 1000))}s`;
}
export function DeviceHealthPanel({ health, status, stats, latestNetworkError, platform, onRetry }: {
    health: ConnectionHealthState;
    status: ArduinoStatus | null;
    stats: DashboardStatistics;
    latestNetworkError: NetworkLog | null;
    platform: string;
    onRetry: () => void;
}) {
    const { t } = useI18n();
    const healthy = health.state === 'healthy';
    const recovering = health.state === 'recovering';
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const stateLabel = t(`beta2.health.state.${health.state}`);
    const stateMessage = t(`beta2.health.message.${health.state}`);
    const recoveredMacCredentialBootstrap = (message?: string | null) => platform === 'macos' &&
        health.state === 'healthy' &&
        Boolean(message?.includes('Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként.'));
    const effectiveHealthError = recoveredMacCredentialBootstrap(health.lastError) ? null : health.lastError;
    const effectiveNetworkError = latestNetworkError && recoveredMacCredentialBootstrap(latestNetworkError.message)
        ? null
        : latestNetworkError;
    const lastFailureAt = effectiveHealthError || effectiveNetworkError
        ? health.lastFailureAt ?? effectiveNetworkError?.timestamp ?? null
        : null;
    const lastError = useMemo(() => {
        if (effectiveHealthError)
            return effectiveHealthError;
        if (effectiveNetworkError) {
            return `${effectiveNetworkError.endpoint}: ${effectiveNetworkError.message}`;
        }
        return t('beta2.health.noError');
    }, [effectiveHealthError, effectiveNetworkError, t]);
    return (<section className={`panel beta2-health-panel v568-system-telemetry ${health.state}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('beta2.health.eyebrow')}</p>
          <h2>{t('beta2.health.title')}</h2>
        </div>
        {healthy
            ? <ShieldCheck className="ok"/>
            : recovering
                ? <RefreshCw className="spin"/>
                : <WifiOff className="bad"/>}
      </div>

      <div className="beta2-health-state">
        <strong className={healthy ? 'ok' : recovering ? 'warning' : 'bad'}>{stateLabel}</strong>
        <span>{stateMessage}</span>
      </div>

      <div className="beta2-health-grid v568-telemetry-grid">
        <div><span><Activity size={15}/>{t('beta2.health.consecutiveFailures')}</span><strong>{health.consecutiveFailures}</strong></div>
        <div><span><RefreshCw size={15}/>{t('beta2.health.nextPolling')}</span><strong>{countdownLabel(health.nextRetryAt, now)}</strong></div>
        <div><span><Clock3 size={15}/>{t('beta2.health.lastSuccess')}</span><strong>{ageLabel(health.lastSuccessAt)}</strong></div>
        <div><span><Clock3 size={15}/>{t('beta2.health.lastFailure')}</span><strong>{ageLabel(lastFailureAt)}</strong></div>
        <div><span><Wifi size={15}/>{t('beta2.health.wifi')}</span><strong>{status?.rssi == null ? '—' : `${status.rssi} dBm`}</strong></div>
        <div><span><Activity size={15}/>{t('beta2.health.networkErrors')}</span><strong>{stats.networkErrors}</strong></div>
        <div><span>{t('stats.ledsActive')}</span><strong>{stats.enabledStrips}/{stats.stripCount}</strong><small>{t('stats.averageBrightness')}: {stats.averageBrightness}</small></div>
        <div><span>{t('stats.schedules')}</span><strong>{stats.scheduleCount}</strong><small>{t('stats.activeEffects')}: {stats.activeEffects}</small></div>
        <div><span>{t('stats.httpRequests')}</span><strong>{stats.httpRequests ?? '—'}</strong><small>{t('stats.timeouts')}: {stats.httpTimeouts ?? '—'}</small></div>
        <div><span>{t('stats.httpTimeoutFree')}</span><strong>{stats.httpTimeoutFreePercent == null ? '—' : `${stats.httpTimeoutFreePercent}%`}</strong></div>
        <div>
          <span><Activity size={15}/><I18nText k="diagnostics.title"/></span>
          <strong>
            {health.diagnosticsSupported == null
            ? '—'
            : health.diagnosticsSupported
                ? 'OK'
                : 'N/A'}
          </strong>
          <small>
            {health.diagnosticsLastError
            ? 'error'
            : ageLabel(health.diagnosticsLastSuccessAt ?? null)}
          </small>
        </div>
      </div>

      <div className="beta2-health-actions">
        <div>
          <span>{t('beta2.health.lastError')}</span>
          <code>{lastError}</code>
        </div>
        <button className="secondary" onClick={onRetry}>
          <RefreshCw size={16}/>
          {t('beta2.health.retryNow')}
        </button>
      </div>
    </section>);
}
