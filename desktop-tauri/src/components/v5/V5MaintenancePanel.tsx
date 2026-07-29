import {
  Power,
  ShieldOff,
  Wrench
} from 'lucide-react';

import {
  useState
} from 'react';

import {
  formatDateTime
} from '../../services/v5SystemModels.mjs';

import {
  V5StatusBadge
} from './V5StatusBadge';

export function V5MaintenancePanel({
  maintenance,
  busyAction,
  onEnable,
  onDisable
}: {
  maintenance: {
    enabled: boolean;
    reason: string | null;
    enabledAt: string | null;
    enabledBy: string | null;
  };
  busyAction: string | null;
  onEnable:
    (
      reason: string
    ) => void;
  onDisable:
    () => void;
}) {
  const [
    reason,
    setReason
  ] =
    useState(
      'Tervezett rendszerkarbantartás.'
    );

  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            ÍRÁSVÉDELEM
          </p>
          <h2>
            Karbantartási mód
          </h2>
        </div>

        <V5StatusBadge
          state={
            maintenance.enabled
              ? 'warning'
              : 'ok'
          }
          label={
            maintenance.enabled
              ? 'Aktív'
              : 'Kikapcsolva'
          }
        />
      </div>

      {maintenance.enabled ? (
        <div className="v5-maintenance-active">
          <Wrench size={28} />

          <div>
            <strong>
              A módosító API-k blokkolva vannak.
            </strong>

            <p>
              {maintenance.reason}
            </p>

            <small>
              Aktiválta:
              {' '}
              {maintenance.enabledBy ||
              'system'}
              {' · '}
              {formatDateTime(
                maintenance.enabledAt
              )}
            </small>
          </div>

          <button
            className="danger"
            disabled={
              busyAction !==
              null
            }
            onClick={onDisable}
          >
            <Power size={17} />
            Kikapcsolás
          </button>
        </div>
      ) : (
        <>
          <label>
            Karbantartás oka
            <input
              value={reason}
              onChange={
                (event) =>
                  setReason(
                    event.target.value
                  )
              }
            />
          </label>

          <button
            className="secondary"
            disabled={
              busyAction !==
                null ||
              !reason.trim()
            }
            onClick={
              () =>
                onEnable(
                  reason
                )
            }
          >
            <ShieldOff size={17} />
            Karbantartási mód aktiválása
          </button>
        </>
      )}
    </section>
  );
}
