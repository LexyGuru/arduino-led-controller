export type AuthMode =
  'session' |
  'bearer';

export interface ServerProfile {
  id: string;
  label: string;
  baseUrl: string;
  authMode: AuthMode;
}

export interface ConnectivitySnapshot {
  status:
    | 'idle'
    | 'checking'
    | 'online'
    | 'offline'
    | 'reconnecting';
  online: boolean | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: {
    name: string;
    code: string | null;
    message: string;
  } | null;
}

export interface CredentialVault {
  getBearerToken():
    Promise<string | null>;
  setBearerToken(
    value: string
  ): Promise<string | null>;
  clearBearerToken():
    Promise<void>;
  clear():
    Promise<void>;
  snapshot():
    Record<string, unknown>;
}

export class DesktopApiRuntimeError
  extends Error {
  readonly code: string;
  readonly details: unknown;
}

export class VolatileCredentialVault
  implements CredentialVault {
  getBearerToken():
    Promise<string | null>;
  setBearerToken(
    value: string
  ): Promise<string | null>;
  clearBearerToken():
    Promise<void>;
  clear():
    Promise<void>;
  snapshot():
    Record<string, unknown>;
}

export class TauriCredentialVault
  implements CredentialVault {
  constructor(options: {
    invoke:
      (
        command: string,
        arguments_?: unknown
      ) => Promise<unknown>;
    service?: string;
    account?: string;
  });
  getBearerToken():
    Promise<string | null>;
  setBearerToken(
    value: string
  ): Promise<string | null>;
  clearBearerToken():
    Promise<void>;
  clear():
    Promise<void>;
  snapshot():
    Record<string, unknown>;
}

export function createCredentialVault(
  options?: {
    invoke?:
      (
        command: string,
        arguments_?: unknown
      ) => Promise<unknown>;
    allowPersistentBearer?:
      boolean;
  }
): CredentialVault;

export class ServerProfileStore {
  constructor(options?: {
    storage?: Storage | null;
    key?: string;
  });
  load(): ServerProfile;
  save(
    profile:
      Partial<ServerProfile>
  ): ServerProfile;
  reset(): ServerProfile;
  get(): ServerProfile;
}

export class ConnectivityStore {
  constructor(options?: {
    now?: () => Date;
  });
  subscribe(
    listener:
      (
        state:
          ConnectivitySnapshot
      ) => void
  ): () => void;
  snapshot():
    ConnectivitySnapshot;
  markChecking(
    options?: {
      reconnecting?: boolean;
    }
  ): void;
  markOnline(): void;
  markOffline(
    error?: unknown
  ): void;
}

export class OfflineReadCache {
  constructor(options?: {
    maximumEntries?: number;
    defaultTtlMs?: number;
    now?: () => number;
  });
  set<T>(
    key: string,
    value: T,
    options?: {
      ttlMs?: number;
    }
  ): T;
  get<T>(
    key: string,
    options?: {
      allowStale?: boolean;
    }
  ): {
    value: T;
    stale: boolean;
    ageMs: number;
    storedAt: string;
  } | null;
  clear(): void;
  snapshot():
    Record<string, unknown>;
}

export class DesktopAuthController {
  constructor(options: {
    client: unknown;
    credentialVault:
      CredentialVault;
    connectivityStore?:
      ConnectivityStore;
  });
  subscribe(
    listener:
      (
        state:
          Record<string, unknown>
      ) => void
  ): () => void;
  bearerToken():
    Promise<string | null>;
  currentCsrfToken():
    string | null;
  useBearerToken(
    token: string
  ): Promise<
    Record<string, unknown>
  >;
  login(
    credentials: {
      username: string;
      password: string;
    }
  ): Promise<
    Record<string, unknown>
  >;
  refresh():
    Promise<
      Record<string, unknown>
    >;
  logout():
    Promise<
      Record<string, unknown>
    >;
  snapshot():
    Record<string, unknown>;
}

export class DesktopEventStream {
  constructor(options: {
    client: unknown;
    socketFactory?:
      (() => Promise<unknown>) |
      null;
    pollingIntervalMs?: number;
    recentLimit?: number;
  });
  subscribe(
    listener:
      (event: unknown) => void
  ): () => void;
  start():
    Promise<
      Record<string, unknown>
    >;
  stop():
    Record<string, unknown>;
  snapshot():
    Record<string, unknown>;
}

export class DesktopApiRuntime {
  constructor(options: {
    client: unknown;
    auth:
      DesktopAuthController;
    connectivity:
      ConnectivityStore;
    eventStream:
      DesktopEventStream;
    cache:
      OfflineReadCache;
  });
  checkConnection():
    Promise<unknown>;
  read<T>(
    cacheKey: string,
    operation:
      () => Promise<T>,
    options?: {
      ttlMs?: number;
      allowStaleOnError?: boolean;
    }
  ): Promise<{
    data: T;
    source:
      'network' |
      'cache';
    stale: boolean;
    ageMs?: number;
  }>;
  write<T>(
    operation:
      () => Promise<T>
  ): Promise<T>;
  start():
    Promise<
      Record<string, unknown>
    >;
  dispose():
    Promise<
      Record<string, unknown>
    >;
  snapshot():
    Record<string, unknown>;
}

export function isConnectivityFailure(
  error: unknown
): boolean;

export class DesktopLedApi {
  constructor(options: {
    client: unknown;
    runtime:
      DesktopApiRuntime;
  });
  list(): Promise<unknown>;
  get(
    id: string | number
  ): Promise<unknown>;
  update(
    id: string | number,
    command: unknown
  ): Promise<unknown>;
  allOn(
    command?: unknown
  ): Promise<unknown>;
  allOff(): Promise<unknown>;
  reset(): Promise<unknown>;
}

export class DesktopScheduleApi {
  constructor(options: {
    client: unknown;
    runtime:
      DesktopApiRuntime;
  });
  listLocal(): Promise<unknown>;
  createLocal(
    schedule: unknown
  ): Promise<unknown>;
  updateLocal(
    id: string,
    schedule: unknown
  ): Promise<unknown>;
  deleteLocal(
    id: string
  ): Promise<unknown>;
  listFiles(): Promise<unknown>;
  uploadFile(
    payload: unknown
  ): Promise<unknown>;
  forceTick(): Promise<unknown>;
}

export class DesktopFirmwareApi {
  constructor(options: {
    client: unknown;
    runtime:
      DesktopApiRuntime;
  });
  status(): Promise<unknown>;
  check(): Promise<unknown>;
  update(
    payload?: unknown
  ): Promise<unknown>;
  cancel(): Promise<unknown>;
  backups(): Promise<unknown>;
  rollback(
    backupId: string
  ): Promise<unknown>;
}

export class DesktopSystemApi {
  constructor(options: {
    client: unknown;
    runtime:
      DesktopApiRuntime;
  });
  release(): Promise<unknown>;
  diagnostics(): Promise<unknown>;
  preflight(): Promise<unknown>;
  maintenanceStatus():
    Promise<unknown>;
  enableMaintenance(
    reason: string
  ): Promise<unknown>;
  disableMaintenance():
    Promise<unknown>;
  snapshots(): Promise<unknown>;
  createSnapshot(
    label?: string
  ): Promise<unknown>;
  verifySnapshot(
    id: string
  ): Promise<unknown>;
  restoreSnapshot(
    id: string,
    confirm?: string
  ): Promise<unknown>;
  deleteSnapshot(
    id: string
  ): Promise<unknown>;
  migrations(): Promise<unknown>;
  dryRunMigrations():
    Promise<unknown>;
  applyMigrations():
    Promise<unknown>;
}
