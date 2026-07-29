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
        options.fetchImplementation
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
      await credentialVault
        .setBearerToken(token);

      await refreshBearerMirror();

      return auth.useBearerToken(
        token
      );
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
