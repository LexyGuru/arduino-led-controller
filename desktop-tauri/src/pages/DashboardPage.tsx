import {
  Activity,
  CalendarClock,
  Clock3,
  Cpu,
  Lightbulb,
  Radio,
  RefreshCw,
  Wifi
} from 'lucide-react';

import {
  V5ConnectionWarning
} from '../components/v5/V5ConnectionWarning';

import {
  V5DataSourceBadge
} from '../components/v5/V5DataSourceBadge';

import {
  useV5Dashboard
} from '../hooks/useV5Dashboard';

import { useI18n } from '../i18n';

import type {
  ArduinoStatus,
  LedSchedule,
  ScheduleSyncState
} from '../types';

const dayKeys = ['days.1','days.2','days.3','days.4','days.5','days.6','days.7'];
const effectKeys = ['effects.0','effects.1','effects.2','effects.3','effects.4'];

function formatUptime(
  seconds: number | undefined,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  if (
    seconds == null
  ) {
    return '—';
  }

  const days =
    Math.floor(
      seconds / 86400
    );

  const hours =
    Math.floor(
      (
        seconds %
        86400
      ) /
      3600
    );

  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
      60
    );

  return t('dashboard.uptimeValue', { days, hours, minutes });
}

function nextSchedule(
  items: LedSchedule[]
) {
  if (!items.length) {
    return null;
  }

  const now =
    new Date();

  const currentDay =
    now.getDay() === 0
      ? 7
      : now.getDay();

  const currentMinutes =
    now.getHours() *
    60 +
    now.getMinutes();

  const sorted =
    [...items].sort(
      (left, right) =>
        left.day -
        right.day ||
        left.time
          .localeCompare(
            right.time
          )
    );

  return sorted.find(
    (item) =>
      item.day >
        currentDay ||
      (
        item.day ===
          currentDay &&
        Number(
          item.time.slice(
            0,
            2
          )
        ) *
          60 +
          Number(
            item.time.slice(
              3,
              5
            )
          ) >=
          currentMinutes
      )
  ) ??
    sorted[0];
}

