import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw
} from 'lucide-react';

import {
  V5DataSourceBadge,
  type V5DataSource
} from './V5DataSourceBadge';

export function V5ScheduleState({
  source,
  dirty,
  conflict,
  runner,
  busy,
  onRefresh,
  onTick
}: {
  source: V5DataSource;
  dirty: boolean;
  conflict: boolean;
  runner: {
    mode: string;
    running: boolean;
    lastTickAt: string | null;
    lastRunAt: string | null;
  };
  busy: boolean;
  onRefresh: () => void;
  onTick: () => void;
}) {
  return (
    <section className="panel v5-schedule-state">
      <div>
        <V5DataSourceBadge source={source} />

        <span className={dirty ? 'v5-dirty yes' : 'v5-dirty'}>
          {dirty ? 'Nem mentett módosítás' : 'Szinkronban'}
        </span>

        {conflict && (
          <span className="v5-conflict">
            <AlertTriangle size={15} />
            Szerveroldali változás
          </span>
        )}
      </div>

      <div className="v5-runner-summary">
        {runner.running ? (
          <CheckCircle2 size={16} />
        ) : (
          <Clock3 size={16} />
        )}

        <span>
          Runner: {runner.mode}
        </span>

        <small>
          Utolsó futás: {runner.lastRunAt || '–'}
        </small>
      </div>

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={onRefresh}
        >
          <RefreshCw size={16} />
          Szerverlista frissítése
        </button>

        <button
          className="secondary"
          disabled={busy}
          onClick={onTick}
        >
          <Clock3 size={16} />
          Runner kézi futtatása
        </button>
      </div>
    </section>
  );
}
