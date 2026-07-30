import {
  AlertTriangle,
  Database,
  Save
} from 'lucide-react';

export function V5ScheduleConflict({
  visible,
  busy,
  onReload,
  onForceSave
}: {
  visible: boolean;
  busy: boolean;
  onReload: () => void;
  onForceSave: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <section className="v5-schedule-conflict">
      <AlertTriangle size={22} />

      <div>
        <strong>
          Az időzítéslista közben megváltozott a V5 szerveren.
        </strong>
        <span>
          Töltsd újra a szerver változatát, vagy tudatosan írd felül
          a saját szerkesztett listáddal.
        </span>
      </div>

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={onReload}
        >
          <Database size={16} />
          Szerverlista betöltése
        </button>

        <button
          className="danger"
          disabled={busy}
          onClick={onForceSave}
        >
          <Save size={16} />
          Tudatos felülírás
        </button>
      </div>
    </section>
  );
}
