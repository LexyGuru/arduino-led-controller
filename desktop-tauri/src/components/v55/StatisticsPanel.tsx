import {
  Activity,
  CalendarDays
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { DashboardStatistics } from '../../utils/v55Statistics';
import { percent } from '../../utils/v55Statistics';

export function StatisticsPanel({
  stats
}: {
  stats: DashboardStatistics;
}) {
  const { t } = useI18n();
  const maxDay = Math.max(1, ...stats.scheduleDays.map((item) => item.count));
  const maxSource = Math.max(1, ...stats.sourceCounts.map((item) => item.count));

  return (
    <section className="v55-statistics-grid v568-distribution-grid">
      <article className="panel v55-distribution-card">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('stats.scheduleDistribution')}</p>
            <h2>{t('stats.weeklyLoad')}</h2>
          </div>
          <CalendarDays />
        </div>
        <div className="v55-bars">
          {stats.scheduleDays.map((item) => (
            <div className="v55-bar-row" key={item.day}>
              <span>{t(`days.${item.day}`)}</span>
              <div className="v55-bar-track">
                <i style={{ width: `${percent(item.count, maxDay)}%` }} />
              </div>
              <b>{item.count}</b>
            </div>
          ))}
        </div>
      </article>

      <article className="panel v55-distribution-card">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('stats.activityDistribution')}</p>
            <h2>{t('stats.auditSources')}</h2>
          </div>
          <Activity />
        </div>
        <div className="v55-bars">
          {stats.sourceCounts.length ? stats.sourceCounts.map((item) => (
            <div className="v55-bar-row" key={item.source}>
              <span>{item.source}</span>
              <div className="v55-bar-track">
                <i style={{ width: `${percent(item.count, maxSource)}%` }} />
              </div>
              <b>{item.count}</b>
            </div>
          )) : (
            <p className="muted">{t('stats.noActivity')}</p>
          )}
        </div>
      </article>
    </section>
  );
}
