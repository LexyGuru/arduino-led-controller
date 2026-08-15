import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Terminal
} from 'lucide-react';

import { useI18n } from '../../i18n';

import {
  buildOta2OperationUx,
  ota2StageTranslationKey
} from '../../utils/ota2UxModel.mjs';

import type {
  Ota2RuntimeState
} from '../../utils/ota2RuntimeState.mjs';

import type {
  Ota2LiveControllerResult
} from '../../utils/ota2LiveInstallController.mjs';

interface Ota2OperationPanelProps {
  runtime: Ota2RuntimeState;
  result: Ota2LiveControllerResult | null;
  mode: 'update' | 'reinstall' | 'restore' | null;
  installing: boolean;
  onCancel: () => void;
}

export function Ota2OperationPanel({
  runtime,
  result,
  mode,
  installing,
  onCancel
}: Ota2OperationPanelProps) {
  const { t } = useI18n();
  const ux = buildOta2OperationUx({
    runtime,
    result,
    mode,
    installing
  });
  const history = runtime.history.slice(-5);

  return (
    <section
      className={`panel beta3-ota2-operation ${ux.critical ? 'is-critical' : ''}`}
      data-ota2-operation="live"
    >
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('beta3.ota2.eyebrow')}</p>
          <h2>{t('beta3.ota2.title')}</h2>
        </div>
        {installing
          ? <LoaderCircle className="spin" />
          : result?.ok
            ? <CheckCircle2 />
            : result
              ? <AlertTriangle />
              : <ShieldCheck />}
      </div>

      <div className="beta3-ota2-summary">
        <div>
          <span>{t('beta3.ota2.operation')}</span>
          <strong>{t(ux.modeKey)}</strong>
        </div>
        <div>
          <span>{t('beta3.ota2.stage')}</span>
          <strong>{t(ux.stageKey)}</strong>
        </div>
        <div>
          <span>{t('beta3.ota2.code')}</span>
          <code>{result?.code ?? runtime.code}</code>
        </div>
      </div>

      <div className="beta3-ota2-progress" aria-label={t('beta3.ota2.progress')}>
        <div style={{ width: `${ux.progress}%` }} />
      </div>
      <small>{t('beta3.ota2.progressValue', { progress: ux.progress })}</small>

      {ux.blockerKeys.length > 0 && (
        <div className="beta3-ota2-blockers">
          <strong>
            <Ban size={16} />
            {t('beta3.ota2.blockers')}
          </strong>
          <ul>
            {ux.blockerKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      )}

      {result && ux.resultKey && (
        <div className={result.ok ? 'notice' : 'console-warning'}>
          {result.ok
            ? <CheckCircle2 size={17} />
            : <AlertTriangle size={17} />}
          <span>{t(ux.resultKey)} <code>{result.code}</code></span>
        </div>
      )}

      {installing && (
        <div className="beta3-ota2-cancel-row">
          {ux.canCancel ? (
            <button className="secondary" onClick={onCancel}>
              <Ban size={16} />
              {t('beta3.ota2.cancel')}
            </button>
          ) : (
            <small className="muted">
              {t('beta3.ota2.criticalNoCancel')}
            </small>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="beta3-ota2-history">
          <div className="beta3-ota2-history-title">
            <Terminal size={16} />
            <strong>{t('beta3.ota2.operationsLog')}</strong>
          </div>
          {history.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="beta3-ota2-history-row"
            >
              <code>{entry.code}</code>
              <span>{t(ota2StageTranslationKey(entry.stage))}</span>
              <small>{entry.progress}%</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
