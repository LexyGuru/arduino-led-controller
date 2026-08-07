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

type ArduinoClock = {
  day: number;
  minutes: number;
  date: Date;
  source: 'arduino' | 'computer';
};

function arduinoClock(
  status: ArduinoStatus | null
): ArduinoClock {
  if (
    status?.clockEpoch != null &&
    Number.isFinite(status.clockEpoch)
  ) {
    const offset =
      status.utcOffsetMinutes ??
      0;
    const date =
      new Date(
        (
          status.clockEpoch +
          offset * 60
        ) *
          1000
      );
    const weekday =
      date.getUTCDay();

    return {
      day:
        weekday === 0
          ? 7
          : weekday,
      minutes:
        date.getUTCHours() *
          60 +
        date.getUTCMinutes(),
      date,
      source: 'arduino'
    };
  }

  const date =
    new Date();
  const weekday =
    date.getDay();

  return {
    day:
      weekday === 0
        ? 7
        : weekday,
    minutes:
      date.getHours() *
        60 +
      date.getMinutes(),
    date,
    source: 'computer'
  };
}

function nextSchedule(
  items: LedSchedule[],
  clock: ArduinoClock
) {
  if (!items.length) {
    return null;
  }

  return items
    .map(
      (item) => {
        const itemMinutes =
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
          );
        const dayDelta =
          (
            item.day -
            clock.day +
            7
          ) %
          7;
        let minuteDelta =
          dayDelta *
            1440 +
          itemMinutes -
          clock.minutes;

        if (minuteDelta < 0) {
          minuteDelta +=
            7 *
            1440;
        }

        return {
          item,
          minuteDelta,
          dayOffset:
            Math.floor(
              minuteDelta /
                1440
            )
        };
      }
    )
    .sort(
      (left, right) =>
        left.minuteDelta -
        right.minuteDelta
    )[0];
}

function formatArduinoTime(
  clock: ArduinoClock,
  locale: string
) {
  return new Intl
    .DateTimeFormat(
      locale,
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone:
          clock.source ===
          'arduino'
            ? 'UTC'
            : undefined
      }
    )
    .format(
      clock.date
    );
}

export function DashboardPage({
  status:
    legacyStatus,
  schedules:
    legacySchedules,
  scheduleSync,
  busy,
  onSyncTime
}: {
  status:
    ArduinoStatus |
    null;
  schedules:
    LedSchedule[];
  scheduleSync:
    ScheduleSyncState;
  busy:
    boolean;
  onSyncTime:
    () => Promise<void>;
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

  const clock =
    arduinoClock(
      status
    );
  const next =
    nextSchedule(
      schedules,
      clock
    );
  const locale =
    document
      .documentElement
      .lang ||
    'hu';
  const nextDayLabel =
    next?.dayOffset ===
    0
      ? t('dashboard.today')
      : next?.dayOffset ===
        1
        ? t('dashboard.tomorrow')
        : t('dashboard.nextDay');
  const utcOffset =
    status?.utcOffsetMinutes;
  const offsetLabel =
    utcOffset == null
      ? '—'
      : `UTC${utcOffset >= 0 ? '+' : '-'}${String(
          Math.floor(Math.abs(utcOffset) / 60)
        ).padStart(2, '0')}:${String(
          Math.abs(utcOffset) % 60
        ).padStart(2, '0')}`;

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
                {nextDayLabel}
              </span>
              <strong>
                {next
                  ? t(
                      dayKeys[
                        next.item.day -
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
                {next?.item.time ??
                '—'}
              </strong>
            </div>
          </div>

          <div className="details-grid compact">
            <div>
              <span>
                {t('dashboard.arduinoTime')}
              </span>
              <strong>
                {status?.clockEpoch != null
                  ? formatArduinoTime(
                      clock,
                      locale
                    )
                  : '—'}
              </strong>
            </div>
            <div>
              <span>
                {t('dashboard.timezone')}
              </span>
              <strong>
                {status?.timezoneId ??
                '—'}
              </strong>
            </div>
            <div>
              <span>
                {t('dashboard.utcOffset')}
              </span>
              <strong>
                {offsetLabel}
              </strong>
            </div>
            <div>
              <span>
                {t('dashboard.timeSync')}
              </span>
              <strong
                className={
                  status?.timesynced
                    ? 'ok'
                    : 'bad'
                }
              >
                {status?.timesynced
                  ? t('dashboard.synced')
                  : t('dashboard.notSynced')}
              </strong>
            </div>
          </div>
          <div className="page-actions dashboard-time-actions">
            <button
              className="secondary"
              disabled={
                busy ||
                !status?.connected
              }
              onClick={
                () =>
                  void onSyncTime()
              }
            >
              <RefreshCw
                size={17}
                className={
                  busy
                    ? 'spin'
                    : ''
                }
              />
              {t('dashboard.syncComputer')}
            </button>
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
