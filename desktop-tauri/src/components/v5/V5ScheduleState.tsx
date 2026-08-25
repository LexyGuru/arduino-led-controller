import { I18nText } from "../../i18n";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { V5DataSourceBadge, type V5DataSource } from './V5DataSourceBadge';
export function V5ScheduleState({ source, dirty, conflict, runner, busy, onRefresh, onTick }: {
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
    return (<section className="panel v5-schedule-state">
      <div>
        <V5DataSourceBadge source={source}/>

        <span className={dirty ? 'v5-dirty yes' : 'v5-dirty'}>
          {dirty ? <I18nText k="legacyUi.nem.mentett.modositas.75295733"/> : <I18nText k="legacyUi.szinkronban.2cb61120"/>}
        </span>

        {conflict && (<span className="v5-conflict">
            <AlertTriangle size={15}/><I18nText k="legacyUi.szerveroldali.valtozas.df870c62"/></span>)}
      </div>

      <div className="v5-runner-summary">
        {runner.running ? (<CheckCircle2 size={16}/>) : (<Clock3 size={16}/>)}

        <span><I18nText k="legacyUi.runner.629c61e7"/>{runner.mode}
        </span>

        <small><I18nText k="legacyUi.utolso.futas.70ba2199"/>{runner.lastRunAt || '–'}
        </small>
      </div>

      <div className="v5-actions">
        <button className="secondary" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={16}/><I18nText k="legacyUi.szerverlista.frissitese.d0116b6b"/></button>

        <button className="secondary" disabled={busy} onClick={onTick}>
          <Clock3 size={16}/><I18nText k="legacyUi.runner.kezi.futtatasa.14932229"/></button>
      </div>
    </section>);
}
