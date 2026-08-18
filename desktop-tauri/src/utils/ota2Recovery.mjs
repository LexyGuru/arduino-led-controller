import { withBoundedReadRetry } from "./ota2Resilience.mjs";

export function createOta2RecoveryCoordinator({
  loadSchedules,
  createScheduleBackup,
  retry = withBoundedReadRetry,
} = {}) {
  return Object.freeze({
    async prepare() {
      if (typeof loadSchedules !== "function" || typeof createScheduleBackup !== "function") {
        throw new Error("OTA2_BACKUP_API_MISSING");
      }
      const snapshot = await retry(
        () => loadSchedules(),
        { attempts: 3, baseDelayMs: 150 },
      );
      if (!snapshot || !Array.isArray(snapshot.schedules)) {
        throw new Error("OTA2_BACKUP_SNAPSHOT_INVALID");
      }
      const backup = await createScheduleBackup(
        snapshot.schedules,
        Number.isFinite(Number(snapshot.revision)) ? Number(snapshot.revision) : null,
        String(snapshot.checksum ?? ""),
      );
      return Object.freeze({
        backupId: String(backup?.id ?? ""),
        count: Number(backup?.count ?? snapshot.schedules.length),
        revision: backup?.revision ?? snapshot.revision ?? null,
        checksum: String(backup?.checksum ?? snapshot.checksum ?? ""),
      });
    },
  });
}
