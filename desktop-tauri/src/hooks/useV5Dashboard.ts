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
  dashboardDataSource,
  normalizeArduinoStatus,
  type DashboardDataSource
} from '../services/v5ArduinoModels.mjs';

import {
  normalizeLedList
} from '../services/v5LedModels.mjs';

import type {
  ArduinoStatus,
  LedSchedule
} from '../types';

function isRelevantTopic(
  event: unknown
) {
  const topic =
    String(
      (
        event as {
          topic?: unknown;
        }
      )?.topic ||
      ''
    );

  return (
    topic.startsWith(
      'led.'
    ) ||
    topic.startsWith(
      'arduino.'
    )
  );
}

export function useV5Dashboard(
  legacyStatus:
    ArduinoStatus |
    null,
  legacySchedules:
    LedSchedule[]
) {
  const {
    api,
    connectivity,
    auth
  } =
    useDesktopApi();

  const [
    apiStatus,
    setApiStatus
  ] =
    useState<
      ArduinoStatus |
      null
    >(null);

  const [
    source,
    setSource
  ] =
    useState<
      DashboardDataSource
    >(
      'legacy-direct'
    );

  const [
    refreshing,
    setRefreshing
  ] =
    useState(false);

  const [
    error,
    setError
  ] =
    useState<
      ReturnType<
        typeof readApiError
      > |
      null
    >(null);

  const authenticated =
    auth.authenticated ===
      true;

  const online =
    connectivity.online ===
      true;

  const refresh =
    useCallback(
      async () => {
        if (
          !authenticated ||
          !online
        ) {
          setApiStatus(null);
          setSource(
            'legacy-direct'
          );
          return null;
        }

        setRefreshing(true);
        setError(null);

        try {
          const [
            statusResult,
            ledsResult
          ] =
            await Promise.all([
              api.arduino.status(),
              api.led.list()
            ]);

          const normalized =
            normalizeArduinoStatus(
              statusResult,
              legacyStatus
            );

          normalized.strips =
            normalizeLedList(
              ledsResult,
              legacyStatus
                ?.strips ??
              []
            );

          setApiStatus(
            normalized
          );

          setSource(
            dashboardDataSource({
              authenticated,
              online,
              responseSource:
                (
                  statusResult as {
                    source?:
                      string;
                  }
                )?.source
            })
          );

          return normalized;
        } catch (
          requestError
        ) {
          setApiStatus(null);
          setError(
            readApiError(
              requestError
            )
          );
          setSource(
            'legacy-fallback'
          );

          return null;
        } finally {
          setRefreshing(false);
        }
      },
      [
        api,
        authenticated,
        legacyStatus,
        online
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
              isRelevantTopic(
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

  const status =
    useMemo(
      () =>
        apiStatus ??
        legacyStatus,
      [
        apiStatus,
        legacyStatus
      ]
    );

  return {
    status,
    schedules:
      legacySchedules,
    source,
    refreshing,
    error,
    refresh
  };
}
