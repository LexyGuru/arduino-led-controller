import { I18nText } from "../../i18n";
import { AlertTriangle, Database, Save } from 'lucide-react';
export function V5ScheduleConflict({ visible, busy, onReload, onForceSave }: {
    visible: boolean;
    busy: boolean;
    onReload: () => void;
    onForceSave: () => void;
}) {
    if (!visible) {
        return null;
    }
    return (<section className="v5-schedule-conflict">
      <AlertTriangle size={22}/>

      <div>
        <strong><I18nText k="legacyUi.az.idoziteslista.kozben.megvaltozott.a.v5.szerve.909a7bba"/></strong>
        <span><I18nText k="legacyUi.toltsd.ujra.a.szerver.valtozatat.vagy.tudatosan..acf01fb2"/></span>
      </div>

      <div className="v5-actions">
        <button className="secondary" disabled={busy} onClick={onReload}>
          <Database size={16}/><I18nText k="legacyUi.szerverlista.betoltese.2af803f0"/></button>

        <button className="danger" disabled={busy} onClick={onForceSave}>
          <Save size={16}/><I18nText k="legacyUi.tudatos.feluliras.7e934b66"/></button>
      </div>
    </section>);
}
