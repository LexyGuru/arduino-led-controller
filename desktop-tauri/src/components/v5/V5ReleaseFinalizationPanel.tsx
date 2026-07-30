import {
  BadgeCheck,
  FileCheck2,
  GitCommit,
  Link2,
  RotateCcw,
  Server,
  Trash2
} from 'lucide-react';

import {
  formatDateTime
} from '../../services/v5SystemModels.mjs';

import {
  V5StatusBadge
} from './V5StatusBadge';

function ReceiptRow({
  label,
  icon:
    Icon,
  receipt
}: {
  label: string;
  icon: typeof Server;
  receipt: {
    present: boolean;
    status: string;
    commit: string;
    finishedAt:
      string |
      null;
    evidencePhase: string;
  };
}) {
  return (
    <div
      className={
        `v5-execution-receipt ${
          receipt.present &&
          receipt.status ===
            'passed'
            ? 'ok'
            : 'missing'
        }`
      }
    >
      <Icon size={18} />

      <div>
        <strong>
          {label}
        </strong>

        <small>
          {receipt.present
            ? (
                `${receipt.status} · ${receipt.evidencePhase || '–'} · ${formatDateTime(
                  receipt.finishedAt
                )}`
              )
            : 'Hiányzik'}
        </small>

        {receipt.commit && (
          <code>
            {receipt.commit}
          </code>
        )}
      </div>
    </div>
  );
}

export function V5ReleaseFinalizationPanel({
  readiness,
  busyAction,
  onVerify,
  onApprove,
  onRevoke
}: {
  readiness: {
    ready: boolean;
    projectVersion: string;
    targetVersion: string;
    candidateCommit: string;
    reasons:
      Array<
        Record<string, unknown>
      >;
    receipts: {
      staging:
        Record<string, any>;
      rollback:
        Record<string, any>;
      promotion:
        Record<string, any>;
    };
    approval:
      Record<string, unknown>;
  };
  busyAction:
    string |
    null;
  onVerify:
    () => void;
  onApprove:
    () => void;
  onRevoke:
    () => void;
}) {
  const approved =
    readiness.approval
      ?.present === true;

  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            ALPHA.2 VÉGLEGESÍTÉS
          </p>

          <h2>
            Execution receipt-lánc
          </h2>
        </div>

        <V5StatusBadge
          state={
            approved
              ? 'ok'
              : (
                  readiness.ready
                    ? 'warning'
                    : 'error'
                )
          }
          label={
            approved
              ? 'Véglegesítés jóváhagyva'
              : (
                  readiness.ready
                    ? 'Verziószinkronra kész'
                    : 'Hiányos végrehajtás'
                )
          }
        />
      </div>

      <div className="v5-execution-chain">
        <ReceiptRow
          label="Staging telepítés"
          icon={Server}
          receipt={
            readiness.receipts
              .staging as any
          }
        />

        <Link2 size={18} />

        <ReceiptRow
          label="Rollback-próba"
          icon={RotateCcw}
          receipt={
            readiness.receipts
              .rollback as any
          }
        />

        <Link2 size={18} />

        <ReceiptRow
          label="Promotion telepítés"
          icon={BadgeCheck}
          receipt={
            readiness.receipts
              .promotion as any
          }
        />
      </div>

      <div className="details-grid compact">
        <div>
          <span>
            Forrásverzió
          </span>
          <strong>
            {readiness.projectVersion ||
            '–'}
          </strong>
        </div>

        <div>
          <span>
            Célverzió
          </span>
          <strong>
            {readiness.targetVersion}
          </strong>
        </div>

        <div className="wide">
          <span>
            Candidate commit
          </span>
          <strong className="v5-inline-code">
            <GitCommit size={15} />
            <code>
              {readiness.candidateCommit ||
              '–'}
            </code>
          </strong>
        </div>
      </div>

      {readiness.reasons.length >
      0 && (
        <div className="v5-release-reasons">
          {readiness.reasons.map(
            (
              reason,
              index
            ) => (
              <div
                key={
                  String(
                    reason.code ||
                    index
                  )
                }
              >
                <FileCheck2
                  size={17}
                />

                <div>
                  <strong>
                    {String(
                      reason.code ||
                      'BLOCKED'
                    )}
                  </strong>

                  <span>
                    {String(
                      reason.message ||
                      ''
                    )}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={
            busyAction !==
            null
          }
          onClick={onVerify}
        >
          <FileCheck2 size={17} />
          Receipt-lánc ellenőrzése
        </button>

        <button
          disabled={
            busyAction !==
              null ||
            !readiness.ready ||
            approved
          }
          onClick={
            () => {
              if (
                globalThis.confirm(
                  'Jóváhagyod az 5.0.0-alpha.2 teljes verziószinkronjának előfeltételeit? Ez még nem módosít fájlokat és nem készít commitot.'
                )
              ) {
                onApprove();
              }
            }
          }
        >
          <BadgeCheck size={17} />
          Véglegesítés jóváhagyása
        </button>

        {approved && (
          <button
            className="danger"
            disabled={
              busyAction !==
              null
            }
            onClick={
              () => {
                if (
                  globalThis.confirm(
                    'Visszavonod az alpha.2 véglegesítési jóváhagyást?'
                  )
                ) {
                  onRevoke();
                }
              }
            }
          >
            <Trash2 size={17} />
            Jóváhagyás visszavonása
          </button>
        )}
      </div>

      <div className="v5-release-gate-note">
        <FileCheck2 size={16} />
        A jóváhagyás nem módosít verziót. A következő csomag végzi majd a
        teljes, bizonyítékhoz kötött 5.0.0-alpha.2 verziószinkront.
      </div>
    </section>
  );
}
