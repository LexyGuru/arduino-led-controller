import {
  useEffect,
  useRef,
  useState
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
  useV5Firmware
} from '../hooks/useV5Firmware';

import { tauriApi } from '../services/tauriApi';

import { runUpdateCenterCheckBoth } from '../utils/updateCenterRefreshOrchestrator.mjs';
import {
  createOta2LiveInstallController
} from '../utils/ota2LiveInstallController.mjs';
import {
  createOta2RuntimeState
} from '../utils/ota2RuntimeState.mjs';

import { Ota2OperationPanel } from '../components/v55/Ota2OperationPanel';
import { isOta2CancelSafe, OTA2_UX_CODES } from '../utils/ota2UxModel.mjs';
import { runAudited } from '../services/tauriAudit';

import { createOta2RecoveryCoordinator } from '../utils/ota2Recovery.mjs';

import { useI18n } from '../i18n';

import { localizeOtaMessage, localizeOtaStage } from '../utils/firmwareOtaLocalization';
import { localizeFirmwareRuntimeMessage } from '../utils/firmwareLocalization';

import type {
  FirmwareArtifact,
  FirmwareStatus,
  OtaProgressEvent
} from '../types';
import type { AppUpdateState } from '../hooks/useAppUpdateCenter';

import { V5BetaBadge } from '../components/v5/V5BetaBadge';
import { UpdateCenterPanel } from '../components/v55/UpdateCenterPanel';

interface FirmwarePageProps {
  firmware: FirmwareStatus | null;
  appUpdate: AppUpdateState;
  firmwareUpdateChannel: 'stable' | 'beta';
  isMobile: boolean;
  busy: boolean;
  otaLogs: OtaProgressEvent[];
  otaProgress: number;
  otaStage: string;
  onRefresh: () => void;
  onUpdate: () => void;
  onCancel: () => void;
}


function versionParts(value?: string) {
  return (value ?? '')
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function compareVersions(left?: string, right?: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    if (av === bv) continue;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    if (typeof av === 'number') return 1;
    if (typeof bv === 'number') return -1;
    return String(av).localeCompare(String(bv));
  }

  return 0;
}

function deduplicateFirmwareCatalog(items: FirmwareArtifact[]) {
  const grouped = new Map<string, FirmwareArtifact>();

  for (const item of items) {
    const version = item.firmwareVersion ?? item.tag;
    const key = version.toLowerCase();
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...item, relatedTags: [item.tag] });
      continue;
    }

    existing.relatedTags = Array.from(
      new Set([...(existing.relatedTags ?? [existing.tag]), item.tag])
    );

    if (new Date(item.createdAt ?? 0).getTime() > new Date(existing.createdAt ?? 0).getTime()) {
      grouped.set(key, {
        ...item,
        relatedTags: existing.relatedTags
      });
    }
  }

  return Array.from(grouped.values()).sort((left, right) =>
    compareVersions(right.firmwareVersion ?? right.tag, left.firmwareVersion ?? left.tag)
  );
}

