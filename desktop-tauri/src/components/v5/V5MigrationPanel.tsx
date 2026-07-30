import {
  FlaskConical,
  Play,
  Route
} from 'lucide-react';

export function V5MigrationPanel({
  migrations,
  maintenanceEnabled,
  busyAction,
  onDryRun,
  onApply
}: {
  migrations: {
    pending: number;
    migrations:
      Array<
        Record<string, unknown>
      >;
  };
  maintenanceEnabled:
    boolean;
  busyAction: string | null;
  onDryRun: () => void;
  onApply: () => void;
}) {
  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            ADATMIGRÁCIÓ
          </p>
          <h2>
            Idempotens migrációk
          </h2>
        </div>

        <span className="v5-pending-count">
          {migrations.pending}
          {' függőben'}
        </span>
      </div>

      <div className="v5-migration-list">
        {migrations.migrations.map(
          (
            migration,
            index
          ) => (
            <div
              key={
                String(
                  migration.id ||
                  index
                )
              }
            >
              <Route size={17} />

              <div>
                <strong>
                  {String(
                    migration.id ||
                    'migráció'
                  )}
                </strong>

                <small>
                  {String(
                    migration.description ||
                    ''
                  )}
                </small>
              </div>

              <span
                className={
                  migration.required ===
                    true
                    ? 'bad'
                    : 'ok'
                }
              >
                {migration.required ===
                  true
                  ? 'Szükséges'
                  : 'Rendben'}
              </span>
            </div>
          )
        )}
      </div>

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={
            busyAction !==
            null
          }
          onClick={onDryRun}
        >
          <FlaskConical
            size={17}
          />
          Dry-run
        </button>

        <button
          disabled={
            busyAction !==
              null ||
            migrations.pending ===
              0 ||
            !maintenanceEnabled
          }
          title={
            maintenanceEnabled
              ? ''
              : 'Alkalmazás előtt kapcsold be a karbantartási módot'
          }
          onClick={
            () => {
              if (
                globalThis.confirm(
                  'Alkalmazod a függő migrációkat?'
                )
              ) {
                onApply();
              }
            }
          }
        >
          <Play size={17} />
          Migrációk alkalmazása
        </button>
      </div>
    </section>
  );
}
