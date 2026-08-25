import { I18nText } from "../../i18n";
import { RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../services/v5SystemModels.mjs';
import type { FirmwareBackupView } from '../../services/v5FirmwareModels.mjs';
function formatBytes(value: number) {
    if (value < 1024) {
        return `${value} B`;
    }
    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KiB`;
    }
    return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}
export function V5FirmwareBackups({ backups, busy, apiAvailable, onRollback, onDelete }: {
    backups: FirmwareBackupView[];
    busy: boolean;
    apiAvailable: boolean;
    onRollback: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (<section className="panel v5-firmware-backups">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.firmware.backupok.1ef4cf91"/></p>
          <h2><I18nText k="legacyUi.visszaallitasi.pontok.02863a00"/></h2>
        </div>

        <ShieldCheck />
      </div>

      {!apiAvailable && (<p className="console-warning"><I18nText k="legacyUi.a.backup.es.rollback.funkciokhoz.hitelesitett.ap.17719984"/></p>)}

      <div className="v5-backup-list">
        {backups.length === 0 ? (<p className="muted"><I18nText k="legacyUi.meg.nincs.firmware.backup.a90bf76b"/></p>) : (backups.map((backup) => (<article key={backup.id} className={backup.lastKnownGood
                ? 'last-known-good'
                : ''}>
              <div>
                <strong>
                  {backup.installedVersion ||
                backup.artifact?.firmwareVersion ||
                backup.fileName ||
                backup.id}
                </strong>

                <small>
                  {formatDateTime(backup.createdAt)}
                  {' · '}
                  {formatBytes(backup.size)}
                </small>

                <code>
                  {backup.sha256
                ? `${backup.sha256.slice(0, 20)}…`
                : backup.id}
                </code>
              </div>

              {backup.lastKnownGood && (<span className="v5-lkg">
                  Last known good
                </span>)}

              <div className="v5-row-actions">
                <button className="secondary" disabled={busy || !apiAvailable} onClick={() => {
                if (globalThis.confirm('Biztosan visszaállítod ezt a firmware backupot?')) {
                    onRollback(backup.id);
                }
            }}>
                  <RotateCcw size={16}/>
                </button>

                <button className="danger" disabled={busy ||
                !apiAvailable ||
                backup.lastKnownGood} title={backup.lastKnownGood
                ? 'Az utolsó működő backup védett'
                : 'Backup törlése'} onClick={() => {
                if (globalThis.confirm('Biztosan törlöd ezt a firmware backupot?')) {
                    onDelete(backup.id);
                }
            }}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </article>)))}
      </div>
    </section>);
}
