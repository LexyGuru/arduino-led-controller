import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  useDesktopApi
} from '../api';

import {
  readApiError
} from '../api/ui/api-payload.mjs';

import {
  isScheduleEvent,
  normalizeRunnerStatus,
  normalizeScheduleList,
  scheduleFingerprint
} from '../services/v5ScheduleModels.mjs';

import type {
  LedSchedule
} from '../types';

export function useV5Schedules({
  legacySchedules,
  legacyBusy,
  directSave,
  directSync
}: {
  legacySchedules: LedSchedule[];
  legacyBusy: boolean;
  directSave: (schedules: LedSchedule[]) => void;
  directSync: () => void;
}) {
  const {
    api,
    connectivity,
    auth
  } = useDesktopApi();

  const [
    remoteSchedules,
    setRemoteSchedules
  ] = useState<LedSchedule[]>(
    legacySchedules
  );

  const [
    remoteFingerprint,
    setRemoteFingerprint
  ] = useState(
    scheduleFingerprint(
      legacySchedules
    )
  );

  const [
    runner,
    setRunner
  ] = useState(
    normalizeRunnerStatus(null)
  );

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

  const refreshInFlight =
    useRef(false);

  const authenticated =
    auth.authenticated === true;

  const online =
    connectivity.online === true;

  const directFallback =
    !authenticated ||
    !online;

  const refresh =
    useCallback(
      async () => {
        if (
          refreshInFlight.current
        ) {
          return null;
        }

        if (directFallback) {
          const normalized =
            normalizeScheduleList(
              legacySchedules
            );

          setRemoteSchedules(
            normalized
          );
          setRemoteFingerprint(
            scheduleFingerprint(
              normalized
            )
          );
          setSource(
            'legacy-direct'
          );

          return normalized;
        }

        refreshInFlight.current =
          true;

        try {
          const [
            schedulesResult,
            runnerResult
          ] =
            await Promise.all([
              api.schedules
                .listLocal(),
              api.schedules
                .runnerStatus()
            ]);

          const normalized =
            normalizeScheduleList(
              schedulesResult
            );

          setRemoteSchedules(
            normalized
          );
          setRemoteFingerprint(
            scheduleFingerprint(
              normalized
            )
          );
          setRunner(
            normalizeRunnerStatus(
              runnerResult
            )
          );
          setSource(
            (
              schedulesResult as {
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

          const normalized =
            normalizeScheduleList(
              legacySchedules
            );

          setRemoteSchedules(
            normalized
          );

          return null;
        } finally {
          refreshInFlight.current =
            false;
        }
      },
      [
        api,
        directFallback,
        legacySchedules
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
              isScheduleEvent(
                event
              )
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

  const save =
    useCallback(
      async (
        schedules: LedSchedule[],
        {
          expectedFingerprint,
          force = false
        }: {
          expectedFingerprint: string;
          force?: boolean;
        }
      ) => {
        if (directFallback) {
          directSave(
            schedules
          );
          setNotice(
            'A schedule közvetlen Tauri útvonalon lett mentve.'
          );
          return {
            source:
              'legacy-direct'
          };
        }

        setBusy(true);
        setError(null);
        setNotice('');

        try {
          const currentResult =
            await api.schedules
              .listLocal({
                allowStaleOnError:
                  false
              });

          const current =
            normalizeScheduleList(
              currentResult
            );

          const currentFingerprint =
            scheduleFingerprint(
              current
            );

          if (
            !force &&
            currentFingerprint !==
              expectedFingerprint
          ) {
            const conflict =
              new Error(
                'A V5 szerveren közben megváltozott az időzítéslista.'
              ) as Error & {
                code?: string;
                details?: unknown;
              };

            conflict.code =
              'SCHEDULE_CONFLICT';

            conflict.details = {
              expectedFingerprint,
              actualFingerprint:
                currentFingerprint,
              current
            };

            throw conflict;
          }

          await api.schedules
            .replaceAll(
              schedules
            );

          const refreshed =
            await refresh();

          setNotice(
            `${schedules.length} időzítés elmentve a V5 szerverre.`
          );

          return {
            source:
              'api-v2',
            schedules:
              refreshed
          };
        } catch (
          requestError
        ) {
          setError(
            readApiError(
              requestError
            )
          );
          throw requestError;
        } finally {
          setBusy(false);
        }
      },
      [
        api,
        directFallback,
        directSave,
        refresh
      ]
    );

  const syncArduino =
    useCallback(
      async () => {
        if (directFallback) {
          directSync();
          setNotice(
            'Az Arduino-beolvasás közvetlen Tauri útvonalon indult.'
          );
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await api.schedules
            .syncArduino();

          setNotice(
            'A V5 szerver időzítései szinkronizálva lettek az Arduino felé.'
          );

          await refresh();
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
        directSync,
        refresh
      ]
    );

  const forceTick =
    useCallback(
      async () => {
        if (directFallback) {
          setError({
            code:
              'API_V2_REQUIRED',
            message:
              'A runner kézi futtatásához hitelesített V5 kapcsolat szükséges.',
            status:
              null,
            details:
              null
          });
          return;
        }

        setBusy(true);

        try {
          await api.schedules
            .forceTick();
          setNotice(
            'A helyi schedule runner kézi futása befejeződött.'
          );
          await refresh();
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
      schedules:
        remoteSchedules,
      remoteFingerprint,
      runner,
      source,
      busy:
        busy ||
        legacyBusy,
      error,
      notice,
      directFallback,
      refresh,
      save,
      syncArduino,
      forceTick
    }),
    [
      remoteSchedules,
      remoteFingerprint,
      runner,
      source,
      busy,
      legacyBusy,
      error,
      notice,
      directFallback,
      refresh,
      save,
      syncArduino,
      forceTick
    ]
  );
}
