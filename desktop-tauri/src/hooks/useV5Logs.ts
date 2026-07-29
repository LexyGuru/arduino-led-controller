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
  mergeEvents,
  normalizeAuditEntries,
  normalizeConsoleLogs,
  normalizeEvents
} from '../services/v5LogModels.mjs';

import type {
  ArduinoLog,
  NetworkLog
} from '../types';

export function useV5Logs({
  legacyArduino,
  legacyNetwork,
  legacyError
}: {
  legacyArduino:
    ArduinoLog[];
  legacyNetwork:
    NetworkLog[];
  legacyError?:
    string |
    null;
}) {
  const {
    api,
    connectivity,
    auth
  } = useDesktopApi();

  const [
    consoleLogs,
    setConsoleLogs
  ] = useState<
    ArduinoLog[]
  >(legacyArduino);

  const [
    auditEntries,
    setAuditEntries
  ] = useState<
    ReturnType<
      typeof normalizeAuditEntries
    >
  >([]);

  const [
    events,
    setEvents
  ] = useState<
    ReturnType<
      typeof normalizeEvents
    >
  >([]);

  const [
    stats,
    setStats
  ] = useState<
    Record<
      string,
      unknown
    > |
    null
  >(null);

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
  >(
    legacyError
      ? {
          code:
            'LEGACY_CONSOLE_ERROR',
          message:
            legacyError,
          status:
            null,
          details:
            null
        }
      : null
  );

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
        force = false
      } = {}) => {
        if (directFallback) {
          setConsoleLogs(
            legacyArduino
          );
          setSource(
            'legacy-direct'
          );

          if (legacyError) {
            setError({
              code:
                'LEGACY_CONSOLE_ERROR',
              message:
                legacyError,
              status:
                null,
              details:
                null
            });
          }

          return;
        }

        setBusy(true);

        try {
          const [
            consoleResult,
            consoleStatsResult,
            auditResult,
            auditStatusResult,
            eventsResult,
            eventsStatusResult
          ] =
            await Promise.all([
              api.logs
                .consoleLogs({
                  force
                }),
              api.logs
                .consoleStats(),
              api.logs
                .auditRecent(100),
              api.logs
                .auditStatus(),
              api.logs
                .eventsRecent({
                  limit: 100
                }),
              api.logs
                .eventsStatus()
            ]);

          setConsoleLogs(
            normalizeConsoleLogs(
              consoleResult
            )
          );
          setAuditEntries(
            normalizeAuditEntries(
              auditResult
            )
          );
          setEvents(
            normalizeEvents(
              eventsResult
            )
          );
          setStats({
            console:
              consoleStatsResult,
            audit:
              auditStatusResult,
            events:
              eventsStatusResult
          });
          setSource(
            (
              consoleResult as {
                source?: string;
              }
            )?.source === 'cache'
              ? 'api-v2-cache'
              : 'api-v2'
          );
          setError(null);
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
          setConsoleLogs(
            legacyArduino
          );
        } finally {
          setBusy(false);
        }
      },
      [
        api,
        directFallback,
        legacyArduino,
        legacyError
      ]
    );

  useEffect(
    () => {
      void refresh({
        force: true
      });

      const timer =
        globalThis.setInterval(
          () => {
            void refresh();
          },
          5000
        );

      return () =>
        globalThis.clearInterval(
          timer
        );
    },
    [refresh]
  );

  useEffect(
    () =>
      api.eventStream
        .subscribe(
          (event) => {
            if (
              directFallback
            ) {
              return;
            }

            const normalized =
              normalizeEvents([
                event
              ]);

            setEvents(
              (current) =>
                mergeEvents(
                  current,
                  normalized,
                  300
                )
            );
          }
        ),
    [
      api,
      directFallback
    ]
  );

  const clearConsole =
    useCallback(
      async () => {
        if (directFallback) {
          setError({
            code:
              'API_V2_REQUIRED',
            message:
              'A közös konzol törléséhez hitelesített V5 kapcsolat szükséges.',
            status:
              null,
            details:
              null
          });
          return;
        }

        setBusy(true);

        try {
          await api.logs
            .clearConsole();
          setConsoleLogs([]);
          await refresh({
            force: true
          });
        } catch (
          requestError
        ) {
          setError(
            readApiError(
              requestError
            )
          );
        } finally {
          setBusy(false);
        }
      },
      [
        api,
        directFallback,
        refresh
      ]
    );

  return useMemo(
    () => ({
      consoleLogs,
      networkLogs:
        legacyNetwork,
      auditEntries,
      events,
      stats,
      source,
      directFallback,
      busy,
      error,
      refresh,
      clearConsole
    }),
    [
      consoleLogs,
      legacyNetwork,
      auditEntries,
      events,
      stats,
      source,
      directFallback,
      busy,
      error,
      refresh,
      clearConsole
    ]
  );
}
