import {
  Archive,
  CheckCircle2,
  RotateCcw,
  Trash2
} from 'lucide-react';

import {
  useState
} from 'react';

import {
  formatDateTime
} from '../../services/v5SystemModels.mjs';

export function V5SnapshotPanel({
  snapshots,
  maintenanceEnabled,
  busyAction,
  onCreate,
  onVerify,
  onRestore,
  onDelete
}: {
  snapshots:
    Array<{
      id: string;
      label: string;
      createdAt: string | null;
      createdBy: string | null;
      files: number;
    }>;
  maintenanceEnabled:
    boolean;
  busyAction: string | null;
  onCreate:
    (
      label: string
    ) => void;
  onVerify:
    (
      id: string
    ) => void;
  onRestore:
    (
      id: string
    ) => void;
  onDelete:
    (
      id: string
    ) => void;
}) {
  const [
    label,
    setLabel
  ] =
    useState(
      'kézi-snapshot'
    );

  return (
    <section className="panel v5-panel v5-snapshot-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            BIZTONSÁGI MENTÉS
          </p>
          <h2>
            Rendszer-snapshotok
          </h2>
        </div>

        <Archive />
      </div>

      <div className="v5-inline-create">
        <input
          value={label}
          onChange={
            (event) =>
              setLabel(
                event.target.value
              )
          }
          placeholder="Snapshot címke"
        />

        <button
          disabled={
            busyAction !==
              null
          }
          onClick={
            () =>
              onCreate(label)
          }
        >
          <Archive size={17} />
          Snapshot készítése
        </button>
      </div>

      <div className="v5-snapshot-list">
        {snapshots.length ===
        0 ? (
          <div className="empty">
            Még nincs rendszer-snapshot.
          </div>
        ) : (
          snapshots.map(
            (snapshot) => (
              <article
                key={
                  snapshot.id
                }
                className="v5-snapshot-row"
              >
                <div>
                  <strong>
                    {snapshot.label ||
                    snapshot.id}
                  </strong>

                  <small>
                    {formatDateTime(
                      snapshot.createdAt
                    )}
                    {' · '}
                    {snapshot.files}
                    {' fájl · '}
                    {snapshot.createdBy ||
                    'system'}
                  </small>

                  <code>
                    {snapshot.id}
                  </code>
                </div>

                <div className="v5-row-actions">
                  <button
                    className="secondary"
                    title="Integritás ellenőrzése"
                    disabled={
                      busyAction !==
                      null
                    }
                    onClick={
                      () =>
                        onVerify(
                          snapshot.id
                        )
                    }
                  >
                    <CheckCircle2
                      size={16}
                    />
                  </button>

                  <button
                    className="secondary"
                    title={
                      maintenanceEnabled
                        ? 'Snapshot visszaállítása'
                        : 'Restore csak maintenance módban'
                    }
                    disabled={
                      busyAction !==
                        null ||
                      !maintenanceEnabled
                    }
                    onClick={
                      () => {
                        if (
                          globalThis.confirm(
                            'Biztosan visszaállítod ezt a snapshotot? A szervert utána újra kell indítani.'
                          )
                        ) {
                          onRestore(
                            snapshot.id
                          );
                        }
                      }
                    }
                  >
                    <RotateCcw
                      size={16}
                    />
                  </button>

                  <button
                    className="danger"
                    title="Snapshot törlése"
                    disabled={
                      busyAction !==
                      null
                    }
                    onClick={
                      () => {
                        if (
                          globalThis.confirm(
                            'Biztosan törlöd ezt a snapshotot?'
                          )
                        ) {
                          onDelete(
                            snapshot.id
                          );
                        }
                      }
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            )
          )
        )}
      </div>
    </section>
  );
}
