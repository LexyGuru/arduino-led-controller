import {
  Archive,
  CheckCircle2,
  Circle,
  GitCommit,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';

import {
  formatDateTime
} from '../../services/v5SystemModels.mjs';

import {
  V5StatusBadge
} from './V5StatusBadge';

function PhaseIcon({
  status
}: {
  status: string;
}) {
  if (
    status ===
      'passed'
  ) {
    return (
      <CheckCircle2
        size={18}
      />
    );
  }

  if (
    status ===
      'running'
  ) {
    return (
      <LoaderCircle
        size={18}
        className="spin"
      />
    );
  }

  if (
    status ===
      'failed'
  ) {
    return (
      <TriangleAlert
        size={18}
      />
    );
  }

  return (
    <Circle
      size={18}
    />
  );
}

const labels:
  Record<string, string> = {
    preflight:
      'LXC preflight',
    gate:
      'Izolált release-gate',
    'staging-bundle':
      'Staging bundle',
    'staging-deployment':
      'Staging telepítés',
    'rollback-rehearsal':
      'Rollback-próba',
    'promotion-bundle':
      'Promotion bundle',
    'promotion-deployment':
      'Promotion telepítés',
    'receipt-verification':
      'Receipt-lánc',
    'artifact-collection':
      'Artifactgyűjtés'
  };

export function V5LxcOrchestrationPanel({
  orchestration,
  busyAction,
  onRefresh,
  onVerify
}: {
  orchestration: {
    present: boolean;
    status: string;
    currentPhase: string;
    candidateRef: string;
    candidateCommit: string;
    baselineBranch: string;
    baselineCommit: string;
    readyForPromotion: boolean;
    readyForFinalization: boolean;
    guardPassed: boolean;
    phases:
      Array<{
        name: string;
        status: string;
        message: string;
        startedAt:
          string |
          null;
        finishedAt:
          string |
          null;
      }>;
    lastError:
      Record<string, unknown> |
      null;
    artifacts:
      Record<string, unknown>;
  };
  busyAction:
    string |
    null;
  onRefresh:
    () => void;
  onVerify:
    () => void;
}) {
  const state =
    orchestration
      .readyForFinalization
      ? 'ok'
      : (
          orchestration
            .readyForPromotion
            ? 'warning'
            : (
                orchestration
                  .status ===
                  'failed'
                  ? 'error'
                  : 'warning'
              )
        );

  const label =
    orchestration
      .readyForFinalization
      ? 'Véglegesítésre kész'
      : (
          orchestration
            .readyForPromotion
            ? 'Promócióra vár'
            : (
                orchestration
                  .present
                  ? orchestration
                      .status
                  : 'Még nem futott'
              )
        );

  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            VALÓDI LXC VÉGREHAJTÁS
          </p>

          <h2>
            Alpha.2 orchestration
          </h2>
        </div>

        <V5StatusBadge
          state={state}
          label={label}
        />
      </div>

      <div className="details-grid compact">
        <div>
          <span>
            Produkciós baseline
          </span>
          <strong>
            {orchestration
              .baselineBranch ||
            '–'}
          </strong>
          <code>
            {orchestration
              .baselineCommit ||
            '–'}
          </code>
        </div>

        <div>
          <span>
            Candidate
          </span>
          <strong>
            {orchestration
              .candidateRef ||
            '–'}
          </strong>
          <code>
            {orchestration
              .candidateCommit ||
            '–'}
          </code>
        </div>

        <div>
          <span>
            Produkciós őr
          </span>
          <strong
            className={
              orchestration
                .guardPassed
                ? 'ok'
                : 'bad'
            }
          >
            <ShieldCheck
              size={15}
            />
            {orchestration
              .guardPassed
              ? 'Változatlan'
              : 'Nincs igazolva'}
          </strong>
        </div>

        <div>
          <span>
            Aktuális fázis
          </span>
          <strong>
            {labels[
              orchestration
                .currentPhase
            ] ||
            orchestration
              .currentPhase ||
            '–'}
          </strong>
        </div>
      </div>

      <div className="v5-orchestration-timeline">
        {orchestration.phases.map(
          (phase) => (
            <div
              className={
                `v5-orchestration-phase ${phase.status}`
              }
              key={phase.name}
            >
              <PhaseIcon
                status={
                  phase.status
                }
              />

              <div>
                <strong>
                  {labels[
                    phase.name
                  ] ||
                  phase.name}
                </strong>

                <small>
                  {phase.message ||
                  phase.status}
                </small>

                {(phase.finishedAt ||
                  phase.startedAt) && (
                  <span>
                    {formatDateTime(
                      phase.finishedAt ||
                      phase.startedAt
                    )}
                  </span>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {orchestration.lastError && (
        <div className="v5-release-reasons">
          <div>
            <TriangleAlert
              size={17}
            />

            <div>
              <strong>
                {String(
                  orchestration
                    .lastError
                    .code ||
                  'ORCHESTRATION_FAILED'
                )}
              </strong>

              <span>
                {String(
                  orchestration
                    .lastError
                    .message ||
                  ''
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={
            busyAction !==
            null
          }
          onClick={onRefresh}
        >
          <RefreshCw
            size={17}
          />
          Állapot frissítése
        </button>

        <button
          disabled={
            busyAction !==
              null ||
            !orchestration
              .present
          }
          onClick={onVerify}
        >
          <Server size={17} />
          LXC lánc ellenőrzése
        </button>
      </div>

      <div className="v5-release-gate-note">
        <Archive size={16} />
        A promóció csak külön approval fájllal és az
        EXECUTE_ALPHA2_PROMOTION megerősítéssel indítható.
      </div>

      <div className="v5-inline-code">
        <GitCommit size={15} />
        <code>
          {orchestration
            .candidateCommit ||
          'candidate commit még nincs'}
        </code>
      </div>
    </section>
  );
}
