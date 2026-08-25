import { I18nText } from "../../i18n";
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { V5StatusBadge } from './V5StatusBadge';
export function V5PreflightPanel({ preflight }: {
    preflight: {
        ready: boolean;
        checks: Array<Record<string, unknown>>;
        summary: {
            total: number;
            passed: number;
            blocking: number;
            warnings: number;
        };
    };
}) {
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.konfiguracios.preflight.bd311dbc"/></p>
          <h2><I18nText k="legacyUi.kiadasi.eloellenorzes.01b009b7"/></h2>
        </div>

        <V5StatusBadge state={preflight.ready
            ? 'ok'
            : 'error'} label={preflight.ready
            ? 'Készen áll'
            : 'Blokkolt'}/>
      </div>

      <div className="v5-summary-grid">
        <div>
          <CheckCircle2 />
          <span><I18nText k="beta3.ota2.stage.success"/></span>
          <strong>
            {preflight.summary
            .passed}
          </strong>
        </div>

        <div>
          <AlertTriangle />
          <span><I18nText k="appearance.custom.color.warning"/></span>
          <strong>
            {preflight.summary
            .warnings}
          </strong>
        </div>

        <div>
          <ShieldAlert />
          <span><I18nText k="legacyUi.blokkolo.7c5a4183"/></span>
          <strong>
            {preflight.summary
            .blocking}
          </strong>
        </div>
      </div>

      <div className="v5-check-list">
        {preflight.checks.map((item, index) => {
            const code = item.code === null ||
                item.code === undefined
                ? null
                : String(item.code);
            return (<div key={String(item.name ||
                    index)} className={item.ok === true
                    ? 'ok'
                    : (item.severity ===
                        'warning'
                        ? 'warning'
                        : 'error')}>
                <span>
                  {item.ok ===
                    true
                    ? '✓'
                    : '!'}
                </span>

                <div>
                  <strong>
                    {String(item.name ||
                    'ellenőrzés')}
                  </strong>

                  {code !== null && (<small>
                      {code}
                    </small>)}
                </div>
              </div>);
        })}
      </div>
    </section>);
}
