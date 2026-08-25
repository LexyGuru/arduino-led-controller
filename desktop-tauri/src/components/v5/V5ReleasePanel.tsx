import { I18nText } from "../../i18n";
import { Boxes, GitCommit, ShieldCheck } from 'lucide-react';
import { formatDateTime } from '../../services/v5SystemModels.mjs';
import { V5StatusBadge } from './V5StatusBadge';
export function V5ReleasePanel({ release }: {
    release: {
        service: string;
        version: string;
        environment: string;
        lifecycle: string;
        maintenance: boolean;
        migrationPending: number;
        channel: string;
        candidate: string;
        commit: string;
        builtAt: string;
        openApiSha256: string;
    };
}) {
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.release.es.runtime.c3940e9f"/></p>
          <h2>
            {release.service}
          </h2>
        </div>

        <V5StatusBadge state={release.lifecycle ===
            'ready' &&
            !release.maintenance &&
            release.migrationPending ===
                0
            ? 'ok'
            : 'warning'} label={release.lifecycle}/>
      </div>

      <div className="details-grid compact">
        <div>
          <span><I18nText k="legacyUi.verzio.5928482b"/></span>
          <strong>
            {release.version}
          </strong>
        </div>

        <div>
          <span><I18nText k="beta3.update.channel"/></span>
          <strong>
            {release.channel}
            {release.candidate
            ? ` / ${release.candidate}`
            : ''}
          </strong>
        </div>

        <div>
          <span><I18nText k="legacyUi.kornyezet.09c4bbd4"/></span>
          <strong>
            {release.environment}
          </strong>
        </div>

        <div>
          <span><I18nText k="legacyUi.fuggo.migracio.b4e74a50"/></span>
          <strong>
            {release.migrationPending}
          </strong>
        </div>
      </div>

      <div className="v5-release-details">
        <span>
          <GitCommit size={15}/>
          Commit:
          <code>
            {release.commit || <I18nText k="legacyUi.nincs.megadva.c0d43288"/>}
          </code>
        </span>

        <span>
          <Boxes size={15}/>
          Build:
          {formatDateTime(release.builtAt)}
        </span>

        <span>
          <ShieldCheck size={15}/>
          OpenAPI:
          <code>
            {release.openApiSha256
            ? `${release.openApiSha256.slice(0, 16)}…`
            : <I18nText k="legacyUi.nincs.hash.904b7932"/>}
          </code>
        </span>
      </div>
    </section>);
}
