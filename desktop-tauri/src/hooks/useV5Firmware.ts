import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  useDesktopApi
} from '../api';

import {
  readApiError
} from '../api/ui/api-payload.mjs';

import {
  firmwareEventToProgress,
  isFirmwareBusy,
  isFirmwareEvent,
  normalizeFirmwareBackups,
  normalizeFirmwareStatus
} from '../services/v5FirmwareModels.mjs';

import type {
  FirmwareStatus,
  OtaProgressEvent
} from '../types';

export function useV5Firmware({
  legacyFirmware,
  legacyBusy,
  legacyLogs,
  legacyProgress,
  legacyStage,
  directRefresh,
  directUpdate
}: {
  legacyFirmware:
    (FirmwareStatus & {
      backups?: unknown;
    }) |
    null;
  legacyBusy:
    boolean;
  legacyLogs:
    OtaProgressEvent[];
  legacyProgress:
    number;
  legacyStage:
    string;
  directRefresh:
    () => void;
  directUpdate:
    () => void;
}) {
  const {
    api,
    connectivity,
    auth
  } = useDesktopApi();

  const [
    apiStatus,
    setApiStatus
  ] = useState(
    normalizeFirmwareStatus(
      null,
      legacyFirmware
    )
  );

  const [
    backups,
    setBackups
  ] = useState(
    normalizeFirmwareBackups(
      legacyFirmware
        ?.backups ||
      []
    )
  );

  const [
    apiLogs,
    setApiLogs
  ] = useState<
    OtaProgressEvent[]
  >([]);

  const [
    source,
    setSource
  ] = useState<
    'api-v2' |
    'api-v2-cache' |
    'legacy-direct' |
    'legacy-fallback'
  >('legacy-direct');

  const [
    busy,
    setBusy
  ] = useState(false);

  const [
    error,
    setError
  ] = useState<
    ReturnType<typeof readApiError> |
    null
  >(null);

  const [
    notice,
    setNotice
  ] = useState('');

  const authenticated =
    auth.authenticated === true;

  const online =
    connectivity.online === true;

  const directFallback =
    !authenticated ||
    !online;

  const refresh =
    useCallback(
      async ({
        forceCheck = false
      } = {}) => {
        if (directFallback) {
          if (forceCheck) {
            directRefresh();
          }

          setApiStatus(
            normalizeFirmwareStatus(
              null,
              legacyFirmware
            )
          );
          setBackups(
            normalizeFirmwareBackups(
              legacyFirmware
                ?.backups ||
              []
            )
          );
          setSource(
            'legacy-direct'
          );
          return null;
        }

        try {
          if (forceCheck) {
            await api.firmware
              .check();
          }

          const [
            statusResult,
            backupResult
          ] =
            await Promise.all([
              api.firmware
                .status(),
              api.firmware
                .backups()
            ]);

          const normalized =
            normalizeFirmwareStatus(
              statusResult,
              legacyFirmware
            );

          const normalizedBackups =
            normalizeFirmwareBackups(
              backupResult
            );

          setApiStatus({
            ...normalized,
            backups:
              normalizedBackups
          });
          setBackups(
            normalizedBackups
          );
          setSource(
            (
              statusResult as {
                source?: string;
              }
            )?.source === 'cache'
              ? 'api-v2-cache'
              : 'api-v2'
          );
          setError(null);

          return normalized;
        } catch (
          requestError
        ) {
          setError(
            readApiError(
              requestError
            )
          );
          setSource(
            'legacy-fallback'
          );
          setApiStatus(
            normalizeFirmwareStatus(
              null,
              legacyFirmware
            )
          );
          return null;
        }
      },
      [
        api,
        directFallback,
        directRefresh,
        legacyFirmware
      ]
    );

  useEffect(
    () => {
      void refresh();
    },
    [refresh]
  );

  useEffect(
    () =>
      api.eventStream
        .subscribe(
          (event) => {
            if (
              !isFirmwareEvent(
                event
              )
            ) {
              return;
            }

            const progress =
              firmwareEventToProgress(
                event
              );

            setApiLogs(
              (current) => [
                ...current,
                progress
              ].slice(-300)
            );

            const payload =
              (
                event as {
                  payload?: unknown;
                  data?: unknown;
                }
              ).payload ||
              (
                event as {
                  data?: unknown;
                }
              ).data ||
              {};

            setApiStatus(
              (current) =>
                normalizeFirmwareStatus(
                  payload,
                  current
                )
            );

            if (
              String(
                (
                  payload as {
                    state?: unknown;
                  }
                )?.state ||
                ''
              ) === 'success'
            ) {
              void refresh();
            }
          }
        ),
    [
      api,
      refresh
    ]
  );

  useEffect(
    () => {
      if (
        directFallback ||
        !isFirmwareBusy(
          apiStatus
        )
      ) {
        return;
      }

      const timer =
        globalThis.setInterval(
          () => {
            void refresh();
          },
          2500
        );

      return () =>
        globalThis.clearInterval(
          timer
        );
    },
    [
      apiStatus,
      directFallback,
      refresh
    ]
  );

  const run =
    useCallback(
      async (
        operation:
          () =>
            Promise<unknown>,
        message:
          string
      ) => {
        setBusy(true);
        setError(null);
        setNotice('');

        try {
          const result =
            await operation();

          setNotice(message);

          globalThis.setTimeout(
            () => {
              void refresh();
            },
            700
          );

          return result;
        } catch (
          requestError
        ) {
          setError(
            readApiError(
              requestError
            )
          );
          return null;
        } finally {
          setBusy(false);
        }
      },
      [refresh]
    );

  const startUpdate =
    useCallback(
      async () => {
        if (directFallback) {
          directUpdate();
          return;
        }

        setApiLogs([]);
        await run(
          () =>
            api.firmware
              .update(),
          'A firmware-frissítés elfogadva; az állapot automatikusan frissül.'
        );
      },
      [
        api,
        directFallback,
        directUpdate,
        run
      ]
    );

  const cancel =
    useCallback(
      async () => {
        if (directFallback) {
          setError({
            code:
              'API_V2_REQUIRED',
            message:
              'A megszakítás csak a V5 firmware-szolgáltatáson érhető el.',
            status:
              null,
            details:
              null
          });
          return;
        }

        await run(
          () =>
            api.firmware
              .cancel(),
          'A firmware-művelet megszakítását elküldtük.'
        );
      },
      [
        api,
        directFallback,
        run
      ]
    );

  const rollback =
    useCallback(
      async (
        backupId: string
      ) => {
        if (directFallback) {
          return;
        }

        await run(
          () =>
            api.firmware
              .rollback(
                backupId
              ),
          'A firmware-visszaállítás elfogadva.'
        );
      },
      [
        api,
        directFallback,
        run
      ]
    );

  const deleteBackup =
    useCallback(
      async (
        id: string
      ) => {
        if (directFallback) {
          return;
        }

        await run(
          () =>
            api.firmware
              .deleteBackup(id),
          'A firmware backup törölve.'
        );
      },
      [
        api,
        directFallback,
        run
      ]
    );

  const status =
    directFallback
      ? normalizeFirmwareStatus(
          null,
          legacyFirmware
        )
      : apiStatus;

  return useMemo(
    () => ({
      status,
      backups:
        directFallback
          ? normalizeFirmwareBackups(
              legacyFirmware
                ?.backups ||
              []
            )
          : backups,
      logs:
        directFallback
          ? legacyLogs
          : apiLogs,
      progress:
        directFallback
          ? legacyProgress
          : status.progress ||
            0,
      stage:
        directFallback
          ? legacyStage
          : status.phase ||
            status.state,
      source,
      directFallback,
      busy:
        busy ||
        legacyBusy ||
        isFirmwareBusy(
          status
        ),
      error,
      notice,
      refresh,
      startUpdate,
      cancel,
      rollback,
      deleteBackup
    }),
    [
      status,
      backups,
      legacyLogs,
      apiLogs,
      legacyProgress,
      legacyStage,
      source,
      directFallback,
      busy,
      legacyBusy,
      error,
      notice,
      refresh,
      startUpdate,
      cancel,
      rollback,
      deleteBackup,
      legacyFirmware
    ]
  );
}
