import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  normalizeScheduleList,
  scheduleFingerprint
} from '../services/v5ScheduleModels.mjs';

import type {
  LedSchedule,
  ScheduleSaveResult,
  ScheduleSyncSnapshot,
  ScheduleSyncState
} from '../types';

type ScheduleUiError = {
  code: string;
  message: string;
  status: number | null;
  details: unknown;
};

function scheduleError(
  error: unknown
): ScheduleUiError {
  const message =
    String(error);

  if (
    message.includes(
      'SCHEDULE_CONFLICT:'
    )
  ) {
    return {
      code: 'SCHEDULE_CONFLICT',
      message: message.replace(
        /^.*SCHEDULE_CONFLICT:\s*/,
        ''
      ),
      status: 409,
      details: null
    };
  }

  if (
    message.includes(
      'SCHEDULE_SYNC_REQUIRED:'
    )
  ) {
    return {
      code: 'SCHEDULE_SYNC_REQUIRED',
      message: message.replace(
        /^.*SCHEDULE_SYNC_REQUIRED:\s*/,
        ''
      ),
      status: 409,
      details: null
    };
  }

  return {
    code: 'DIRECT_SCHEDULE_ERROR',
    message,
    status: null,
    details: null
  };
}

export function useV5Schedules({
  legacySchedules,
  legacyBusy,
  syncState,
  directSave,
  directSync
}: {
  legacySchedules: LedSchedule[];
  legacyBusy: boolean;
  syncState: ScheduleSyncState;
  directSave: (
    schedules: LedSchedule[],
    expectedRevision: number | null,
    force?: boolean
  ) => Promise<ScheduleSaveResult>;
  directSync: () => Promise<ScheduleSyncSnapshot>;
}) {
  const [
    remoteSchedules,
    setRemoteSchedules
  ] = useState<LedSchedule[]>(
    normalizeScheduleList(
      legacySchedules
    )
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
    remoteRevision,
    setRemoteRevision
  ] = useState<number | null>(
    syncState.revision
  );

  const [
    busy,
    setBusy
  ] = useState(false);

  const [
    error,
    setError
  ] = useState<ScheduleUiError | null>(
    null
  );

  const [
    notice,
    setNotice
  ] = useState('');

  const refreshInFlight =
    useRef(false);

  useEffect(
    () => {
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
      setRemoteRevision(
        syncState.revision
      );
    },
    [
      legacySchedules,
      syncState.revision
    ]
  );

  const refresh =
    useCallback(
      async () => {
        if (
          refreshInFlight.current
        ) {
          return null;
        }

        refreshInFlight.current =
          true;
        setBusy(true);
        setError(null);
        setNotice('');

        try {
          const snapshot =
            await directSync();

          const normalized =
            normalizeScheduleList(
              snapshot.schedules
            );

          setRemoteSchedules(
            normalized
          );
          setRemoteFingerprint(
            scheduleFingerprint(
              normalized
            )
          );
          setRemoteRevision(
            snapshot.revision
          );
          setNotice(
            `${snapshot.count} Arduino-rekord letöltve; revision ${snapshot.revision}, checksum ${snapshot.checksum}.`
          );

          return snapshot;
        } catch (
          requestError
        ) {
          setError(
            scheduleError(
              requestError
            )
          );
          return null;
        } finally {
          refreshInFlight.current =
            false;
          setBusy(false);
        }
      },
      [directSync]
    );

  const save =
    useCallback(
      async (
        schedules: LedSchedule[],
        {
          expectedRevision,
          force = false
        }: {
          expectedRevision: number | null;
          force?: boolean;
        }
      ) => {
        setBusy(true);
        setError(null);
        setNotice('');

        try {
          const result =
            await directSave(
              schedules,
              expectedRevision,
              force
            );

          const normalized =
            normalizeScheduleList(
              result.schedules
            );

          setRemoteSchedules(
            normalized
          );
          setRemoteFingerprint(
            scheduleFingerprint(
              normalized
            )
          );
          setRemoteRevision(
            result.revision
          );
          setNotice(
            `${result.count} időzítés mentve az Arduino-ra; a teljes readback és checksum ellenőrzés sikeres.`
          );

          return result;
        } catch (
          requestError
        ) {
          const normalizedError =
            scheduleError(
              requestError
            );

          setError(
            normalizedError
          );

          const wrapped =
            new Error(
              normalizedError.message
            ) as Error & {
              code?: string;
            };

          wrapped.code =
            normalizedError.code;

          throw wrapped;
        } finally {
          setBusy(false);
        }
      },
      [directSave]
    );

  const canWrite =
    syncState.status ===
      'verified' &&
    remoteRevision != null &&
    syncState.count ===
      remoteSchedules.length;

  return useMemo(
    () => ({
      schedules:
        remoteSchedules,
      remoteFingerprint,
      remoteRevision,
      source:
        'legacy-direct' as const,
      busy:
        busy ||
        legacyBusy,
      error,
      notice,
      syncState,
      canWrite,
      refresh,
      save
    }),
    [
      remoteSchedules,
      remoteFingerprint,
      remoteRevision,
      busy,
      legacyBusy,
      error,
      notice,
      syncState,
      canWrite,
      refresh,
      save
    ]
  );
}
