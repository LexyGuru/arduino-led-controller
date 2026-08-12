import {
  Activity,
  CalendarClock,
  Clock3,
  Cpu,
  Database,
  Lightbulb,
  MemoryStick,
  Radio,
  RefreshCw,
  Wifi
} from 'lucide-react';
import { ActivityTimeline } from '../components/v55/ActivityTimeline';
import { StatisticsPanel } from '../components/v55/StatisticsPanel';
import { V5ConnectionWarning } from '../components/v5/V5ConnectionWarning';
import { V5DataSourceBadge } from '../components/v5/V5DataSourceBadge';
import { useTauriAudit } from '../hooks/useTauriAudit';
import { useV5Dashboard } from '../hooks/useV5Dashboard';
import { useV5Logs } from '../hooks/useV5Logs';
import { useI18n } from '../i18n';
import type {
  ArduinoStatus,
  LedSchedule,
  ScheduleSyncState
} from '../types';
import { buildDashboardStatistics } from '../utils/v55Statistics';

const dayKeys = ['days.1','days.2','days.3','days.4','days.5','days.6','days.7'];
const effectKeys = ['effects.0','effects.1','effects.2','effects.3','effects.4'];

function formatUptime(seconds: number | undefined) {
  if (seconds == null) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

type ArduinoClock = {
  day: number;
  minutes: number;
  date: Date;
  source: 'arduino' | 'computer';
};

function arduinoClock(status: ArduinoStatus | null): ArduinoClock {
  if (status?.clockEpoch != null && Number.isFinite(status.clockEpoch)) {
    const offset = status.utcOffsetMinutes ?? 0;
    const date = new Date((status.clockEpoch + offset * 60) * 1000);
    const weekday = date.getUTCDay();
    return {
      day: weekday === 0 ? 7 : weekday,
      minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      date,
      source: 'arduino'
    };
  }
  const date = new Date();
  const weekday = date.getDay();
  return {
    day: weekday === 0 ? 7 : weekday,
    minutes: date.getHours() * 60 + date.getMinutes(),
    date,
    source: 'computer'
  };
}

function formatArduinoTime(clock: ArduinoClock, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: clock.source === 'arduino' ? 'UTC' : undefined
  }).format(clock.date);
}

function nextSchedule(items: LedSchedule[], clock: ArduinoClock) {
  if (!items.length) return null;
  return items.map((item) => {
    const itemMinutes =
      Number(item.time.slice(0, 2)) * 60 +
      Number(item.time.slice(3, 5));
    const dayDelta = (item.day - clock.day + 7) % 7;
    let minuteDelta = dayDelta * 1440 + itemMinutes - clock.minutes;
    if (minuteDelta < 0) minuteDelta += 7 * 1440;
    return {
      item,
      minuteDelta,
      dayOffset: Math.floor(minuteDelta / 1440)
    };
  }).sort((a, b) => a.minuteDelta - b.minuteDelta)[0];
}

