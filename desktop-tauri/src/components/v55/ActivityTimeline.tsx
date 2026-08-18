import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  XCircle
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { TauriAuditEntry } from '../../services/tauriAudit';

const iconFor = (level: TauriAuditEntry['level']) => {
  if (level === 'success') return CheckCircle2;
  if (level === 'error') return XCircle;
  if (level === 'warning') return AlertTriangle;
  return CircleDot;
};

export function ActivityTimeline({
  entries
}: {
  entries: TauriAuditEntry[];
}) {
  const { t, language } = useI18n();
  const locale = language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU';
  const items = [...entries].reverse().slice(0, 8);

  return (
    <article className="panel v55-activity-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('activity.eyebrow')}</p>
          <h2>{t('activity.title')}</h2>
        </div>
        <Clock3 />
      </div>

      <div className="v55-timeline">
        {items.length ? items.map((entry) => {
          const Icon = iconFor(entry.level);
          return (
            <div className={`v55-timeline-item ${entry.level}`} key={entry.id}>
              <span className="v55-timeline-icon"><Icon size={15} /></span>
              <div>
                <div className="v55-timeline-meta">
                  <b>{entry.source}</b>
                  <time>
                    {new Date(entry.timestamp).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </time>
                </div>
                <p>{entry.message}</p>
              </div>
            </div>
          );
        }) : (
          <p className="muted">{t('activity.empty')}</p>
        )}
      </div>
    </article>
  );
}
