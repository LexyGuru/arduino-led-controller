import { I18nText } from "../../i18n";
import { BadgeCheck, FileCheck2, GitCommit, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../services/v5SystemModels.mjs';
import { V5StatusBadge } from './V5StatusBadge';
export function V5ReleaseGatePanel({ readiness, busyAction, onVerify, onApprove, onRevoke }: {
    readiness: {
        ready: boolean;
        targetVersion: string;
        projectVersion: string;
        candidateCommit: string;
        reasons: Array<Record<string, unknown>>;
        approval: Record<string, unknown>;
        gate: {
            passed: boolean;
            report: Record<string, unknown> | null;
            finishedAt: string | null;
        };
    };
    busyAction: string | null;
    onVerify: () => void;
    onApprove: () => void;
    onRevoke: () => void;
}) {
    const approved = readiness.approval
        ?.present === true;
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.alpha.2.release.gate.8e800aee"/></p>

          <h2><I18nText k="legacyUi.kiadasi.promocio.1db6222b"/></h2>
        </div>

        <V5StatusBadge state={approved
            ? 'ok'
            : (readiness.ready
                ? 'warning'
                : 'error')} label={approved
            ? 'Jóváhagyva'
            : (readiness.ready
                ? 'Jóváhagyható'
                : 'Blokkolt')}/>
      </div>

      <div className="details-grid compact">
        <div>
          <span><I18nText k="legacyUi.jelenlegi.verzio.ec0e9962"/></span>
          <strong>
            {readiness.projectVersion ||
            '–'}
          </strong>
        </div>

        <div>
          <span><I18nText k="legacyUi.celverzio.d0935367"/></span>
          <strong>
            {readiness.targetVersion}
          </strong>
        </div>

        <div>
          <span>
            Gate
          </span>
          <strong>
            {readiness.gate.passed
            ? 'passed'
            : <I18nText k="legacyUi.nincs.hibas.d780f217"/>}
          </strong>
        </div>

        <div>
          <span><I18nText k="legacyUi.gate.idopont.d71fd048"/></span>
          <strong>
            {formatDateTime(readiness.gate
            .finishedAt)}
          </strong>
        </div>
      </div>

      <div className="v5-release-gate-commit">
        <GitCommit size={16}/>
        <code>
          {readiness.candidateCommit || <I18nText k="legacyUi.nincs.candidate.commit.331f7ebb"/>}
        </code>
      </div>

      {readiness.reasons.length >
            0 && (<div className="v5-release-reasons">
          {readiness.reasons.map((reason, index) => (<div key={String(reason.code ||
                    index)}>
                <ShieldAlert size={17}/>

                <div>
                  <strong>
                    {String(reason.code ||
                    'BLOCKED')}
                  </strong>

                  <span>
                    {String(reason.message ||
                    '')}
                  </span>
                </div>
              </div>))}
        </div>)}

      <div className="v5-actions">
        <button className="secondary" disabled={busyAction !==
            null} onClick={onVerify}>
          <FileCheck2 size={17}/><I18nText k="legacyUi.gate.ellenorzese.6be34df3"/></button>

        <button disabled={busyAction !==
            null ||
            !readiness.ready ||
            approved} onClick={() => {
            if (globalThis.confirm('Jóváhagyod az 5.0.0-alpha.2 promóció előkészítését? Ez még nem módosít verziót és nem készít Git commitot.')) {
                onApprove();
            }
        }}>
          <BadgeCheck size={17}/><I18nText k="legacyUi.promocio.jovahagyasa.2b0ee442"/></button>

        {approved && (<button className="danger" disabled={busyAction !==
                null} onClick={() => {
                if (globalThis.confirm('Visszavonod az alpha.2 promóciós jóváhagyást?')) {
                    onRevoke();
                }
            }}>
            <Trash2 size={17}/><I18nText k="legacyUi.jovahagyas.visszavonasa.c8dc5e03"/></button>)}
      </div>

      <div className="v5-release-gate-note">
        <ShieldCheck size={16}/><I18nText k="legacyUi.a.jovahagyas.nem.emel.verziot.es.nem.pushol.a.ko.19f23399"/></div>
    </section>);
}
