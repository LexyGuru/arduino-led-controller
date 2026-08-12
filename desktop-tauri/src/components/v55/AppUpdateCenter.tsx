import {
  CheckCircle2,
  Clock3,
  DownloadCloud,
  RefreshCw,
  Rocket,
  TriangleAlert
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { AppUpdateState } from '../../hooks/useAppUpdateCenter';

export function AppUpdateCenter({
  state
}: {
  state: AppUpdateState;
}) {
  const { t, language } = useI18n();
  const locale =
    language === 'de'
      ? 'de-DE'
      : language === 'en'
        ? 'en-US'
        : 'hu-HU';

  const statusLabel =
    state.phase === 'available'
      ? t('appUpdate.available')
      : state.phase === 'current'
        ? t('appUpdate.current')
        : state.phase === 'error'
          ? t('appUpdate.error')
          : state.phase === 'checking'
            ? t('appUpdate.checking')
            : t('appUpdate.notChecked');

  const StatusIcon =
    state.phase === 'available'
      ? Rocket
      : state.phase === 'error'
        ? TriangleAlert
        : CheckCircle2;

  const targetUrl = state.downloadUrl || state.releaseUrl;

  return (
    <section className="panel settings-panel settings-general-section v55-app-update-center">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('appUpdate.eyebrow')}</p>
          <h2>{t('appUpdate.title')}</h2>
        </div>
        <StatusIcon
          className={
            state.phase === 'available'
              ? 'update-available'
              : state.phase === 'error'
                ? 'bad'
                : 'ok'
          }
        />
      </div>

      <div className={`v55-update-state ${state.phase}`}>
        <span className="v55-update-state-icon">
          <StatusIcon size={19} />
        </span>
        <div>
          <strong>{statusLabel}</strong>
          <small>{t('appUpdate.channel',{channel:state.channel})}</small>
        </div>
      </div>

      <div className="v55-update-grid">
        <div>
          <span>{t('appUpdate.installed')}</span>
          <strong>{state.currentVersion}</strong>
        </div>
        <div>
          <span>{t('appUpdate.latest')}</span>
          <strong>{state.latestVersion ?? '—'}</strong>
        </div>
        <div>
          <span>{t('appUpdate.lastCheck')}</span>
          <strong>
            {state.checkedAt
              ? new Date(state.checkedAt).toLocaleString(locale)
              : t('appUpdate.never')}
          </strong>
        </div>
      </div>

      {state.error && (
        <div className="notice v55-update-error">
          <TriangleAlert size={18} />
          <p>{t('appUpdate.checkError',{error:state.error})}</p>
        </div>
      )}

      <div className="v55-update-actions">
        <button
          type="button"
          className="secondary"
          disabled={state.checking}
          onClick={() => void state.checkNow()}
        >
          <RefreshCw size={17} className={state.checking ? 'spin' : ''} />
          {t('appUpdate.checkNow')}
        </button>

        {state.updateAvailable && targetUrl && (
          <a
            className="primary-button"
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
          >
            <DownloadCloud size={17} />
            {t('appUpdate.download')}
          </a>
        )}
      </div>

      {!state.updateAvailable && state.phase === 'current' && (
        <div className="v55-update-current-note">
          <CheckCircle2 size={16} />
          <span>{t('appUpdate.currentHelp')}</span>
        </div>
      )}

      {state.updateAvailable && !targetUrl && (
        <div className="v55-update-current-note warning">
          <Clock3 size={16} />
          <span>{t('appUpdate.noDirectDownload')}</span>
        </div>
      )}
    </section>
  );
}
