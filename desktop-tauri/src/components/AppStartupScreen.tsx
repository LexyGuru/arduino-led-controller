import {
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';

import type { StartupCheck } from '../hooks/useAppStartupGate';
import { useI18n } from '../i18n';

interface AppStartupScreenProps {
  checks: StartupCheck[];
  progress: number;
  warningCount: number;
  exiting: boolean;
}

export function AppStartupScreen({
  checks,
  progress,
  warningCount,
  exiting
}: AppStartupScreenProps) {
  const { t } = useI18n();

  return (
    <div
      className={`app-startup-screen${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={t('startup.title')}
    >
      <div className="app-startup-screen__backdrop" aria-hidden="true" />
      <section className="app-startup-card">
        <div className="app-startup-brand">
          <span className="app-startup-logo">
            <img src="/v5-icon.png" alt="" />
            <span className="app-startup-logo__scan" />
          </span>
          <div>
            <p className="eyebrow">{t('startup.eyebrow')}</p>
            <h1>{t('startup.title')}</h1>
            <p>{t('startup.subtitle')}</p>
          </div>
        </div>

        <div className="app-startup-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="app-startup-progress-copy">
          <span>{t('startup.progress')}</span>
          <strong>{progress}%</strong>
        </div>

        <div className="app-startup-checks">
          {checks.map((check) => (
            <div
              className={`app-startup-check is-${check.state}`}
              key={check.id}
              data-startup-check={check.id}
              data-startup-state={check.state}
            >
              <span className="app-startup-check__icon" aria-hidden="true">
                {check.state === 'pass' ? (
                  <CheckCircle2 size={18} />
                ) : check.state === 'warn' ? (
                  <TriangleAlert size={18} />
                ) : (
                  <LoaderCircle size={18} className="app-startup-spinner" />
                )}
              </span>
              <span className="app-startup-check__copy">
                <strong>{t(check.labelKey)}</strong>
                {check.detailKey && <small>{t(check.detailKey)}</small>}
              </span>
            </div>
          ))}
        </div>

        <div className="app-startup-footer">
          <ShieldCheck size={17} />
          <span>
            {warningCount > 0
              ? t('startup.readyWithWarnings', { count: warningCount })
              : t('startup.ready')}
          </span>
        </div>
      </section>
    </div>
  );
}
