import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

import {
  V5StatusBadge
} from './V5StatusBadge';

export function V5PreflightPanel({
  preflight
}: {
  preflight: {
    ready: boolean;
    checks:
      Array<
        Record<string, unknown>
      >;
    summary: {
      total: number;
      passed: number;
      blocking: number;
      warnings: number;
    };
  };
}) {
  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            KONFIGURÁCIÓS PREFLIGHT
          </p>
          <h2>
            Kiadási előellenőrzés
          </h2>
        </div>

        <V5StatusBadge
          state={
            preflight.ready
              ? 'ok'
              : 'error'
          }
          label={
            preflight.ready
              ? 'Készen áll'
              : 'Blokkolt'
          }
        />
      </div>

      <div className="v5-summary-grid">
        <div>
          <CheckCircle2 />
          <span>Sikeres</span>
          <strong>
            {preflight.summary
              .passed}
          </strong>
        </div>

        <div>
          <AlertTriangle />
          <span>Figyelmeztetés</span>
          <strong>
            {preflight.summary
              .warnings}
          </strong>
        </div>

        <div>
          <ShieldAlert />
          <span>Blokkoló</span>
          <strong>
            {preflight.summary
              .blocking}
          </strong>
        </div>
      </div>

      <div className="v5-check-list">
        {preflight.checks.map(
          (
            item,
            index
          ) => (
            <div
              key={
                String(
                  item.name ||
                  index
                )
              }
              className={
                item.ok === true
                  ? 'ok'
                  : (
                      item.severity ===
                        'warning'
                        ? 'warning'
                        : 'error'
                    )
              }
            >
              <span>
                {item.ok ===
                  true
                  ? '✓'
                  : '!'}
              </span>

              <div>
                <strong>
                  {String(
                    item.name ||
                    'ellenőrzés'
                  )}
                </strong>

                {item.code && (
                  <small>
                    {String(
                      item.code
                    )}
                  </small>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
