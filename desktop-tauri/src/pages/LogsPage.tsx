import {
  useMemo,
  useState
} from 'react';

import {
  Activity,
  FileClock,
  RadioTower
} from 'lucide-react';

import {
  V5DataSourceBadge
} from '../components/v5/V5DataSourceBadge';

import {
  V5LogToolbar
} from '../components/v5/V5LogToolbar';

import {
  useV5Logs
} from '../hooks/useV5Logs';

import {
  formatLogPayload
} from '../services/v5LogModels.mjs';

import { useI18n } from '../i18n';

import type {
  ArduinoLog,
  NetworkLog
} from '../types';

function includesQuery(
  value: unknown,
  query: string
) {
  if (!query) {
    return true;
  }

  return String(
    value ||
    ''
  )
    .toLowerCase()
    .includes(
      query
        .toLowerCase()
    );
}

export function LogsPage({
  arduino,
  network,
  error
}: {
  arduino:
    ArduinoLog[];
  network:
    NetworkLog[];
  error?:
    string |
    null;
}) {
  const { t, language } = useI18n();
  const state =
    useV5Logs({
      legacyArduino:
        arduino,
      legacyNetwork:
        network,
      legacyError:
        error
    });

  const [
    query,
    setQuery
  ] =
    useState('');

  const consoleLogs =
    useMemo(
      () =>
        state.consoleLogs
          .filter(
            (log) =>
              includesQuery(
                `${log.type} ${log.message} ${log.timestamp}`,
                query
              )
          ),
      [
        query,
        state.consoleLogs
      ]
    );

  const auditEntries =
    useMemo(
      () =>
        state.auditEntries
          .filter(
            (entry) =>
              includesQuery(
                `${entry.action} ${entry.subject} ${entry.path} ${entry.method}`,
                query
              )
          ),
      [
        query,
        state.auditEntries
      ]
    );

  const events =
    useMemo(
      () =>
        state.events
          .filter(
            (event) =>
              includesQuery(
                `${event.topic} ${formatLogPayload(event.payload)}`,
                query
              )
          ),
      [
        query,
        state.events
      ]
    );

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('logs.eyebrow')}
          </p>
          <h2>
            {t('logs.title')}
          </h2>
        </div>

        <V5DataSourceBadge
          source={
            state.source
          }
        />
      </div>

      <V5LogToolbar
        query={query}
        onQuery={
          setQuery
        }
        busy={
          state.busy
        }
        apiAvailable={
          !state.directFallback
        }
        onClear={
          () =>
            void state
              .clearConsole()
        }
      />

      {state.error && (
        <p className="console-warning">
          {state.error.code}
          {': '}
          {state.error.message}
        </p>
      )}

      <section className="v5-log-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                ARDUINO
              </p>
              <h2>
                {t('logs.consoleCache')}
              </h2>
            </div>

            <RadioTower />
          </div>

          <div className="log-list">
            {consoleLogs.length
              ? consoleLogs.map(
                  (
                    log,
                    index
                  ) => (
                    <div
                      key={
                        log.id ||
                        `${
                          log.timestamp
                        }-${index}`
                      }
                    >
                      <time>
                        {log.timestamp ||
                        '—'}
                      </time>
                      <b>
                        {log.type ===
                          'console'
                          ? t('logs.console')
                          : (
                              log.type ||
                              'info'
                            ).toUpperCase()}
                      </b>
                      <span>
                        {log.message ||
                        ''}
                      </span>
                    </div>
                  )
                )
              : (
                  <p className="muted">
                    {t('logs.noConsole')}
                  </p>
                )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                {t('logs.audit')}
              </p>
              <h2>
                {t('logs.recentActions')}
              </h2>
            </div>

            <FileClock />
          </div>

          <div className="v5-observability-list">
            {auditEntries.length
              ? auditEntries.map(
                  (entry) => (
                    <div
                      key={
                        String(
                          entry.id
                        )
                      }
                    >
                      <time>
                        {String(
                          entry.timestamp ||
                          '—'
                        )}
                      </time>

                      <b>
                        {String(
                          entry.action
                        )}
                      </b>

                      <span>
                        {String(
                          entry.subject
                        )}
                        {entry.method
                          ? ` · ${entry.method}`
                          : ''}
                        {entry.path
                          ? ` ${entry.path}`
                          : ''}
                      </span>
                    </div>
                  )
                )
              : (
                  <p className="muted">
                    {t('logs.noAudit')}
                  </p>
                )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                EVENT BUS
              </p>
              <h2>
                {t('logs.realtime')}
              </h2>
            </div>

            <Activity />
          </div>

          <div className="v5-observability-list">
            {events.length
              ? events.map(
                  (event) => (
                    <div
                      key={
                        String(
                          event.id
                        )
                      }
                    >
                      <time>
                        {String(
                          event.timestamp ||
                          '—'
                        )}
                      </time>

                      <b>
                        {String(
                          event.topic
                        )}
                      </b>

                      <span>
                        {formatLogPayload(
                          event.payload
                        )}
                      </span>
                    </div>
                  )
                )
              : (
                  <p className="muted">
                    {t('logs.noEvents')}
                  </p>
                )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              TAURI KLIENS
            </p>
            <h2>
              {t('logs.localNetwork')}
            </h2>
          </div>

          <RadioTower />
        </div>

        <div className="log-list">
          {state.networkLogs.length
            ? state.networkLogs
                .filter(
                  (log) =>
                    includesQuery(
                      `${log.endpoint} ${log.message}`,
                      query
                    )
                )
                .map(
                  (
                    log,
                    index
                  ) => (
                    <div
                      key={
                        `${
                          log.timestamp
                        }-${index}`
                      }
                    >
                      <time>
                        {new Date(
                          log.timestamp *
                          1000
                        ).toLocaleTimeString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU')}
                      </time>

                      <b
                        className={
                          log.ok
                            ? 'ok'
                            : 'bad'
                        }
                      >
                        {log.ok
                          ? t('common.success')
                          : t('common.error')}
                      </b>

                      <span>
                        {log.endpoint}
                        {' · '}
                        {log.message}
                      </span>
                    </div>
                  )
                )
            : (
                <p className="muted">
                  {t('logs.noNetwork')}
                </p>
              )}
        </div>
      </section>
    </div>
  );
}
