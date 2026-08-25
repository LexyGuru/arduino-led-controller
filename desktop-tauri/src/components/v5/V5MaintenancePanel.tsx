import { I18nText } from "../../i18n";
import { Power, ShieldOff, Wrench } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime } from '../../services/v5SystemModels.mjs';
import { V5StatusBadge } from './V5StatusBadge';
export function V5MaintenancePanel({ maintenance, busyAction, onEnable, onDisable }: {
    maintenance: {
        enabled: boolean;
        reason: string | null;
        enabledAt: string | null;
        enabledBy: string | null;
    };
    busyAction: string | null;
    onEnable: (reason: string) => void;
    onDisable: () => void;
}) {
    const [reason, setReason] = useState('Tervezett rendszerkarbantartás.');
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.irasvedelem.4700ff82"/></p>
          <h2><I18nText k="legacyUi.karbantartasi.mod.cc8b864a"/></h2>
        </div>

        <V5StatusBadge state={maintenance.enabled
            ? 'warning'
            : 'ok'} label={maintenance.enabled
            ? 'Aktív'
            : 'Kikapcsolva'}/>
      </div>

      {maintenance.enabled ? (<div className="v5-maintenance-active">
          <Wrench size={28}/>

          <div>
            <strong><I18nText k="legacyUi.a.modosito.api.k.blokkolva.vannak.c8b74e51"/></strong>

            <p>
              {maintenance.reason}
            </p>

            <small><I18nText k="legacyUi.aktivalta.af37c683"/>{' '}
              {maintenance.enabledBy ||
                'system'}
              {' · '}
              {formatDateTime(maintenance.enabledAt)}
            </small>
          </div>

          <button className="danger" disabled={busyAction !==
                null} onClick={onDisable}>
            <Power size={17}/><I18nText k="schedules.turnOff"/></button>
        </div>) : (<>
          <label><I18nText k="legacyUi.karbantartas.oka.f009b352"/><input value={reason} onChange={(event) => setReason(event.target.value)}/>
          </label>

          <button className="secondary" disabled={busyAction !==
                null ||
                !reason.trim()} onClick={() => onEnable(reason)}>
            <ShieldOff size={17}/><I18nText k="legacyUi.karbantartasi.mod.aktivalasa.81ad3210"/></button>
        </>)}
    </section>);
}
