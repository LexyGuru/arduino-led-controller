import {
  Activity,
  CalendarDays,
  Gauge,
  Lightbulb,
  Network,
  ShieldCheck
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { DashboardStatistics } from '../../utils/v55Statistics';
import { percent } from '../../utils/v55Statistics';

function Metric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <article className="v55-metric">
      <span className="v55-metric-icon"><Icon size={18} /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

export function StatisticsPanel({
  stats
}: {
  stats: DashboardStatistics;
}) {
  const { t } = useI18n();
  const maxDay = Math.max(1, ...stats.scheduleDays.map((item) => item.count));
  const maxSource = Math.max(1, ...stats.sourceCounts.map((item) => item.count));

  return (
    <section className="v55-statistics-grid">
      <article className="panel v55-statistics-overview">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('stats.eyebrow')}</p>
            <h2>{t('stats.title')}</h2>
          </div>
          <Gauge />
        </div>

        <div className="v55-metric-grid">
          <Metric
            icon={Lightbulb}
            label={t('stats.ledsActive')}
            value={`${stats.enabledStrips}/${stats.stripCount}`}
            detail={`${t('stats.averageBrightness')}: ${stats.averageBrightness}`}
          />
          <Metric
            icon={CalendarDays}
            label={t('stats.schedules')}
            value={stats.scheduleCount}
            detail={`${t('stats.activeEffects')}: ${stats.activeEffects}`}
          />
          <Metric
            icon={Network}
            label={t('stats.httpRequests')}
            value={stats.httpRequests ?? '—'}
            detail={`${t('stats.timeouts')}: ${stats.httpTimeouts ?? '—'}`}
          />
          <Metric
            icon={ShieldCheck}
            label={t('stats.httpSuccess')}
            value={stats.httpSuccessPercent == null ? '—' : `${stats.httpSuccessPercent}%`}
            detail={`${t('stats.networkErrors')}: ${stats.networkErrors}`}
          />
        </div>
      </article>

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