export function DashboardPage({
  status: legacyStatus,
  schedules: legacySchedules,
  scheduleSync,
  busy,
  onSyncTime
}: {
  status: ArduinoStatus | null;
  schedules: LedSchedule[];
  scheduleSync: ScheduleSyncState;
  busy: boolean;
  onSyncTime: () => Promise<void>;
}) {
  const { t } = useI18n();
  const dashboard = useV5Dashboard(legacyStatus, legacySchedules);
  const audit = useTauriAudit();
  const logs = useV5Logs({
    legacyArduino: [],
    legacyNetwork: [],
    legacyError: null
  });

  const status = dashboard.status;
  const schedules = dashboard.schedules;
  const clock = arduinoClock(status);
  const next = nextSchedule(schedules, clock);
  const locale = document.documentElement.lang || 'hu';
  const nextDayLabel =
    next?.dayOffset === 0
      ? t('dashboard.today')
      : next?.dayOffset === 1
        ? t('dashboard.tomorrow')
        : t('dashboard.nextDay');
  const stats = buildDashboardStatistics(
    status,
    schedules,
    audit.entries,
    logs.networkLogs
  );

  const utcOffset = status?.utcOffsetMinutes;
  const offsetLabel = utcOffset == null
    ? '—'
    : `UTC${utcOffset >= 0 ? '+' : '-'}${String(
        Math.floor(Math.abs(utcOffset) / 60)
      ).padStart(2, '0')}:${String(Math.abs(utcOffset) % 60).padStart(2, '0')}`;

  return (
    <div className="page v55-dashboard">
      <section className="v55-dashboard-hero">
        <div className="v55-dashboard-hero-copy">
          <div className="v55-dashboard-kicker">
            <span className={`v55-live-dot ${status?.connected ? 'online' : 'offline'}`} />
            <span>{t('dashboard.eyebrow')}</span>
            <span className="v55-dashboard-kicker-separator" aria-hidden="true">•</span>
            <span>{t('dashboard2.controlCenter')}</span>
          </div>
          <h2>{t('dashboard2.title')}</h2>
          <p>{t('dashboard2.subtitle')}</p>

          <div className="v55-hero-actions">
            <V5DataSourceBadge source={dashboard.source} />
            <button
              className="secondary"
              disabled={dashboard.refreshing}
              onClick={() => void dashboard.refresh()}
            >
              <RefreshCw size={17} className={dashboard.refreshing ? 'spin' : ''} />
              {t('common.refresh')}
            </button>
          </div>
        </div>

        <div className="v55-system-orbit">
          <div className={`v55-orbit-core ${status?.connected ? 'online' : 'offline'}`}>
            <Radio size={30} />
            <strong>{status?.connected ? t('common.online') : t('common.offline')}</strong>
            <small>{status?.hostname ?? status?.ipAddress ?? 'Arduino UNO R4 WiFi'}</small>
          </div>
          <span className="v55-orbit-ring ring-a" />
          <span className="v55-orbit-ring ring-b" />
        </div>
      </section>

      {dashboard.error && (
        <V5ConnectionWarning
          title={t('dashboard.apiUnavailable')}
          message={t('dashboard.fallbackError',{
            code: dashboard.error.code,
            message: dashboard.error.message
          })}
          busy={dashboard.refreshing}
          onRetry={() => void dashboard.refresh()}
        />
      )}

      <section className="v55-primary-metrics">
        <article className="v55-primary-card">
          <span><Radio size={18}/>{t('dashboard.connection')}</span>
          <strong className={status?.connected ? 'ok' : 'bad'}>
            {status?.connected ? t('common.online') : t('common.offline')}
          </strong>
          <small>{status?.ipAddress ?? '—'}</small>
        </article>
        <article className="v55-primary-card">
          <span><Cpu size={18}/>Firmware</span>
          <strong>{status?.firmwareVersion ?? '—'}</strong>
          <small>UNO R4 WiFi</small>
        </article>
        <article className="v55-primary-card">
          <span><Wifi size={18}/>{t('dashboard.signal')}</span>
          <strong>{status?.rssi == null ? '—' : `${status.rssi} dBm`}</strong>
          <small>{status?.rssi == null ? '—' : t(status.rssi > -60 ? 'dashboard2.signalGood' : 'dashboard2.signalWeak')}</small>
        </article>
        <article className="v55-primary-card">
          <span><Clock3 size={18}/>{t('dashboard.uptime')}</span>
          <strong>{formatUptime(status?.uptime)}</strong>
          <small>{status?.timesynced ? t('dashboard.synced') : t('dashboard.notSynced')}</small>
        </article>
        <article className="v55-primary-card">
          <span><MemoryStick size={18}/>{t('dashboard2.freeMemory')}</span>
          <strong>{status?.freeMemory == null ? '—' : `${status.freeMemory} B`}</strong>
          <small>{t('dashboard2.runtimeMemory')}</small>
        </article>
        <article className="v55-primary-card">
          <span><Database size={18}/>{t('dashboard2.apiRequests')}</span>
          <strong>{status?.http?.requests ?? '—'}</strong>
          <small>{t('dashboard.timeouts')}: {status?.http?.timeouts ?? '—'}</small>
        </article>
      </section>

      <StatisticsPanel stats={stats} />

      <section className="v55-dashboard-middle">
        <article className="panel v55-schedule-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">{t('dashboard.schedules')}</p>
              <h2>{t('dashboard2.scheduleOverview')}</h2>
            </div>
            <CalendarClock />
          </div>

          <div className="v55-detail-grid">
            <div>
              <span>{t('dashboard.loadedList')}</span>
              <strong>{schedules.length}</strong>
            </div>
            <div>
              <span>{t('dashboard.arduinoCount')}</span>
              <strong>{status?.scheduleCount ?? schedules.length}</strong>
            </div>
            <div>
              <span>{nextDayLabel}</span>
              <strong>{next ? t(dayKeys[next.item.day - 1]) : '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.nextTime')}</span>
              <strong>{next?.item.time ?? '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.arduinoTime')}</span>
              <strong>
                {status?.clockEpoch != null
                  ? formatArduinoTime(clock, locale)
                  : '—'}
              </strong>
            </div>
            <div>
              <span>{t('dashboard.timezone')}</span>
              <strong>{status?.timezoneId ?? '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.utcOffset')}</span>
              <strong>{offsetLabel}</strong>
            </div>
            <div>
              <span>{t('dashboard.timeSync')}</span>
              <strong className={status?.timesynced ? 'ok' : 'bad'}>
                {status?.timesynced
                  ? t('dashboard.synced')
                  : t('dashboard.notSynced')}
              </strong>
            </div>
          </div>

          <div className="page-actions dashboard-time-actions">
            <button
              className="secondary"
              disabled={busy || !status?.connected}
              onClick={() => void onSyncTime()}
            >
              <RefreshCw size={17} className={busy ? 'spin' : ''} />
              {t('dashboard.syncComputer')}
            </button>
          </div>

          {status?.scheduleCount != null &&
            status.scheduleCount !== schedules.length && (
            <div className="notice">
              <CalendarClock size={18} />
              <p>{t('dashboard.scheduleCountMismatch',{
                remote: status.scheduleCount,
                local: schedules.length
              })}</p>
            </div>
          )}

          {scheduleSync.status === 'error' && scheduleSync.lastError && (
            <div className="notice">
              <CalendarClock size={18} />
              <p>{t('dashboard.scheduleError',{error:scheduleSync.lastError})}</p>
            </div>
          )}
        </article>

        <article className="panel v55-led-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">{t('dashboard.ledSnapshot')}</p>
              <h2>{t('dashboard.currentState')}</h2>
            </div>
            <Lightbulb />
          </div>

          <div className="v55-led-list">
            {(status?.strips ?? []).map((strip) => (
              <div className="v55-led-row" key={strip.id}>
                <span
                  className="v55-led-color"
                  style={{
                    background: `rgb(${strip.color.join(',')})`,
                    opacity: strip.enabled ? 1 : .25
                  }}
                />
                <div className="v55-led-copy">
                  <strong>LED {strip.id}</strong>
                  <small>
                    {strip.enabled ? t('common.active') : t('common.offline')}
                    {' · '}
                    {t(effectKeys[strip.effect] ?? 'effects.0')}
                  </small>
                </div>
                <div className="v55-led-brightness">
                  <div><i style={{width:`${Math.max(0,Math.min(100,(strip.brightness/255)*100))}%`}} /></div>
                  <b>{strip.brightness}</b>
                </div>
              </div>
            ))}
            {!status?.strips?.length && <p className="muted">{t('dashboard.noLedState')}</p>}
          </div>
        </article>
      </section>

      <section className="v55-dashboard-bottom">
        <ActivityTimeline entries={audit.entries} />

        <article className="panel v55-http-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">{t('dashboard.systemState')}</p>
              <h2>{t('dashboard.httpConnection')}</h2>
            </div>
            <Activity />
          </div>
          <div className="v55-detail-grid two">
            <div>
              <span>{t('dashboard.lastClient')}</span>
              <strong>{status?.http?.lastClientIp ?? '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.lastPath')}</span>
              <strong>{status?.http?.lastPath ?? '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.requests')}</span>
              <strong>{status?.http?.requests ?? '—'}</strong>
            </div>
            <div>
              <span>{t('dashboard.timeouts')}</span>
              <strong>{status?.http?.timeouts ?? '—'}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
