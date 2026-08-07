import {
  ApiV2Client
} from './generated/api-v2-client';

import {
  ConnectivityStore,
  createCredentialVault,
  DesktopApiRuntime,
  DesktopArduinoApi,
  DesktopAuthController,
  DesktopEventStream,
  DesktopFirmwareApi,
  DesktopLedApi,
  DesktopLogApi,
  DesktopScheduleApi,
  DesktopSystemApi,
  OfflineReadCache,
  ServerProfileStore
} from './runtime/index.mjs';

export interface CreateDesktopApiOptions {
  storage?: Storage | null;
  fetchImplementation?:
    typeof fetch;
  socketFactory?:
    (() => Promise<unknown>) |
    null;
  invoke?:
    (
      command: string,
      arguments_?: unknown
    ) => Promise<unknown>;
  allowPersistentBearer?:
    boolean;
  pollingIntervalMs?: number;
}

const directModeBlockedBackendFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      ok: false,
      code: 'lxc_tauri_bridge_not_configured',
      message:
        'Az LXC/API v2 backend Direct Arduino módban nincs frontend HTTP transportra kötve.'
    }),
    {
      status: 503,
      headers: {
        'content-type': 'application/json'
      }
    }
  );

export function createDesktopApi(
  options:
    CreateDesktopApiOptions = {}
) {
  const profileStore =
    new ServerProfileStore({
      storage:
        options.storage ??
        globalThis.localStorage ??
        null
    });

  const profile =
    profileStore.load();

  const credentialVault =
    createCredentialVault({
      invoke:
        options.invoke,
      allowPersistentBearer:
        options.allowPersistentBearer ===
        true
    });

  const connectivity =
    new ConnectivityStore();

  let bearerToken:
    string | null = null;

  let auth:
    DesktopAuthController;

  const client =
    new ApiV2Client({
      baseUrl:
        profile.baseUrl,
      bearerToken:
        () =>
          bearerToken,
      csrfToken:
        () =>
          auth?.currentCsrfToken() ||
          null,
      credentials:
        'include',
      fetchImplementation:
        options.fetchImplementation ?? directModeBlockedBackendFetch,
    });

  auth =
    new DesktopAuthController({
      client,
      credentialVault,
      connectivityStore:
        connectivity
    });

  const refreshBearerMirror =
    async () => {
      bearerToken =
        await credentialVault
          .getBearerToken();

      return bearerToken;
    };

  const eventStream =
    new DesktopEventStream({
      client,
      socketFactory:
        options.socketFactory,
      pollingIntervalMs:
        options.pollingIntervalMs ??
        5000
    });

  const runtime =
    new DesktopApiRuntime({
      client,
      auth,
      connectivity,
      eventStream,
      cache:
        new OfflineReadCache({
          maximumEntries:
            150,
          defaultTtlMs:
            30000
        })
    });

  return {
    profileStore,
    profile,
    credentialVault,
    connectivity,
    auth,
    eventStream,
    runtime,
    arduino:
      new DesktopArduinoApi({
        client,
        runtime
      }),
    led:
      new DesktopLedApi({
        client,
        runtime
      }),
    schedules:
      new DesktopScheduleApi({
        client,
        runtime
      }),
    logs:
      new DesktopLogApi({
        client,
        runtime
      }),
    firmware:
      new DesktopFirmwareApi({
        client,
        runtime
      }),
    system:
      new DesktopSystemApi({
        client,
        runtime
      }),
    async initializeCredentials() {
      await credentialVault
        .probe?.();

      await refreshBearerMirror();

      if (
        bearerToken &&
        profile.authMode ===
          'bearer'
      ) {
        return auth.refresh();
      }

      return auth.snapshot();
    },
    async setBearerToken(
      token: string
    ) {
      const state =
        await auth
          .useBearerToken(
            token
          );

      await refreshBearerMirror();

      return state;
    },
    async clearBearerToken() {
      await credentialVault
        .clearBearerToken();

      bearerToken = null;

      return auth.snapshot();
    },
    refreshBearerMirror
  };
}

export type DesktopApi =
  ReturnType<
    typeof createDesktopApi
  >;
