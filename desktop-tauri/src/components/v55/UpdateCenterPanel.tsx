import {
  AlertTriangle,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  UploadCloud
} from 'lucide-react';

import { useI18n } from '../../i18n';
import type { FirmwareStatus } from '../../types';
import {
  getUpdateRelation,
  type UpdateRelation
} from '../../utils/updateVersion.mjs';
import { buildUpdateCenterPanelModel } from '../../utils/updateCenterPanelModel.mjs';

interface Props {
  firmware: FirmwareStatus | null;
  busy: boolean;
  onCheck: () => void;
  onInstallFirmware: () => void;
}

function relationKey(relation: UpdateRelation) {
  return `beta3.update.relation.${relation}` as const;
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
  busy,
  onCheck,
  onInstallFirmware
}: Props) {
  const { t } = useI18n();

  const appInstalled = firmware?.appCurrentVersion;
  const appAvailable =
    firmware?.availableApp?.version ??
    firmware?.availableApp?.tag;
  const firmwareInstalled = firmware?.installedVersion;
  const firmwareAvailable =
    firmware?.availableFirmware?.firmwareVersion ??
    firmware?.availableFirmware?.tag;

  const updateCenterModel =
    buildUpdateCenterPanelModel({ firmware });
  const appRelation =
    updateCenterModel.application.relation;
  const firmwareRelation =
    updateCenterModel.firmware.relation;

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
    updateCenterModel.firmware.canInstall;

  return (
    <section className="panel beta3-update-center beta3-update-center-compact">
      <div className="panel-title beta3-update-center-title">
        <div>
          <p className="eyebrow">
            {t('beta3.update.eyebrow')}
          </p>
          <h2>{t('beta3.update.title')}</h2>
          <p className="beta3-update-subtitle">
            {t('beta3.update.subtitle')}
          </p>
        </div>

        <button
          className="secondary beta3-update-check"
          type="button"
          disabled={busy}
          onClick={onCheck}
        >
          <RefreshCw
            className={busy ? 'spin' : ''}
            size={16}
          />
          {t('beta3.update.checkAll')}
        </button>
      </div>

      <div className="beta3-update-grid">
        <article className="beta3-update-card">
          <div className="beta3-update-card-head">
            <strong>{t('beta3.update.application')}</strong>
            <span className="beta3-update-channel">
              {firmware?.updateChannel ?? t('common.unknown')}
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

          <div className={`beta3-update-relation ${appRelation}`}>
            <RelationIcon relation={appRelation} />
            {t(relationKey(appRelation))}
          </div>

          {appRelation === 'newer' &&
          firmware?.availableApp?.downloadUrl ? (
            <a
              className="secondary-button beta3-update-action"
              href={firmware.availableApp.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadCloud size={16} />
              {t('beta3.update.downloadApp')}
            </a>
          ) : appRelation === 'newer' ? (
            <p className="notice-text beta3-update-note">
              {t('beta3.update.noDirectAppDownload')}
            </p>
          ) : null}
        </article>

        <article className="beta3-update-card">
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

          <div className={`beta3-update-relation ${firmwareRelation}`}>
            <RelationIcon relation={firmwareRelation} />
            {t(relationKey(firmwareRelation))}
          </div>

          <div className="beta3-readiness-line">
            <small className="beta3-readiness-label">
              {t('beta3.update.ota2Ready')}
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
              className="beta3-update-action"
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