export function DashboardPage({
  status:
    legacyStatus,
  schedules:
    legacySchedules,
  scheduleSync
}: {
  status:
    ArduinoStatus |
    null;
  schedules:
    LedSchedule[];
  scheduleSync:
    ScheduleSyncState;
}) {
  const { t } = useI18n();
  const {
    status,
    schedules,
    source,
    refreshing,
    error,
    refresh
  } =
    useV5Dashboard(
      legacyStatus,
      legacySchedules
    );

  const next =
    nextSchedule(
      schedules
    );

  const cards = [
    {
      label:
        t('dashboard.connection'),
      value:
        status?.connected
          ? t('common.online')
          : t('common.offline'),
      icon:
        Radio,
      good:
        status?.connected
    },
    {
      label:
        'Firmware',
      value:
        status
          ?.firmwareVersion ??
        '—',
      icon:
        Cpu
    },
    {
      label:
        t('dashboard.signal'),
      value:
        status?.rssi ==
        null
          ? '—'
          : `${status.rssi} dBm`,
      icon:
        Wifi
    },
    {
      label:
        t('dashboard.uptime'),
      value:
        formatUptime(status?.uptime, t),
      icon:
        Clock3
    }
  ];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('dashboard.eyebrow')}
          </p>
          <h2>
            {t('dashboard.title')}
          </h2>
        </div>

        <div className="v5-heading-actions">
          <V5DataSourceBadge
            source={source}
          />

          <button
            className="secondary"
            disabled={refreshing}
            onClick={
              () =>
                void refresh()
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? 'spin'
                  : ''
              }
            />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <V5ConnectionWarning
          title={
            t('dashboard.apiUnavailable')
          }
          message={
            t('dashboard.fallbackError',{code:error.code,message:error.message})
          }
          busy={refreshing}
          onRetry={
            () =>
              void refresh()
          }
        />
      )}

      <section className="stat-grid">
        {cards.map(
          ({
            label,
            value,
            icon:
              Icon,
            good
          }) => (
            <article
              className="stat-card"
              key={label}
            >
              <div className="icon-box">
                <Icon size={21} />
              </div>

              <span>{label}</span>

              <strong
                className={
                  good === false
                    ? 'bad'
                    : (
                        good
                          ? 'ok'
                          : ''
                      )
                }
              >
                {value}
              </strong>
            </article>
          )
        )}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                {t('dashboard.schedules')}
              </p>
              <h2>
                Heti program
              </h2>
            </div>

            <CalendarClock />
          </div>

          <div className="details-grid compact">
            <div>
              <span>
                {t('dashboard.loadedList')}
              </span>
              <strong
                className={
                  status?.scheduleCount != null &&
                  status.scheduleCount !==
                    schedules.length
                    ? 'bad'
                    : ''
                }
              >
                {schedules.length}
              </strong>
            </div>

            <div>
              <span>
                {t('dashboard.arduinoCount')}
              </span>
              <strong>
                {status
                  ?.scheduleCount ??
                schedules.length}
              </strong>
            </div>

            <div>
              <span>
                {t('dashboard.nextDay')}
              </span>
              <strong>
                {next
                  ? t(
                      dayKeys[
                        next.day -
                        1
                      ]
                    )
                  : '—'}
              </strong>
            </div>

            <div>
              <span>
                {t('dashboard.nextTime')}
              </span>
              <strong>
                {next?.time ??
                '—'}
              </strong>
            </div>
          </div>

          {(status?.scheduleCount != null &&
            status.scheduleCount !==
              schedules.length) && (
            <div className="notice">
              <CalendarClock size={18} />
              <p>
                {t('dashboard.scheduleCountMismatch',{
                  remote: status.scheduleCount,
                  local: schedules.length
                })}
              </p>
            </div>
          )}

          {scheduleSync.status === 'error' &&
            scheduleSync.lastError && (
            <div className="notice">
              <CalendarClock size={18} />
              <p>
                {t('dashboard.scheduleError',{error:scheduleSync.lastError})}
              </p>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                {t('dashboard.ledSnapshot')}
              </p>
              <h2>
                {t('dashboard.currentState')}
              </h2>
            </div>

            <Lightbulb />
          </div>

          <div className="snapshot-list">
            {(
              status?.strips ??
              []
            ).map(
              (strip) => (
                <div
                  className="snapshot-row"
                  key={strip.id}
                >
                  <span
                    className="snapshot-dot"
                    style={{
                      background:
                        `rgb(${strip.color.join(
                          ','
                        )})`,
                      opacity:
                        strip.enabled
                          ? 1
                          : .25
                    }}
                  />

                  <div>
                    <strong>
                      LED {strip.id}
                    </strong>
                    <small>
                      {strip.enabled
                        ? 'Bekapcsolva'
                        : 'Kikapcsolva'}
                      {' · '}
                      {strip.brightness}
                      {' · '}
                      {t(effectKeys[strip.effect] ?? 'effects.0') ??
                      `Effekt ${strip.effect}`}
                    </small>
                  </div>

                  <code>
                    RGB(
                    {strip.color.join(
                      ','
                    )}
                    )
                  </code>
                </div>
              )
            )}

            {!status
              ?.strips
              ?.length && (
              <p className="muted">
                {t('dashboard.noLedState')}
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              {t('dashboard.systemState')}
            </p>
            <h2>
              {t('dashboard.httpConnection')}
            </h2>
          </div>

          <Activity />
        </div>

        <div className="details-grid">
          <div>
            <span>
              {t('dashboard.lastClient')}
            </span>
            <strong>
              {status?.http
                ?.lastClientIp ??
              '—'}
            </strong>
          </div>

          <div>
            <span>
              {t('dashboard.lastPath')}
            </span>
            <strong>
              {status?.http
                ?.lastPath ??
              '—'}
            </strong>
          </div>

          <div>
            <span>
              {t('dashboard.requests')}
            </span>
            <strong>
              {status?.http
                ?.requests ??
              '—'}
            </strong>
          </div>

          <div>
            <span>
              {t('dashboard.timeouts')}
            </span>
            <strong>
              {status?.http
                ?.timeouts ??
              '—'}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
