/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */
/* OpenAPI verzió: 5.6.1 */

import {
  ApiClientConfiguration,
  ApiClientError,
  ApiRequestOptions
} from './api-v2-types';

function resolveValue(value: string | (() => string | null | undefined) | undefined): string {
  const resolved = typeof value === 'function' ? value() : value;
  return String(resolved || '');
}

function interpolatePath(template: string, parameters: Record<string, string | number> = {}): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = parameters[name];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Hiányzó útvonalparaméter: ${name}`);
    }
    return encodeURIComponent(String(value));
  });
}

export class ApiV2Client {
  private readonly configuration: ApiClientConfiguration;

  constructor(configuration: ApiClientConfiguration = {}) {
    this.configuration = configuration;
  }

  private async request<T>(method: string, route: string, options: ApiRequestOptions = {}): Promise<T> {
    const baseUrl = String(this.configuration.baseUrl || '').replace(/\/$/, '');
    const path = interpolatePath(route, options.path);
    const url = new URL(`${baseUrl}${path}`, globalThis.location?.origin || "http://localhost");

    for (const [name, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(name, String(value));
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
    const bearer = resolveValue(this.configuration.bearerToken);
    const csrf = resolveValue(this.configuration.csrfToken);

    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = csrf;

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body = JSON.stringify(options.body);
    }

    const fetchImplementation = this.configuration.fetchImplementation || fetch;
    const response = await fetchImplementation(url, {
      method,
      headers,
      body,
      credentials: this.configuration.credentials || 'include',
      signal: options.signal
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const error = payload && typeof payload === "object" ? (payload as any).error : null;
      throw new ApiClientError(
        response.status,
        String(error?.code || 'HTTP_ERROR'),
        String(error?.message || response.statusText || 'HTTP hiba'),
        error?.details ?? payload
      );
    }

    return payload as T;
  }

  /** API discovery */
  getRoot<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2", options);
  }

  /** Arduino konzol törlése */
  postArduinoConsoleActionsClear<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/arduino/console/actions/clear", options);
  }

  /** Arduino konzolcache */
  getArduinoConsoleLogs<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/arduino/console/logs", options);
  }

  /** Arduino konzolstatisztika */
  getArduinoConsoleStats<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/arduino/console/stats", options);
  }

  /** Arduino státuszmonitor állapot */
  getArduinoMonitor<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/arduino/monitor", options);
  }

  /** Azonnali Arduino státuszlekérdezés */
  postArduinoMonitorActionsPoll<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/arduino/monitor/actions/poll", options);
  }

  /** Arduino állapot */
  getArduinoStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/arduino/status", options);
  }

  /** Audit napló */
  getAuditRecent<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/audit/recent", options);
  }

  /** Audit állapot */
  getAuditStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/audit/status", options);
  }

  /** CSRF token */
  getAuthCsrf<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/auth/csrf", options);
  }

  /** Bejelentkezés */
  postAuthLogin<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/auth/login", options);
  }

  /** Kijelentkezés */
  postAuthLogout<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/auth/logout", options);
  }

  /** Session állapot */
  getAuthStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/auth/status", options);
  }

  /** Rendszerdiagnosztika */
  getDiagnostics<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/diagnostics", options);
  }

  /** HTML API dokumentáció */
  getDocs<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/docs", options);
  }

  /** Eseménytörténet */
  getEventsRecent<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/events/recent", options);
  }

  /** Eseményrendszer állapot */
  getEventsStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/events/status", options);
  }

  /** Schedule fájllista */
  getFilesSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/files/schedules", options);
  }

  /** Schedule fájl feltöltése */
  postFilesSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/files/schedules", options);
  }

  /** Schedule fájl olvasása */
  getFilesSchedulesByFilename <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/files/schedules/{filename}", options);
  }

  /** Futó firmware-frissítés vagy rollback megszakítása */
  postFirmwareActionsCancel<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/firmware/actions/cancel", options);
  }

  /** Firmware check */
  postFirmwareActionsCheck<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/firmware/actions/check", options);
  }

  /** Korábbi ellenőrzött firmware visszaállítása */
  postFirmwareActionsRollback<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/firmware/actions/rollback", options);
  }

  /** Firmware update */
  postFirmwareActionsUpdate<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/firmware/actions/update", options);
  }

  /** Ellenőrzött firmware backupok listája */
  getFirmwareBackups<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/firmware/backups", options);
  }

  /** Nem aktív firmware backup törlése */
  deleteFirmwareBackupsById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/firmware/backups/{id}", options);
  }

  /** Firmware állapot */
  getFirmwareStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/firmware/status", options);
  }

  /** LED állapotok */
  getLeds<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/leds", options);
  }

  /** LED állapot */
  getLedsById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/leds/{id}", options);
  }

  /** LED vezérlés */
  putLedsById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", "/api/v2/leds/{id}", options);
  }

  /** LED művelet: all-off */
  postLedsActionsAllOff<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/leds/actions/all-off", options);
  }

  /** LED művelet: all-on */
  postLedsActionsAllOn<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/leds/actions/all-on", options);
  }

  /** LED művelet: reset */
  postLedsActionsReset<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/leds/actions/reset", options);
  }

  /** Helyi időzítések */
  getLocalSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/local-schedules", options);
  }

  /** Helyi időzítés létrehozása */
  postLocalSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/local-schedules", options);
  }

  /** Helyi időzítés törlése */
  deleteLocalSchedulesById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/local-schedules/{id}", options);
  }

  /** Helyi időzítés módosítása */
  putLocalSchedulesById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", "/api/v2/local-schedules/{id}", options);
  }

  /** Helyi schedule Arduino sync */
  postLocalSchedulesActionsSyncArduino<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/local-schedules/actions/sync-arduino", options);
  }

  /** Helyi schedule export */
  getLocalSchedulesExport<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/local-schedules/export", options);
  }

  /** Helyi schedule import */
  postLocalSchedulesImport<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/local-schedules/import", options);
  }

  /** Helyi runner állapot */
  getLocalSchedulesRunner<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/local-schedules/runner", options);
  }

  /** Manuális schedule tick */
  postLocalSchedulesRunnerActionsTick<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/local-schedules/runner/actions/tick", options);
  }

  /** HTTP és szolgáltatás metrikák */
  getMetrics<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/metrics", options);
  }

  /** Prometheus 0.0.4 szöveges metrikaexport */
  getMetricsPrometheus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/metrics/prometheus", options);
  }

  /** OpenAPI 3.1 dokumentum */
  getOpenapiJson<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/openapi.json", options);
  }

  /** OpenAPI dokumentum állapota */
  getOpenapiStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/openapi/status", options);
  }

  /** Alpha.2 verziószinkron véglegesítésének jóváhagyása */
  approveAlpha2Finalization<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/release/actions/approve-finalization", options);
  }

  /** Alpha.2 promóció jóváhagyása */
  approveAlpha2Promotion<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/release/actions/approve-promotion", options);
  }

  /** Alpha.2 receipt-lánc ellenőrzése */
  verifyAlpha2Finalization<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/release/actions/verify-finalization", options);
  }

  /** A release-gate szigorú ellenőrzése */
  verifyAlpha2ReleaseGate<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/release/actions/verify-gate", options);
  }

  /** Alpha.2 LXC orchestration ellenőrzése */
  verifyAlpha2LxcOrchestration<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/release/actions/verify-lxc-orchestration", options);
  }

  /** Alpha.2 execution receiptek */
  getAlpha2ExecutionReceipts<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/execution-receipts", options);
  }

  /** Alpha.2 véglegesítési jóváhagyás visszavonása */
  revokeAlpha2FinalizationApproval<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/release/finalization-approval", options);
  }

  /** Alpha.2 véglegesítési readiness */
  getAlpha2FinalizationReadiness<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/finalization-readiness", options);
  }

  /** Alpha.2 LXC artifact index */
  getAlpha2LxcArtifacts<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/lxc-artifacts", options);
  }

  /** Alpha.2 LXC orchestration állapot */
  getAlpha2LxcOrchestration<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/lxc-orchestration", options);
  }

  /** Telepített verziózott release metadata */
  getInstalledReleaseMetadata<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/metadata", options);
  }

  /** Alpha.2 promóciós jóváhagyás visszavonása */
  revokeAlpha2PromotionApproval<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/release/promotion-approval", options);
  }

  /** Alpha.2 promóciós előfeltételek */
  getAlpha2PromotionReadiness<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/promotion-readiness", options);
  }

  /** A legfrissebb alpha.2 release-gate állapota */
  getReleaseGateStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/release/status", options);
  }

  /** Arduino schedule törlése */
  deleteSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/schedules", options);
  }

  /** Arduino schedule áttekintés */
  getSchedules<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules", options);
  }

  /** Schedule generate */
  postSchedulesActionsGenerate<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/schedules/actions/generate", options);
  }

  /** Schedule reload */
  postSchedulesActionsReload<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/schedules/actions/reload", options);
  }

  /** EEPROM schedule sync */
  postSchedulesActionsSync<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/schedules/actions/sync", options);
  }

  /** Schedule teszt */
  postSchedulesActionsTest<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/schedules/actions/test", options);
  }

  /** Schedule nap */
  getSchedulesDaysByDay <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules/days/{day}", options);
  }

  /** Schedule debug */
  getSchedulesDebug<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules/debug", options);
  }

  /** Schedule files */
  getSchedulesFiles<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules/files", options);
  }

  /** Schedule fájl */
  getSchedulesFilesByFilename <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules/files/{filename}", options);
  }

  /** Schedule status */
  getSchedulesStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/schedules/status", options);
  }

  /** Aktuális Arduino célgép */
  getSettingsArduino<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/settings/arduino", options);
  }

  /** Arduino célgép módosítása és mentése */
  putSettingsArduino<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", "/api/v2/settings/arduino", options);
  }

  /** Legacy cutover állapot */
  getSystemCutover<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/cutover", options);
  }

  /** API v2 readiness */
  getSystemHealth<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/health", options);
  }

  /** Karbantartási mód kikapcsolása */
  disableMaintenanceMode<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/system/maintenance", options);
  }

  /** Karbantartási mód állapota */
  getMaintenanceStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/maintenance", options);
  }

  /** Karbantartási mód aktiválása */
  enableMaintenanceMode<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", "/api/v2/system/maintenance", options);
  }

  /** Migrációs állapot */
  getSystemMigrations<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/migrations", options);
  }

  /** Migrációk alkalmazása */
  applySystemMigrations<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/system/migrations/actions/apply", options);
  }

  /** Migrációs dry-run */
  dryRunSystemMigrations<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/system/migrations/actions/dry-run", options);
  }

  /** Konfigurációs preflight */
  getSystemPreflight<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/preflight", options);
  }

  /** Release és runtime információ */
  getSystemRelease<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/release", options);
  }

  /** Rendszer-snapshotok listája */
  listSystemSnapshots<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/snapshots", options);
  }

  /** Rendszer-snapshot létrehozása */
  createSystemSnapshot<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/system/snapshots", options);
  }

  /** Snapshot törlése */
  deleteSystemSnapshot<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/system/snapshots/{id}", options);
  }

  /** Snapshot visszaállítása */
  restoreSystemSnapshot<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/system/snapshots/{id}/actions/restore", options);
  }

  /** Snapshot integritás ellenőrzése */
  verifySystemSnapshot<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/snapshots/{id}/verify", options);
  }

  /** Rendszerállapot */
  getSystemStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/system/status", options);
  }

  /** API-tokenek listázása titkok nélkül */
  getTokens<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/tokens", options);
  }

  /** Új forgatható API-token létrehozása */
  postTokens<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/tokens", options);
  }

  /** Forgatható API-token törlése */
  deleteTokensById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/tokens/{id}", options);
  }

  /** Forgatható API-token módosítása */
  patchTokensById <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PATCH", "/api/v2/tokens/{id}", options);
  }

  /** API-token rotálása és a régi token letiltása */
  postTokensByIdActionsRotate<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/tokens/{id}/actions/rotate", options);
  }

  /** Felhasználók listája */
  getUsers<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/users", options);
  }

  /** Felhasználó létrehozása */
  postUsers<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("POST", "/api/v2/users", options);
  }

  /** Felhasználó törlése */
  deleteUsersByUsername <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", "/api/v2/users/{username}", options);
  }

  /** Felhasználó módosítása */
  patchUsersByUsername <T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PATCH", "/api/v2/users/{username}", options);
  }

  /** Jelszó cseréje */
  putUsersByUsernamePassword<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", "/api/v2/users/{username}/password", options);
  }

  /** Statikus webes réteg állapota */
  getWebStatus<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", "/api/v2/web/status", options);
  }

}
