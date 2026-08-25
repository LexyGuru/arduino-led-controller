import { I18nText } from "../../i18n";
import { FlaskConical, Play, Route } from 'lucide-react';
export function V5MigrationPanel({ migrations, maintenanceEnabled, busyAction, onDryRun, onApply }: {
    migrations: {
        pending: number;
        migrations: Array<Record<string, unknown>>;
    };
    maintenanceEnabled: boolean;
    busyAction: string | null;
    onDryRun: () => void;
    onApply: () => void;
}) {
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.adatmigracio.4bef76fb"/></p>
          <h2><I18nText k="legacyUi.idempotens.migraciok.80701e2a"/></h2>
        </div>

        <span className="v5-pending-count">
          {migrations.pending}
          {<I18nText k="legacyUi.fuggoben.a5a32c2f"/>}
        </span>
      </div>

      <div className="v5-migration-list">
        {migrations.migrations.map((migration, index) => (<div key={String(migration.id ||
                index)}>
              <Route size={17}/>

              <div>
                <strong>
                  {String(migration.id ||
                'migráció')}
                </strong>

                <small>
                  {String(migration.description ||
                '')}
                </small>
              </div>

              <span className={migration.required ===
                true
                ? 'bad'
                : 'ok'}>
                {migration.required ===
                true
                ? <I18nText k="legacyUi.szukseges.7ecea040"/> : <I18nText k="legacyUi.rendben.5d7c41a9"/>}
              </span>
            </div>))}
      </div>

      <div className="v5-actions">
        <button className="secondary" disabled={busyAction !==
            null} onClick={onDryRun}>
          <FlaskConical size={17}/>
          Dry-run
        </button>

        <button disabled={busyAction !==
            null ||
            migrations.pending ===
                0 ||
            !maintenanceEnabled} title={maintenanceEnabled
            ? ''
            : 'Alkalmazás előtt kapcsold be a karbantartási módot'} onClick={() => {
            if (globalThis.confirm('Alkalmazod a függő migrációkat?')) {
                onApply();
            }
        }}>
          <Play size={17}/><I18nText k="legacyUi.migraciok.alkalmazasa.86956918"/></button>
      </div>
    </section>);
}