function logTime(timestamp: number, language: 'hu' | 'en' | 'de') {
  const locale = language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU';
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function FirmwarePage({
  firmware:
    legacyFirmware,
  appUpdate,
  firmwareUpdateChannel,
  isMobile,
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
    directUpdate,
  onCancel:
    directCancel
}: FirmwarePageProps) {
  const { t, language } = useI18n();
  const locale = language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU';
  const state =
    useV5Firmware({
      legacyFirmware,
      legacyBusy,
      legacyLogs,
      legacyProgress,
      legacyStage,
      directRefresh,
      directUpdate,
      directCancel
    });

  const firmware =
    state.status;

  const [releaseCatalog, setReleaseCatalog] = useState<FirmwareArtifact[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [pendingInstallVersion, setPendingInstallVersion] = useState<string | null>(null);
  const [ota2Runtime, setOta2Runtime] = useState(
    createOta2RuntimeState()
  );
  const [ota2Result, setOta2Result] = useState<any>(null);
  const [ota2Installing, setOta2Installing] = useState(false);
  const [ota2SelectedMode, setOta2SelectedMode] = useState<
    'update' | 'reinstall' | 'restore' | null
  >(null);
  const externalFirmwareInputRef = useRef<HTMLInputElement | null>(null);
  const [externalFirmwareBusy, setExternalFirmwareBusy] = useState(false);
  const selectedFirmwareChannel = firmwareUpdateChannel;
  const firmwareCatalog = deduplicateFirmwareCatalog(releaseCatalog).filter(
    (item) => (item.channel ?? '').trim().toLowerCase() === selectedFirmwareChannel
  );
  const latestCatalogVersion = firmwareCatalog[0]?.firmwareVersion ?? firmwareCatalog[0]?.tag;

  const refreshCatalog = async () => {
    try {
      setReleaseCatalog(
        await tauriApi.firmwareReleases(selectedFirmwareChannel)
      );
      setCatalogError('');
    } catch (error) {
      setCatalogError(String(error));
    }
  };

  const checkBoth = async () => {
    await Promise.all([
      runUpdateCenterCheckBoth({
        refreshStatus: () =>
          state.refresh({
            forceCheck: true
          }),
        refreshFirmwareCatalog:
          refreshCatalog
      }),
      appUpdate.checkNow()
    ]);
  };
  const installCatalogItem = async (
    item: FirmwareArtifact,
    version: string,
    mode: 'update' | 'reinstall' | 'restore'
  ) => {
    setOta2Runtime(createOta2RuntimeState());
    setOta2Result(null);
    setOta2SelectedMode(mode);
    setOta2Installing(true);

    const recovery = createOta2RecoveryCoordinator({

      loadSchedules: tauriApi.loadSchedulesFromArduino,

      createScheduleBackup: tauriApi.createScheduleBackup

    });


    const controller = createOta2LiveInstallController({
      firmwareInstallRelease: (tag) =>
        tauriApi.firmwareInstallRelease(tag, selectedFirmwareChannel),
      firmwareStatus: tauriApi.firmwareStatus,
      subscribeProgress: tauriApi.listenOtaProgress,
      createBackup: () => recovery.prepare()
    });

    try {
      const result = await runAudited(
        {
          source: 'ota',
          action: `ota.catalog.${mode}`,
          message: t('beta3.ota2.audit.start', {
            mode: t(`beta3.ota2.mode.${mode}`),
            version
          }),
          successMessage: t('beta3.ota2.audit.success', { version })
        },
        async () => {
          const value = await controller.install({
            firmware,
            artifact: item,
            version,
            onRuntime: setOta2Runtime
          });
          if (!value.ok) {
            const error = new Error(`OTA2 ${value.code}`) as Error & { ota2Result?: unknown };
            error.ota2Result = value;
            throw error;
          }
          return value;
        }
      );
      setOta2Result(result);
    } catch (error) {
      const carried = (error as Error & { ota2Result?: unknown }).ota2Result;
      setOta2Result(carried ?? { ok: false, code: OTA2_UX_CODES.UI_OPERATION_FAILED });
    } finally {
      setOta2Installing(false);
      await state.refresh({ forceCheck: true });
      await refreshCatalog();
    }
  };

  const cancelOta2 = async () => {
    if (!ota2Installing || !isOta2CancelSafe(ota2Runtime.stage)) return;
    await state.cancel();
    setOta2Result({ ok: false, code: OTA2_UX_CODES.CANCEL_REQUESTED });
  };

  useEffect(() => {
    setReleaseCatalog([]);
    void refreshCatalog();
  }, [selectedFirmwareChannel]);

  const available =
    firmware
      ?.availableFirmware;
  const installedFirmwareVersion = firmware?.installedVersion;
  const availableFirmwareVersion = available?.firmwareVersion ?? available?.tag;
  const availableVersionComparison =
    availableFirmwareVersion && installedFirmwareVersion
      ? compareVersions(availableFirmwareVersion, installedFirmwareVersion)
      : 0;
  const hasNewerFirmware = availableVersionComparison > 0;
  const availableIsOlderThanInstalled = availableVersionComparison < 0;
  const firmwareHeadline = availableIsOlderThanInstalled
    ? t('firmware.catalogOlderThanInstalled', {
        catalog: availableFirmwareVersion ?? t('common.unknown'),
        installed: installedFirmwareVersion ?? t('common.unknown')
      })
    : firmware?.message ?? t('firmware.clickCheck');
  const compatibilityHeadline = availableIsOlderThanInstalled
    ? t('firmware.noNewerFirmware')
    : firmware?.compatibilityStatus ?? t('firmware.compatNotRun');


  const otaConfigured =
    firmware?.otaConfigured === true;

  const otaMissingRequirements =
    firmware?.otaMissingRequirements ?? [];

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
      : t('firmware.targetFromConfig');

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
    <div className="page v55-firmware-page beta4-firmware-redesign">
      <div className="page-heading v55-management-heading">
        <div>
          <p className="eyebrow">
            OTA 2.0 · ARDUINO FIRMWARE
          </p>
          <h2>
            {t('firmware.title')}
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
                void checkBoth()
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
            {t('firmware.check')}
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

      <UpdateCenterPanel
        firmware={firmware}
        appUpdate={appUpdate}
        firmwareUpdateChannel={selectedFirmwareChannel}
        isMobile={isMobile}
        busy={state.busy || ota2Installing || appUpdate.installing}
        onCheck={
          () =>
            void checkBoth()
        }
        onInstallFirmware={() => { void state.startUpdate(); }}
      />

      <section className="stats-grid beta3-firmware-support-grid">
        <article className="stat-card">
          <small>{t('firmware.otaTarget')}</small>
          <strong>{otaTarget}</strong>
        </article>

        <article className="stat-card">
          <small>{t('firmware.backupService')}</small>
          <strong>
            {firmware?.backupStoreConfigured
              ? t('common.active')
              : t('common.unavailable')}
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
            {t('firmware.statusTitle')}
          </h3>

          <p className="firmware-status-summary">
            {firmwareHeadline}
          </p>

          <p>
            OTA:
            {' '}
            {otaConfigured
              ? t('firmware.otaComplete')
              : t('firmware.otaIncomplete')}
            {' · '}
            {t('firmware.arduino')}:
            {' '}
            {firmware
              ?.arduinoOnline
              ? t('common.online')
              : t('common.offline')}
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
                t('firmware.releaseNotLoaded')}
          </p>

          <p>
            {compatibilityHeadline}
          </p>
          {!otaConfigured && otaMissingRequirements.length > 0 && (
            <div className="console-warning">
              <strong>{t('firmware.missingRequirements')}</strong>
              <ul>
                {otaMissingRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {firmware?.cacheSha256 && (
            <p>Cache SHA-256: <code>{firmware.cacheSha256}</code></p>
          )}
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
              !otaConfigured ||
              !available ||
              !hasNewerFirmware ||
              !firmware?.arduinoOnline
            }
          >
            <UploadCloud
              size={18}
            />
            {t('firmware.install')}
          </button>

          {firmware?.availableApp?.downloadUrl && (
            <a
              className="secondary-button"
              href={firmware.availableApp.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadCloud size={17} />
              {t('firmware.downloadApp')}
            </a>
          )}

          <button
            className="danger"
            onClick={
              () =>
                void state
                  .cancel()
            }
            disabled={
              !state.busy
            }
          >
            <Ban size={17} />
            {t('firmware.cancel')}
          </button>
        </div>
      </section>

      <section className="panel ota-progress-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              {t('firmware.realtime')}
            </p>
            <h2>
              {t('firmware.console')}
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
            {localizeOtaStage(state.stage, language)}
          </div>
        </div>

        <div className="ota-progress-summary">
          <div>
            <strong>
              {state.busy
                ? t('firmware.inProgress')
                : state.progress ===
                    100
                  ? t('firmware.completed')
                  : t('firmware.idle')}
            </strong>

            <span>
              {lastLog?.message
                ? localizeOtaMessage(lastLog.message, language)
                : firmwareHeadline}
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
          aria-label={t('firmware.otaProgressAria', { progress: Math.round(state.progress) })}
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
              {t('firmware.noLogs')}
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
                    {logTime(entry.timestamp, language)}
                  </time>
                  <b>
                    {localizeOtaStage(entry.stage, language)}
                  </b>
                  <span>
                    {localizeOtaMessage(entry.message, language)}
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

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('firmware.externalEyebrow')}</p>
            <h2>{t('firmware.externalTitle')}</h2>
          </div>
          <UploadCloud />
        </div>

        <p className="muted">{t('firmware.externalHelp')}</p>

        <input
          ref={externalFirmwareInputRef}
          type="file"
          accept=".bin,application/octet-stream"
          style={{ display: 'none' }}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = '';

            if (!file) return;

            if (!file.name.toLowerCase().endsWith('.bin')) {
              setCatalogError(t('firmware.externalBinOnly'));
              return;
            }

            if (file.size < 1024 || file.size > 2 * 1024 * 1024) {
              setCatalogError(t('firmware.externalSizeInvalid'));
              return;
            }

            if (!window.confirm(
              t('firmware.externalConfirm', {
                name: file.name,
                size: file.size
              })
            )) {
              return;
            }

            void (async () => {
              try {
                setExternalFirmwareBusy(true);
                setCatalogError('');
                const bytes = Array.from(
                  new Uint8Array(await file.arrayBuffer())
                );
                await tauriApi.firmwareInstallExternal(file.name, bytes);
                await state.refresh({ forceCheck: true });
              } catch (error) {
                setCatalogError(
                  t('firmware.externalError', {
                    error: String(error)
                  })
                );
              } finally {
                setExternalFirmwareBusy(false);
              }
            })();
          }}
        />

        <button
          className="secondary"
          disabled={state.busy || externalFirmwareBusy}
          onClick={() => externalFirmwareInputRef.current?.click()}
        >
          <UploadCloud size={17} />
          {externalFirmwareBusy
            ? t('firmware.externalInstalling')
            : t('firmware.externalChoose')}
        </button>
      </section>

      <Ota2OperationPanel
        runtime={ota2Runtime}
        result={ota2Result}
        mode={ota2SelectedMode}
        installing={ota2Installing}
        onCancel={() => void cancelOta2()}
      />

      <section className="panel v5-firmware-backups">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('firmware.catalog')}</p>
            <h2>{t('firmware.restoreVersions',{
              channel: selectedFirmwareChannel === 'stable' ? 'Stable' : 'Beta'
            })}</h2>
          </div>
          <ShieldCheck />
        </div>
        <p className="muted">{t('firmware.catalogHelp')}</p>
        {catalogError && <p className="console-warning">{catalogError}</p>}
        <div
          className="v5-backup-list v5-firmware-catalog-scroll"
          role="region"
          aria-label={t('firmware.catalogScrollLabel')}
          tabIndex={0}
        >
          {firmwareCatalog.length === 0 ? <p className="muted">{t('firmware.noCatalog')}</p> : firmwareCatalog.map((item) => {
            const version = item.firmwareVersion ?? item.tag;
            const installed = version === firmware?.installedVersion;
            const latest = version === latestCatalogVersion;
            const rollback = Boolean(
              firmware?.installedVersion &&
              compareVersions(version, firmware.installedVersion) < 0
            );
            const relatedTags = item.relatedTags ?? [item.tag];

            return (
              <article key={`${version}-${item.name}`}>
                <div>
                  <strong>{t('firmware.versionTitle',{version})}</strong>
                  <small>
                    {installed ? t('firmware.badgeInstalled') : latest ? t('firmware.badgeLatest') : t('firmware.badgePrevious')}
                    {' · '}
                    {item.channel}
                    {' · '}
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU') : t('firmware.unknownDate')}
                  </small>
                  <p>
                    <b>{t('firmware.relatedReleases')}</b>
                    {' '}
                    {relatedTags.join(', ')}
                  </p>
                  {item.metadataConflict && (
                    <p className="console-warning">
                      <AlertTriangle size={15} />
                      {item.metadataConflict}
                    </p>
                  )}
                  {item.expectedFirmwareVersion && item.expectedFirmwareVersion !== version && (
                    <p>
                      <b>{t('firmware.metadataVersionLabel')}</b>
                      {' '}
                      <code>{item.expectedFirmwareVersion}</code>
                    </p>
                  )}
                  <p>{item.summary || t('firmware.noSummary')}</p>
                  <p><b>{t('firmware.fileLabel')}</b> <code>{item.name}</code></p>
                </div>
                <button
                  className="secondary"
                  disabled={state.busy || ota2Installing || Boolean(item.metadataConflict)}
                  onClick={() => {
                    if (pendingInstallVersion !== version) {
                      setPendingInstallVersion(version);
                      return;
                    }
                    setPendingInstallVersion(null);
                    void (async () => {
                      await installCatalogItem(
                        item,
                        version,
                        installed
                          ? 'reinstall'
                          : rollback
                            ? 'restore'
                            : 'update'
                      );
                    })();
                  }}
                >
                  {pendingInstallVersion === version
                    ? t('firmware.confirmInstallButton')
                    : installed
                      ? t('common.reinstall')
                      : rollback
                        ? t('common.rollback')
                        : t('common.update')}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="notice">
        <DownloadCloud size={18} />
        {t('firmware.catalogFooter')}
      </div>
    </div>
  );
}
