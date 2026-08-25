import { I18nText, useI18n } from "../../i18n";
import { BadgeCheck, FileCheck2, GitCommit, Link2, RotateCcw, Server, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../services/v5SystemModels.mjs';
import { V5StatusBadge } from './V5StatusBadge';
function ReceiptRow({ label, icon: Icon, receipt }: {
    label: string;
    icon: typeof Server;
    receipt: {
        present: boolean;
        status: string;
        commit: string;
        finishedAt: string | null;
        evidencePhase: string;
    };
}) {
    return (<div className={`v5-execution-receipt ${receipt.present &&
            receipt.status ===
                'passed'
            ? 'ok'
            : 'missing'}`}>
      <Icon size={18}/>

      <div>
        <strong>
          {label}
        </strong>

        <small>
          {receipt.present
            ? (`${receipt.status} · ${receipt.evidencePhase || '–'} · ${formatDateTime(receipt.finishedAt)}`)
            : <I18nText k="legacyUi.hianyzik.10faa4ec"/>}
        </small>

        {receipt.commit && (<code>
            {receipt.commit}
          </code>)}
      </div>
    </div>);
}
export function V5ReleaseFinalizationPanel({ readiness, busyAction, onVerify, onApprove, onRevoke }: {
    readiness: {
        ready: boolean;
        projectVersion: string;
        targetVersion: string;
        candidateCommit: string;
        reasons: Array<Record<string, unknown>>;
        receipts: {
            staging: Record<string, any>;
            rollback: Record<string, any>;
            promotion: Record<string, any>;
        };
        approval: Record<string, unknown>;
    };
    busyAction: string | null;
    onVerify: () => void;
    onApprove: () => void;
    onRevoke: () => void;
}) {
    const { t } = useI18n();
    const approved = readiness.approval
        ?.present === true;
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.alpha.2.veglegesites.6294e708"/></p>

          <h2>
            Execution receipt-lánc
          </h2>
        </div>

        <V5StatusBadge state={approved
            ? 'ok'
            : (readiness.ready
                ? 'warning'
                : 'error')} label={approved
            ? 'Véglegesítés jóváhagyva'
            : (readiness.ready
                ? 'Verziószinkronra kész'
                : 'Hiányos végrehajtás')}/>
      </div>

      <div className="v5-execution-chain">
        <ReceiptRow label={t("legacyUi.staging.telepites.778cf54e")} icon={Server} receipt={readiness.receipts
            .staging as any}/>

        <Link2 size={18}/>

        <ReceiptRow label={t("legacyUi.rollback.proba.4c99629d")} icon={RotateCcw} receipt={readiness.receipts
            .rollback as any}/>

        <Link2 size={18}/>

        <ReceiptRow label={t("legacyUi.promotion.telepites.87d8f10b")} icon={BadgeCheck} receipt={readiness.receipts
            .promotion as any}/>
      </div>

      <div className="details-grid compact">
        <div>
          <span><I18nText k="legacyUi.forrasverzio.1ed027b0"/></span>
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

        <div className="wide">
          <span><I18nText k="legacyUi.candidate.commit.40a04806"/></span>
          <strong className="v5-inline-code">
            <GitCommit size={15}/>
            <code>
              {readiness.candidateCommit ||
            '–'}
            </code>
          </strong>
        </div>
      </div>

      {readiness.reasons.length >
            0 && (<div className="v5-release-reasons">
          {readiness.reasons.map((reason, index) => (<div key={String(reason.code ||
                    index)}>
                <FileCheck2 size={17}/>

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
          <FileCheck2 size={17}/><I18nText k="legacyUi.receipt.lanc.ellenorzese.f8893272"/></button>

        <button disabled={busyAction !==
            null ||
            !readiness.ready ||
            approved} onClick={() => {
            if (globalThis.confirm('Jóváhagyod az 5.0.0-alpha.2 teljes verziószinkronjának előfeltételeit? Ez még nem módosít fájlokat és nem készít commitot.')) {
                onApprove();
            }
        }}>
          <BadgeCheck size={17}/><I18nText k="legacyUi.veglegesites.jovahagyasa.15e38821"/></button>

        {approved && (<button className="danger" disabled={busyAction !==
                null} onClick={() => {
                if (globalThis.confirm('Visszavonod az alpha.2 véglegesítési jóváhagyást?')) {
                    onRevoke();
                }
            }}>
            <Trash2 size={17}/><I18nText k="legacyUi.jovahagyas.visszavonasa.c8dc5e03"/></button>)}
      </div>

      <div className="v5-release-gate-note">
        <FileCheck2 size={16}/><I18nText k="legacyUi.a.jovahagyas.nem.modosit.verziot.a.kovetkezo.cso.11724ec7"/></div>
    </section>);
}
