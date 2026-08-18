import {
  AlertTriangle,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  UploadCloud
} from 'lucide-react';

import { useI18n } from '../../i18n';
import type { AppUpdateState } from '../../hooks/useAppUpdateCenter';
import type { FirmwareStatus } from '../../types';
import {
  getUpdateRelation,
  type UpdateRelation
} from '../../utils/updateVersion.mjs';
import { buildUpdateCenterPanelModel } from '../../utils/updateCenterPanelModel.mjs';

interface Props {
  firmware: FirmwareStatus | null;
  appUpdate: AppUpdateState;
  isMobile: boolean;
  busy: boolean;
  onCheck: () => void;
  onInstallFirmware: () => void;
}

function relationKey(relation: UpdateRelation) {
  return `beta3.update.relation.${relation}` as const;
}

function channelFromVersion(value?: string): 'stable' | 'beta' | 'unknown' {
  const normalized = (value ?? '').trim().replace(/^v/i, '');
  if (!normalized || normalized === '…') return 'unknown';
  return /-(?:alpha|beta|rc)(?:[.-]|$)/i.test(normalized) ? 'beta' : 'stable';
}

function RelationIcon({ relation }: { relation: UpdateRelation }) {
  return relation === 'older'
    ? <AlertTriangle size={15} />
    : relation === 'newer'
      ? <DownloadCloud size={15} />
      : <CheckCircle2 size={15} />;
}

