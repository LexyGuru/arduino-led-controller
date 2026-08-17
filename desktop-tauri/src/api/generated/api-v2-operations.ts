/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */
/* OpenAPI verzió: 5.1.0 */

export const API_V2_OPERATIONS = [
  {
    "id": "getRoot",
    "method": "GET",
    "path": "/api/v2",
    "summary": "API discovery",
    "tags": [
      "System"
    ]
  },
  {
    "id": "postArduinoConsoleActionsClear",
    "method": "POST",
    "path": "/api/v2/arduino/console/actions/clear",
    "summary": "Arduino konzol törlése",
    "tags": [
      "Console"
    ]
  },
  {
    "id": "getArduinoConsoleLogs",
    "method": "GET",
    "path": "/api/v2/arduino/console/logs",
    "summary": "Arduino konzolcache",
    "tags": [
      "Console"
    ]
  },
  {
    "id": "getArduinoConsoleStats",
    "method": "GET",
    "path": "/api/v2/arduino/console/stats",
    "summary": "Arduino konzolstatisztika",
    "tags": [
      "Console"
    ]
  },
  {
    "id": "getArduinoMonitor",
    "method": "GET",
    "path": "/api/v2/arduino/monitor",
    "summary": "Arduino státuszmonitor állapot",
    "tags": [
      "Arduino"
    ]
  },
  {
    "id": "postArduinoMonitorActionsPoll",
    "method": "POST",
    "path": "/api/v2/arduino/monitor/actions/poll",
    "summary": "Azonnali Arduino státuszlekérdezés",
    "tags": [
      "Arduino"
    ]
  },
  {
    "id": "getArduinoStatus",
    "method": "GET",
    "path": "/api/v2/arduino/status",
    "summary": "Arduino állapot",
    "tags": [
      "Arduino"
    ]
  },
  {
    "id": "getAuditRecent",
    "method": "GET",
    "path": "/api/v2/audit/recent",
    "summary": "Audit napló",
    "tags": [
      "Observability"
    ]
  },
  {
    "id": "getAuditStatus",
    "method": "GET",
    "path": "/api/v2/audit/status",
    "summary": "Audit állapot",
    "tags": [
      "Observability"
    ]
  },
  {
    "id": "getAuthCsrf",
    "method": "GET",
    "path": "/api/v2/auth/csrf",
    "summary": "CSRF token",
    "tags": [
      "Auth"
    ]
  },
  {
    "id": "postAuthLogin",
    "method": "POST",
    "path": "/api/v2/auth/login",
    "summary": "Bejelentkezés",
    "tags": [
      "Auth"
    ]
  },
  {
    "id": "postAuthLogout",
    "method": "POST",
    "path": "/api/v2/auth/logout",
    "summary": "Kijelentkezés",
    "tags": [
      "Auth"
    ]
  },
  {
    "id": "getAuthStatus",
    "method": "GET",
    "path": "/api/v2/auth/status",
    "summary": "Session állapot",
    "tags": [
      "Auth"
    ]
  },
  {
    "id": "getDiagnostics",
    "method": "GET",
    "path": "/api/v2/diagnostics",
    "summary": "Rendszerdiagnosztika",
    "tags": [
      "Observability"
    ]
  },
  {
    "id": "getDocs",
    "method": "GET",
    "path": "/api/v2/docs",
    "summary": "HTML API dokumentáció",
    "tags": [
      "System"
    ]
  },
  {
    "id": "getEventsRecent",
    "method": "GET",
    "path": "/api/v2/events/recent",
    "summary": "Eseménytörténet",
    "tags": [
      "Events"
    ]
  },
  {
    "id": "getEventsStatus",
    "method": "GET",
    "path": "/api/v2/events/status",
    "summary": "Eseményrendszer állapot",
    "tags": [
      "Events"
    ]
  },
  {
    "id": "getFilesSchedules",
    "method": "GET",
    "path": "/api/v2/files/schedules",
    "summary": "Schedule fájllista",
    "tags": [
      "Files"
    ]
  },
  {
    "id": "postFilesSchedules",
    "method": "POST",
    "path": "/api/v2/files/schedules",
    "summary": "Schedule fájl feltöltése",
    "tags": [
      "Files"
    ]
  },
  {
    "id": "getFilesSchedulesByFilename ",
    "method": "GET",
    "path": "/api/v2/files/schedules/{filename}",
    "summary": "Schedule fájl olvasása",
    "tags": [
      "Files"
    ]
  },
  {
    "id": "postFirmwareActionsCancel",
    "method": "POST",
    "path": "/api/v2/firmware/actions/cancel",
    "summary": "Futó firmware-frissítés vagy rollback megszakítása",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "postFirmwareActionsCheck",
    "method": "POST",
    "path": "/api/v2/firmware/actions/check",
    "summary": "Firmware check",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "postFirmwareActionsRollback",
    "method": "POST",
    "path": "/api/v2/firmware/actions/rollback",
    "summary": "Korábbi ellenőrzött firmware visszaállítása",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "postFirmwareActionsUpdate",
    "method": "POST",
    "path": "/api/v2/firmware/actions/update",
    "summary": "Firmware update",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "getFirmwareBackups",
    "method": "GET",
    "path": "/api/v2/firmware/backups",
    "summary": "Ellenőrzött firmware backupok listája",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "deleteFirmwareBackupsById ",
    "method": "DELETE",
    "path": "/api/v2/firmware/backups/{id}",
    "summary": "Nem aktív firmware backup törlése",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "getFirmwareStatus",
    "method": "GET",
    "path": "/api/v2/firmware/status",
    "summary": "Firmware állapot",
    "tags": [
      "Firmware"
    ]
  },
  {
    "id": "getLeds",
    "method": "GET",
    "path": "/api/v2/leds",
    "summary": "LED állapotok",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "getLedsById ",
    "method": "GET",
    "path": "/api/v2/leds/{id}",
    "summary": "LED állapot",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "putLedsById ",
    "method": "PUT",
    "path": "/api/v2/leds/{id}",
    "summary": "LED vezérlés",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "postLedsActionsAllOff",
    "method": "POST",
    "path": "/api/v2/leds/actions/all-off",
    "summary": "LED művelet: all-off",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "postLedsActionsAllOn",
    "method": "POST",
    "path": "/api/v2/leds/actions/all-on",
    "summary": "LED művelet: all-on",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "postLedsActionsReset",
    "method": "POST",
    "path": "/api/v2/leds/actions/reset",
    "summary": "LED művelet: reset",
    "tags": [
      "LED"
    ]
  },
  {
    "id": "getLocalSchedules",
    "method": "GET",
    "path": "/api/v2/local-schedules",
    "summary": "Helyi időzítések",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "postLocalSchedules",
    "method": "POST",
    "path": "/api/v2/local-schedules",
    "summary": "Helyi időzítés létrehozása",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "deleteLocalSchedulesById ",
    "method": "DELETE",
    "path": "/api/v2/local-schedules/{id}",
    "summary": "Helyi időzítés törlése",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "putLocalSchedulesById ",
    "method": "PUT",
    "path": "/api/v2/local-schedules/{id}",
    "summary": "Helyi időzítés módosítása",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "postLocalSchedulesActionsSyncArduino",
    "method": "POST",
    "path": "/api/v2/local-schedules/actions/sync-arduino",
    "summary": "Helyi schedule Arduino sync",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "getLocalSchedulesExport",
    "method": "GET",
    "path": "/api/v2/local-schedules/export",
    "summary": "Helyi schedule export",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "postLocalSchedulesImport",
    "method": "POST",
    "path": "/api/v2/local-schedules/import",
    "summary": "Helyi schedule import",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "getLocalSchedulesRunner",
    "method": "GET",
    "path": "/api/v2/local-schedules/runner",
    "summary": "Helyi runner állapot",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "postLocalSchedulesRunnerActionsTick",
    "method": "POST",
    "path": "/api/v2/local-schedules/runner/actions/tick",
    "summary": "Manuális schedule tick",
    "tags": [
      "Local schedules"
    ]
  },
  {
    "id": "getMetrics",
    "method": "GET",
    "path": "/api/v2/metrics",
    "summary": "HTTP és szolgáltatás metrikák",
    "tags": [
      "Observability"
    ]
  },
  {
    "id": "getMetricsPrometheus",
    "method": "GET",
    "path": "/api/v2/metrics/prometheus",
    "summary": "Prometheus 0.0.4 szöveges metrikaexport",
    "tags": [
      "Observability"
    ]
  },
  {
    "id": "getOpenapiJson",
    "method": "GET",
    "path": "/api/v2/openapi.json",
    "summary": "OpenAPI 3.1 dokumentum",
    "tags": [
      "System"
    ]
  },
  {
    "id": "getOpenapiStatus",
    "method": "GET",
    "path": "/api/v2/openapi/status",
    "summary": "OpenAPI dokumentum állapota",
    "tags": [
      "System"
    ]
  },
  {
    "id": "approveAlpha2Finalization",
    "method": "POST",
    "path": "/api/v2/release/actions/approve-finalization",
    "summary": "Alpha.2 verziószinkron véglegesítésének jóváhagyása",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "approveAlpha2Promotion",
    "method": "POST",
    "path": "/api/v2/release/actions/approve-promotion",
    "summary": "Alpha.2 promóció jóváhagyása",
    "tags": []
  },
  {
    "id": "verifyAlpha2Finalization",
    "method": "POST",
    "path": "/api/v2/release/actions/verify-finalization",
    "summary": "Alpha.2 receipt-lánc ellenőrzése",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "verifyAlpha2ReleaseGate",
    "method": "POST",
    "path": "/api/v2/release/actions/verify-gate",
    "summary": "A release-gate szigorú ellenőrzése",
    "tags": []
  },
  {
    "id": "verifyAlpha2LxcOrchestration",
    "method": "POST",
    "path": "/api/v2/release/actions/verify-lxc-orchestration",
    "summary": "Alpha.2 LXC orchestration ellenőrzése",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "getAlpha2ExecutionReceipts",
    "method": "GET",
    "path": "/api/v2/release/execution-receipts",
    "summary": "Alpha.2 execution receiptek",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "revokeAlpha2FinalizationApproval",
    "method": "DELETE",
    "path": "/api/v2/release/finalization-approval",
    "summary": "Alpha.2 véglegesítési jóváhagyás visszavonása",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "getAlpha2FinalizationReadiness",
    "method": "GET",
    "path": "/api/v2/release/finalization-readiness",
    "summary": "Alpha.2 véglegesítési readiness",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "getAlpha2LxcArtifacts",
    "method": "GET",
    "path": "/api/v2/release/lxc-artifacts",
    "summary": "Alpha.2 LXC artifact index",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "getAlpha2LxcOrchestration",
    "method": "GET",
    "path": "/api/v2/release/lxc-orchestration",
    "summary": "Alpha.2 LXC orchestration állapot",
    "tags": [
      "Release"
    ]
  },
  {
    "id": "getInstalledReleaseMetadata",
    "method": "GET",
    "path": "/api/v2/release/metadata",
    "summary": "Telepített verziózott release metadata",
    "tags": []
  },
  {
    "id": "revokeAlpha2PromotionApproval",
    "method": "DELETE",
    "path": "/api/v2/release/promotion-approval",
    "summary": "Alpha.2 promóciós jóváhagyás visszavonása",
    "tags": []
  },
  {
    "id": "getAlpha2PromotionReadiness",
    "method": "GET",
    "path": "/api/v2/release/promotion-readiness",
    "summary": "Alpha.2 promóciós előfeltételek",
    "tags": []
  },
  {
    "id": "getReleaseGateStatus",
    "method": "GET",
    "path": "/api/v2/release/status",
    "summary": "A legfrissebb alpha.2 release-gate állapota",
    "tags": []
  },
  {
    "id": "deleteSchedules",
    "method": "DELETE",
    "path": "/api/v2/schedules",
    "summary": "Arduino schedule törlése",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedules",
    "method": "GET",
    "path": "/api/v2/schedules",
    "summary": "Arduino schedule áttekintés",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "postSchedulesActionsGenerate",
    "method": "POST",
    "path": "/api/v2/schedules/actions/generate",
    "summary": "Schedule generate",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "postSchedulesActionsReload",
    "method": "POST",
    "path": "/api/v2/schedules/actions/reload",
    "summary": "Schedule reload",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "postSchedulesActionsSync",
    "method": "POST",
    "path": "/api/v2/schedules/actions/sync",
    "summary": "EEPROM schedule sync",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "postSchedulesActionsTest",
    "method": "POST",
    "path": "/api/v2/schedules/actions/test",
    "summary": "Schedule teszt",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedulesDaysByDay ",
    "method": "GET",
    "path": "/api/v2/schedules/days/{day}",
    "summary": "Schedule nap",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedulesDebug",
    "method": "GET",
    "path": "/api/v2/schedules/debug",
    "summary": "Schedule debug",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedulesFiles",
    "method": "GET",
    "path": "/api/v2/schedules/files",
    "summary": "Schedule files",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedulesFilesByFilename ",
    "method": "GET",
    "path": "/api/v2/schedules/files/{filename}",
    "summary": "Schedule fájl",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSchedulesStatus",
    "method": "GET",
    "path": "/api/v2/schedules/status",
    "summary": "Schedule status",
    "tags": [
      "Schedules"
    ]
  },
  {
    "id": "getSettingsArduino",
    "method": "GET",
    "path": "/api/v2/settings/arduino",
    "summary": "Aktuális Arduino célgép",
    "tags": [
      "System"
    ]
  },
  {
    "id": "putSettingsArduino",
    "method": "PUT",
    "path": "/api/v2/settings/arduino",
    "summary": "Arduino célgép módosítása és mentése",
    "tags": [
      "System"
    ]
  },
  {
    "id": "getSystemCutover",
    "method": "GET",
    "path": "/api/v2/system/cutover",
    "summary": "Legacy cutover állapot",
    "tags": [
      "Cutover"
    ]
  },
  {
    "id": "getSystemHealth",
    "method": "GET",
    "path": "/api/v2/system/health",
    "summary": "API v2 readiness",
    "tags": [
      "System"
    ]
  },
  {
    "id": "disableMaintenanceMode",
    "method": "DELETE",
    "path": "/api/v2/system/maintenance",
    "summary": "Karbantartási mód kikapcsolása",
    "tags": []
  },
  {
    "id": "getMaintenanceStatus",
    "method": "GET",
    "path": "/api/v2/system/maintenance",
    "summary": "Karbantartási mód állapota",
    "tags": []
  },
  {
    "id": "enableMaintenanceMode",
    "method": "PUT",
    "path": "/api/v2/system/maintenance",
    "summary": "Karbantartási mód aktiválása",
    "tags": []
  },
  {
    "id": "getSystemMigrations",
    "method": "GET",
    "path": "/api/v2/system/migrations",
    "summary": "Migrációs állapot",
    "tags": []
  },
  {
    "id": "applySystemMigrations",
    "method": "POST",
    "path": "/api/v2/system/migrations/actions/apply",
    "summary": "Migrációk alkalmazása",
    "tags": []
  },
  {
    "id": "dryRunSystemMigrations",
    "method": "POST",
    "path": "/api/v2/system/migrations/actions/dry-run",
    "summary": "Migrációs dry-run",
    "tags": []
  },
  {
    "id": "getSystemPreflight",
    "method": "GET",
    "path": "/api/v2/system/preflight",
    "summary": "Konfigurációs preflight",
    "tags": []
  },
  {
    "id": "getSystemRelease",
    "method": "GET",
    "path": "/api/v2/system/release",
    "summary": "Release és runtime információ",
    "tags": []
  },
  {
    "id": "listSystemSnapshots",
    "method": "GET",
    "path": "/api/v2/system/snapshots",
    "summary": "Rendszer-snapshotok listája",
    "tags": []
  },
  {
    "id": "createSystemSnapshot",
    "method": "POST",
    "path": "/api/v2/system/snapshots",
    "summary": "Rendszer-snapshot létrehozása",
    "tags": []
  },
  {
    "id": "deleteSystemSnapshot",
    "method": "DELETE",
    "path": "/api/v2/system/snapshots/{id}",
    "summary": "Snapshot törlése",
    "tags": []
  },
  {
    "id": "restoreSystemSnapshot",
    "method": "POST",
    "path": "/api/v2/system/snapshots/{id}/actions/restore",
    "summary": "Snapshot visszaállítása",
    "tags": []
  },
  {
    "id": "verifySystemSnapshot",
    "method": "GET",
    "path": "/api/v2/system/snapshots/{id}/verify",
    "summary": "Snapshot integritás ellenőrzése",
    "tags": []
  },
  {
    "id": "getSystemStatus",
    "method": "GET",
    "path": "/api/v2/system/status",
    "summary": "Rendszerállapot",
    "tags": [
      "System"
    ]
  },
  {
    "id": "getTokens",
    "method": "GET",
    "path": "/api/v2/tokens",
    "summary": "API-tokenek listázása titkok nélkül",
    "tags": [
      "Tokens"
    ]
  },
  {
    "id": "postTokens",
    "method": "POST",
    "path": "/api/v2/tokens",
    "summary": "Új forgatható API-token létrehozása",
    "tags": [
      "Tokens"
    ]
  },
  {
    "id": "deleteTokensById ",
    "method": "DELETE",
    "path": "/api/v2/tokens/{id}",
    "summary": "Forgatható API-token törlése",
    "tags": [
      "Tokens"
    ]
  },
  {
    "id": "patchTokensById ",
    "method": "PATCH",
    "path": "/api/v2/tokens/{id}",
    "summary": "Forgatható API-token módosítása",
    "tags": [
      "Tokens"
    ]
  },
  {
    "id": "postTokensByIdActionsRotate",
    "method": "POST",
    "path": "/api/v2/tokens/{id}/actions/rotate",
    "summary": "API-token rotálása és a régi token letiltása",
    "tags": [
      "Tokens"
    ]
  },
  {
    "id": "getUsers",
    "method": "GET",
    "path": "/api/v2/users",
    "summary": "Felhasználók listája",
    "tags": [
      "Users"
    ]
  },
  {
    "id": "postUsers",
    "method": "POST",
    "path": "/api/v2/users",
    "summary": "Felhasználó létrehozása",
    "tags": [
      "Users"
    ]
  },
  {
    "id": "deleteUsersByUsername ",
    "method": "DELETE",
    "path": "/api/v2/users/{username}",
    "summary": "Felhasználó törlése",
    "tags": [
      "Users"
    ]
  },
  {
    "id": "patchUsersByUsername ",
    "method": "PATCH",
    "path": "/api/v2/users/{username}",
    "summary": "Felhasználó módosítása",
    "tags": [
      "Users"
    ]
  },
  {
    "id": "putUsersByUsernamePassword",
    "method": "PUT",
    "path": "/api/v2/users/{username}/password",
    "summary": "Jelszó cseréje",
    "tags": [
      "Users"
    ]
  },
  {
    "id": "getWebStatus",
    "method": "GET",
    "path": "/api/v2/web/status",
    "summary": "Statikus webes réteg állapota",
    "tags": [
      "Web"
    ]
  }
] as const;

export type ApiV2Operation = typeof API_V2_OPERATIONS[number];
export type ApiV2OperationId = ApiV2Operation['id'];
