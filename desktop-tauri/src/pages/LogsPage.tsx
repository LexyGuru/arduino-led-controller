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
            V5 MEGFIGYELHETŐSÉG
          </p>
          <h2>
            Konzol, audit és események
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
                Közös konzolcache
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
                          ? 'KONZOL'
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
                    Nincs megjeleníthető Arduino-konzolsor.
                  </p>
                )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                BIZTONSÁGI AUDIT
              </p>
              <h2>
                Legutóbbi műveletek
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
                    Nincs auditbejegyzés, vagy nincs audit:read jogosultság.
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
                Realtime események
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
                    Nincs elérhető V5 esemény.
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
              Helyi hálózati napló
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
                        ).toLocaleTimeString(
                          'hu-HU'
                        )}
                      </time>

                      <b
                        className={
                          log.ok
                            ? 'ok'
                            : 'bad'
                        }
                      >
                        {log.ok
                          ? 'SIKER'
                          : 'HIBA'}
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
                  Még nincs helyi hálózati kérés.
                </p>
              )}
        </div>
      </section>
    </div>
  );
}