export function UpdateCenterPanel({
  firmware,
  appUpdate,
  isMobile,
  busy,
  onCheck,
  onInstallFirmware
}: Props) {
  const { t } = useI18n();

  const appInstalled =
    appUpdate.currentVersion && appUpdate.currentVersion !== '…'
      ? appUpdate.currentVersion
      : firmware?.appCurrentVersion;

  // Important: use the actual catalog version first. useAppUpdateCenter intentionally
  // normalizes latestVersion back to currentVersion when GitHub only has an older build.
  const appAvailable =
    firmware?.availableApp?.version ??
    firmware?.availableApp?.tag ??
    appUpdate.latestVersion;

  const firmwareInstalled = firmware?.installedVersion;
  const firmwareAvailable =
    firmware?.availableFirmware?.firmwareVersion ??
    firmware?.availableFirmware?.tag;

  const appBuildChannel = channelFromVersion(appInstalled);
  const firmwareBuildChannel = channelFromVersion(firmwareInstalled);
  const appSelectedChannel = appUpdate.channel;
  const firmwareSelectedChannel =
    firmware?.firmwareUpdateChannel === 'stable' ? 'stable' : 'beta';
  const appChannelMismatch =
    appBuildChannel !== 'unknown' && appBuildChannel !== appSelectedChannel;
  const firmwareChannelMismatch =
    firmwareBuildChannel !== 'unknown' &&
    firmwareBuildChannel !== firmwareSelectedChannel;

  // Keep the established Beta3 model binding intact for firmware readiness and
  // as the fallback application relation when one side of the comparison is absent.
  const updateCenterModel = buildUpdateCenterPanelModel({ firmware });
  const fallbackAppRelation = updateCenterModel.application.relation as UpdateRelation;
  const appRelation =
    appInstalled && appAvailable
      ? getUpdateRelation(appAvailable, appInstalled)
      : fallbackAppRelation;
  const firmwareRelation =
    updateCenterModel.firmware.relation as UpdateRelation;

  const readiness = [
    {
      key: 'arduino',
      ok: updateCenterModel.readiness.arduino,
      label: t('beta3.update.readinessShort.arduino')
    },
    {
      key: 'ota',
      ok: updateCenterModel.readiness.ota,
      label: t('beta3.update.readinessShort.ota')
    },
    {
      key: 'backup',
      ok: updateCenterModel.readiness.backup,
      label: t('beta3.update.readinessShort.backup')
    }
  ];

  const firmwareReady =
    readiness.every((item) => item.ok);

  const canInstallFirmware =
    !busy &&
    updateCenterModel.firmware.canInstall &&
    firmwareReady;

  const appTargetUrl =
    appUpdate.downloadUrl ||
    appUpdate.releaseUrl ||
    firmware?.availableApp?.downloadUrl ||
    firmware?.availableApp?.releaseUrl ||
    null;

  const showNativeAppInstall =
    !isMobile &&
    appRelation === 'newer' &&
    appUpdate.nativeInstallAvailable;

  const showExternalAppInstall =
    !isMobile &&
    appRelation === 'newer' &&
    !appUpdate.nativeInstallAvailable &&
    Boolean(appTargetUrl);

  return (
    <section
      className={`panel beta3-update-center beta3-update-center-compact update-system-v2${isMobile ? ' mobile-firmware-only' : ''}`}
      data-update-system-version="2.0"
    >
      <div className="panel-title beta3-update-center-title">
        <div>
          <p className="eyebrow">UPDATE SYSTEM 2.0</p>
          <h2>{t('beta3.update.title')}</h2>
          <p className="beta3-update-subtitle">
            {t('beta3.update.subtitle')}
          </p>
        </div>

        <button
          className="secondary beta3-update-check"
          type="button"
          disabled={busy || appUpdate.checking || appUpdate.installing}
          onClick={onCheck}
        >
          <RefreshCw
            className={busy || appUpdate.checking ? 'spin' : ''}
            size={16}
          />
          {t('beta3.update.checkAll')}
        </button>
      </div>

      <div className="beta3-update-grid">
        {!isMobile && (
          <article className="beta3-update-card update-system-app-card">
            <div className="beta3-update-card-head">
              <strong>{t('beta3.update.application')}</strong>
              <span className="beta3-update-channel">
                {appSelectedChannel.toUpperCase()}
              </span>
            </div>

            <div className="beta3-version-pair">
              <div>
                <small>{t('beta3.update.installed')}</small>
                <b>{appInstalled ?? t('common.unknown')}</b>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <small>{t('beta3.update.available')}</small>
                <b>{appAvailable ?? t('common.noData')}</b>
              </div>
            </div>

            <p className="notice-text beta3-update-note">
              {t('channelIdentity.buildType')}: {appBuildChannel.toUpperCase()}
              {' · '}
              {t('channelIdentity.updateChannel')}: {appSelectedChannel.toUpperCase()}
            </p>
            {appChannelMismatch && (
              <p className="console-warning beta3-update-note">
                {t('channelIdentity.appMismatch', {
                  build: appBuildChannel.toUpperCase(),
                  channel: appSelectedChannel.toUpperCase()
                })}
              </p>
            )}

            <div className={`beta3-update-relation ${appRelation}`}>
              <RelationIcon relation={appRelation} />
              {t(relationKey(appRelation))}
            </div>

            {showNativeAppInstall && (
              <button
                className="beta3-update-action update-system-install-app"
                type="button"
                disabled={appUpdate.installing}
                onClick={() => void appUpdate.installNow()}
              >
                <DownloadCloud size={16} />
                {appUpdate.installing
                  ? t('appUpdate.installing')
                  : t('appUpdate.install')}
              </button>
            )}

            {showExternalAppInstall && appTargetUrl && (
              <a
                className="secondary-button beta3-update-action update-system-install-app-fallback"
                href={appTargetUrl}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadCloud size={16} />
                {t('beta3.update.downloadApp')}
              </a>
            )}

            {appRelation === 'newer' &&
              !showNativeAppInstall &&
              !showExternalAppInstall && (
                <p className="notice-text beta3-update-note">
                  {t('beta3.update.noDirectAppDownload')}
                </p>
              )}
          </article>
        )}

        <article className="beta3-update-card update-system-firmware-card">
          <div className="beta3-update-card-head">
            <strong>{t('beta3.update.firmware')}</strong>
            <span className="beta3-update-channel">
              {firmware?.firmwareUpdateChannel ?? t('common.unknown')}
            </span>
          </div>

          <div className="beta3-version-pair">
            <div>
              <small>{t('beta3.update.installed')}</small>
              <b>{firmwareInstalled ?? t('common.unknown')}</b>
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <small>{t('beta3.update.available')}</small>
              <b>{firmwareAvailable ?? t('common.noData')}</b>
            </div>
          </div>

          <p className="notice-text beta3-update-note">
            {t('channelIdentity.buildType')}: {firmwareBuildChannel.toUpperCase()}
            {' · '}
            {t('channelIdentity.updateChannel')}: {firmwareSelectedChannel.toUpperCase()}
          </p>
          {firmwareChannelMismatch && (
            <p className="console-warning beta3-update-note">
              {t('channelIdentity.firmwareMismatch', {
                build: firmwareBuildChannel.toUpperCase(),
                channel: firmwareSelectedChannel.toUpperCase()
              })}
            </p>
          )}

          <div className={`beta3-update-relation ${firmwareRelation}`}>
            <RelationIcon relation={firmwareRelation} />
            {t(relationKey(firmwareRelation))}
          </div>

          <div className="beta3-readiness-line">
            <small className="beta3-readiness-label">
              OTA 2.0 · {t('beta3.update.ota2Ready')}
            </small>
            <div
              className="beta3-readiness-statuses"
              aria-label={t('beta3.update.ota2Ready')}
            >
              {readiness.map((item) => (
                <span
                  key={item.key}
                  className={item.ok ? 'ready' : 'missing'}
                >
                  <span
                    className="beta3-readiness-dot"
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {firmwareRelation === 'newer' ? (
            <button
              className="beta3-update-action update-system-install-firmware"
              type="button"
              disabled={!canInstallFirmware}
              onClick={onInstallFirmware}
            >
              <UploadCloud size={16} />
              {t('beta3.update.installFirmware')}
            </button>
          ) : firmwareRelation === 'older' ? (
            <p className="console-warning beta3-update-note">
              {t('beta3.update.downgradeBlocked')}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
