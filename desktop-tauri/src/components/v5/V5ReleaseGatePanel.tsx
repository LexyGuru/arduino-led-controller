import {
  BadgeCheck,
  FileCheck2,
  GitCommit,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from 'lucide-react';

import {
  formatDateTime
} from '../../services/v5SystemModels.mjs';

import {
  V5StatusBadge
} from './V5StatusBadge';

export function V5ReleaseGatePanel({
  readiness,
  busyAction,
  onVerify,
  onApprove,
  onRevoke
}: {
  readiness: {
    ready: boolean;
    targetVersion: string;
    projectVersion: string;
    candidateCommit: string;
    reasons:
      Array<
        Record<string, unknown>
      >;
    approval:
      Record<string, unknown>;
    gate: {
      passed: boolean;
      report:
        | Record<string, unknown>
        | null;
      finishedAt:
        string |
        null;
    };
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
            ALPHA.2 RELEASE-GATE
          </p>

          <h2>
            Kiadási promóció
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
              ? 'Jóváhagyva'
              : (
                  readiness.ready
                    ? 'Jóváhagyható'
                    : 'Blokkolt'
                )
          }
        />
      </div>

      <div className="details-grid compact">
        <div>
          <span>
            Jelenlegi verzió
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

        <div>
          <span>
            Gate
          </span>
          <strong>
            {readiness.gate.passed
              ? 'passed'
              : 'nincs / hibás'}
          </strong>
        </div>

        <div>
          <span>
            Gate időpont
          </span>
          <strong>
            {formatDateTime(
              readiness.gate
                .finishedAt
            )}
          </strong>
        </div>
      </div>

      <div className="v5-release-gate-commit">
        <GitCommit size={16} />
        <code>
          {readiness.candidateCommit ||
          'nincs candidate commit'}
        </code>
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
                <ShieldAlert
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
          <FileCheck2
            size={17}
          />
          Gate ellenőrzése
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
                  'Jóváhagyod az 5.0.0-alpha.2 promóció előkészítését? Ez még nem módosít verziót és nem készít Git commitot.'
                )
              ) {
                onApprove();
              }
            }
          }
        >
          <BadgeCheck
            size={17}
          />
          Promóció jóváhagyása
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
                    'Visszavonod az alpha.2 promóciós jóváhagyást?'
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
        <ShieldCheck size={16} />
        A jóváhagyás nem emel verziót és nem pushol.
        A közvetlen alpha.2 verziószinkron csak a gate után következik.
      </div>
    </section>
  );
}
