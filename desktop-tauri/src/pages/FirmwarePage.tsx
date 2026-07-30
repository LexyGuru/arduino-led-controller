import {
  useEffect,
  useRef
} from 'react';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  ShieldCheck,
  Terminal,
  UploadCloud
} from 'lucide-react';

import {
  V5DataSourceBadge
} from '../components/v5/V5DataSourceBadge';

import {
  V5FirmwareBackups
} from '../components/v5/V5FirmwareBackups';

import {
  useV5Firmware
} from '../hooks/useV5Firmware';

import type {
  FirmwareStatus,
  OtaProgressEvent
} from '../types';

interface FirmwarePageProps {
  firmware: FirmwareStatus | null;
  busy: boolean;
  otaLogs: OtaProgressEvent[];
  otaProgress: number;
  otaStage: string;
  onRefresh: () => void;
  onUpdate: () => void;
}

function logTime(timestamp: number) {
  return new Date(
    timestamp
  ).toLocaleTimeString(
    'hu-HU',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  );
}

export function FirmwarePage({
  firmware:
    legacyFirmware,
  busy:
    legacyBusy,
  otaLogs:
    legacyLogs,
  otaProgress:
    legacyProgress,
  otaStage:
    legacyStage,
  onRefresh:
    directRefresh,
  onUpdate:
    directUpdate
}: FirmwarePageProps) {
  const state =
    useV5Firmware({
      legacyFirmware,
      legacyBusy,
      legacyLogs,
      legacyProgress,
      legacyStage,
      directRefresh,
      directUpdate
    });

  const firmware =
    state.status;

  const available =
    firmware
      ?.availableFirmware;

  const otaTarget =
    firmware
      ?.otaTargetAddress
      ? `${
          firmware
            .otaTargetAddress
        }:${
          firmware
            .otaTargetPort ??
          65280
        }`
      : 'A V5 szerver Arduino-beállításából származik';

  const lastLog =
    state.logs.at(-1);

  const consoleRef =
    useRef<
      HTMLDivElement |
      null
    >(null);

  useEffect(
    () => {
      const element =
        consoleRef.current;

      if (element) {
        element.scrollTop =
          element.scrollHeight;
      }
    },
    [state.logs]
  );

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            V5 ARDUINO OTA
          </p>
          <h2>
            Firmware-frissítés és rollback
          </h2>
        </div>

        <div className="v5-heading-actions">
          <V5DataSourceBadge
            source={
              state.source
            }
          />

          <button
            className="secondary"
            onClick={
              () =>
                void state
                  .refresh({
                    forceCheck:
                      true
                  })
            }
            disabled={
              state.busy
            }
          >
            <RefreshCw
              className={
                state.busy
                  ? 'spin'
                  : ''
              }
              size={17}
            />
            Ellenőrzés
          </button>
        </div>
      </div>

      {(state.error ||
        state.notice) && (
        <section className="panel">
          {state.error && (
            <p className="console-warning">
              {state.error.code}
              {': '}
              {state.error.message}
            </p>
          )}

          {state.notice && (
            <p className="notice-text">
              {state.notice}
            </p>
          )}
        </section>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <small>
            Telepített verzió
          </small>
          <strong>
            {firmware
              ?.installedVersion ??
            'Ismeretlen'}
          </strong>
        </article>

        <article className="stat-card">
          <small>
            Elérhető verzió
          </small>
          <strong>
            {available
              ?.firmwareVersion ??
            available?.tag ??
            'Nincs adat'}
          </strong>
        </article>

        <article className="stat-card">
          <small>
            Backup szolgáltatás
          </small>
          <strong>
            {firmware
              ?.backupStoreConfigured
              ? 'Aktív'
              : 'Nincs beállítva'}
          </strong>
        </article>

        <article className="stat-card">
          <small>
            OTA cél
          </small>
          <strong>
            {otaTarget}
          </strong>
        </article>
      </section>

      <section className="panel firmware-panel">
        <div className="firmware-icon">
          <ShieldCheck
            size={34}
          />
        </div>

        <div>
          <h3>
            {firmware?.message ??
            'Kattints az ellenőrzésre.'}
          </h3>

          <p>
            OTA:
            {' '}
            {firmware
              ?.otaConfigured
              ? 'teljesen beállítva'
              : 'hiányos konfiguráció'}
            {' · '}
            Arduino:
            {' '}
            {firmware
              ?.arduinoOnline
              ? 'online'
              : 'offline'}
          </p>

          <p>
            {available
              ? `${
                  available.name
                } · ${
                  available.createdAt ??
                  available.tag
                }`
              : firmware
                  ?.firmwareLookupError ??
                'A firmware-kiadás még nincs lekérve.'}
          </p>
        </div>

        <div className="v5-firmware-actions">
          <button
            onClick={
              () =>
                void state
                  .startUpdate()
            }
            disabled={
              state.busy ||
              !firmware
                ?.otaConfigured ||
              !available ||
              !firmware
                ?.arduinoOnline
            }
          >
            <UploadCloud
              size={18}
            />
            Firmware telepítése
          </button>

          <button
            className="danger"
            onClick={
              () =>
                void state
                  .cancel()
            }
            disabled={
              !state.busy ||
              state.directFallback
            }
          >
            <Ban size={17} />
            Megszakítás
          </button>
        </div>
      </section>

      <section className="panel ota-progress-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              VALÓS IDEJŰ OTA
            </p>
            <h2>
              Frissítési konzol
            </h2>
          </div>

          <div
            className={
              `ota-state-badge ${
                lastLog
                  ?.level ??
                'idle'
              }`
            }
          >
            {lastLog
              ?.level ===
              'error'
              ? (
                  <AlertTriangle
                    size={15}
                  />
                )
              : lastLog
                  ?.level ===
                  'success'
                ? (
                    <CheckCircle2
                      size={15}
                    />
                  )
                : (
                    <Terminal
                      size={15}
                    />
                  )}
            {state.stage}
          </div>
        </div>

        <div className="ota-progress-summary">
          <div>
            <strong>
              {state.busy
                ? 'Firmware-művelet folyamatban'
                : state.progress ===
                    100
                  ? 'Művelet befejezve'
                  : 'Nincs folyamatban művelet'}
            </strong>

            <span>
              {lastLog
                ?.message ??
              firmware?.message ??
              'Az OTA állapotváltozásai itt jelennek meg.'}
            </span>
          </div>

          <b>
            {Math.round(
              state.progress
            )}
            %
          </b>
        </div>

        <div
          className="ota-progress-track"
          aria-label={
            `OTA folyamat ${state.progress}%`
          }
        >
          <div
            style={{
              width:
                `${
                  state.progress
                }%`
            }}
          />
        </div>

        <div
          ref={consoleRef}
          className="ota-console"
          role="log"
          aria-live="polite"
        >
          {state.logs.length ===
          0 ? (
            <div className="ota-console-empty">
              Még nincs OTA-napló.
            </div>
          ) : (
            state.logs.map(
              (
                entry,
                index
              ) => (
                <div
                  key={
                    `${
                      entry.timestamp
                    }-${index}`
                  }
                  className={
                    `ota-console-line ${
                      entry.level
                    }`
                  }
                >
                  <time>
                    {logTime(
                      entry.timestamp
                    )}
                  </time>
                  <b>
                    {entry.stage}
                  </b>
                  <span>
                    {entry.message}
                  </span>
                  <code>
                    {typeof entry
                      .progress ===
                      'number'
                      ? `${
                          entry.progress
                        }%`
                      : ''}
                  </code>
                </div>
              )
            )
          )}
        </div>
      </section>

      <V5FirmwareBackups
        backups={
          state.backups
        }
        busy={
          state.busy
        }
        apiAvailable={
          !state.directFallback
        }
        onRollback={
          (id) =>
            void state
              .rollback(id)
        }
        onDelete={
          (id) =>
            void state
              .deleteBackup(id)
        }
      />

      <div className="notice">
        <DownloadCloud
          size={18}
        />
        API v2 módban a frissítés, megszakítás, backup és rollback
        központilag a V5 szerveren fut. Elindult műveletet hálózati
        hiba után nem ismétlünk meg automatikusan közvetlenül.
      </div>
    </div>
  );
}
