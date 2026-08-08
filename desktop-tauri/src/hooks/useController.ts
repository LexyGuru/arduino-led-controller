import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  tauriApi
} from '../services/tauriApi';

import { translate } from '../i18n';

import type {
  ArduinoLog,
  ArduinoStatus,
  ConnectionConfig,
  FirmwareStatus,
  LedSchedule,
  LedStrip,
  NetworkLog,
  OtaProgressEvent,
  PageId,
  RuntimeCapabilities,
  ScheduleSaveResult,
  ScheduleSyncSnapshot,
  ScheduleSyncState
} from '../types';

import type {
  LedTestPreset
} from '../pages/LedsPage';

const fallbackConfig:
  ConnectionConfig = {
    profileName: 'Arduino vezérlő',
    language: 'hu',
    protocol: 'https',
    localProtocol: 'http',
    arduinoIp: '',
    arduinoPort: 443,
    localArduinoIp: '',
    localArduinoPort: 80,
    preferLocal: false,
    macosLocalApiEnabled: false,
    otaUseApiHost: true,
    otaAddress: '',
    otaPort: 65280,
    otaUploadMode: 'auto',
    otaToolPath:
      '/usr/local/bin/arduinoOTA',
    otaTimeoutSeconds: 120,
    arduinoApiPath: '',
    arduinoApiKey: '',
    arduinoApiKeyConfigured: false,
    updateChannel: 'beta',
    firmwareUpdateChannel: 'beta',
    autoCheckUpdates: true,
    autoDownloadUpdates: false,
    firmwareUpdateChecks: true,
    timezoneId: 'Europe/Vienna',
    timezoneAuto: true,
    currentUtcOffsetMinutes: 60,
    nextTransitionEpoch: 0,
    nextUtcOffsetMinutes: 60
  };

function hostReady(
  host: string,
  port: number
) {
  const value =
    host.trim();

  return (
    value.length > 0 &&
    value.length <= 253 &&
    !value.includes('://') &&
    !value.includes('/') &&
    !/\s/.test(value) &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
  );
}

function authenticationReady(
  config: ConnectionConfig
): boolean {
  const path =
    config.arduinoApiPath
      .trim();
  const key =
    config.arduinoApiKey
      .trim();

  const inlineKeyReady =
    key.length >= 24 &&
    key.length <= 64 &&
    /^[\x21-\x7e]+$/.test(key);

  return (
    path.startsWith('/') &&
    path.length >= 18 &&
    !/\s/.test(path) &&
    (
      config.arduinoApiKeyConfigured ||
      inlineKeyReady
    )
  );
}

function connectionReady(
  config: ConnectionConfig
) {
  return (
    authenticationReady(
      config
    ) &&
    (
      hostReady(
        config.localArduinoIp,
        config.localArduinoPort
      ) ||
      hostReady(
        config.arduinoIp,
        config.arduinoPort
      )
    )
  );
}

function migrateLegacyPlaceholder(
  saved: ConnectionConfig,
  platform = 'unknown'
): ConnectionConfig {
  const merged = {
    ...fallbackConfig,
    ...saved
  };

  if (platform === 'macos') {
    merged.preferLocal = false;
    merged.macosLocalApiEnabled = saved.macosLocalApiEnabled === true;
    merged.otaUseApiHost = false;
  }

  const noAuthentication =
    !merged
      .arduinoApiKeyConfigured &&
    !merged.arduinoApiPath
      .trim() &&
    !merged.arduinoApiKey
      .trim();

  const oldLocalPlaceholder =
    merged.localArduinoIp
      .trim() ===
    '10.0.0.123';

  const oldRemotePlaceholder =
    [
      '10.0.0.123',
      'lexyguruhome.ddns.net'
    ].includes(
      merged.arduinoIp
        .trim()
    );

  if (
    noAuthentication &&
    oldLocalPlaceholder &&
    oldRemotePlaceholder
  ) {
    return {
      ...merged,
      arduinoIp: '',
      localArduinoIp: '',
      otaAddress: ''
    };
  }

  return merged;
}

export function useController(
  activePage: PageId
) {
  const [
    capabilities,
    setCapabilities
  ] =
    useState<RuntimeCapabilities>({
      platform: 'unknown',
      mobile: false,
      otaSupported: true
    });

  const [
    config,
    setConfig
  ] =
    useState<ConnectionConfig>(
      fallbackConfig
    );

  const [
    status,
    setStatus
  ] =
    useState<ArduinoStatus | null>(
      null
    );

  const [
    logs,
    setLogs
  ] =
    useState<ArduinoLog[]>(
      []
    );

  const [
    networkLogs,
    setNetworkLogs
  ] =
    useState<NetworkLog[]>(
      []
    );

  const [
    schedules,
    setSchedules
  ] =
    useState<LedSchedule[]>(
      []
    );

  const [
    scheduleSync,
    setScheduleSync
  ] =
    useState<ScheduleSyncState>({
      status: 'local-cache',
      count: 0,
      revision: null,
      checksum: '',
      emptyActionCount: 0,
      recoveredLegacyActionCount: 0,
      lastError: null
    });

  const [
    firmware,
    setFirmware
  ] =
    useState<FirmwareStatus | null>(
      null
    );

  const [
    otaLogs,
    setOtaLogs
  ] =
    useState<OtaProgressEvent[]>(
      []
    );

  const [
    otaProgress,
    setOtaProgress
  ] =
    useState(0);

  const [
    otaStage,
    setOtaStage
  ] =
    useState(
      translate('controller.ready')
    );

  const [
    otaPassword,
    setOtaPassword
  ] =
    useState('');

  const [
    busy,
    setBusy
  ] =
    useState(false);

  const [
    initialized,
    setInitialized
  ] =
    useState(false);

  const [
    message,
    setMessage
  ] =
    useState(
      translate('controller.configure')
    );

  const testSnapshot =
    useRef<LedStrip[] | null>(
      null
    );

  const lastConsoleId =
    useRef(0);

  const consoleRequestInFlight =
    useRef(false);

  const statusRequestInFlight =
    useRef(false);

  const statusHealthy =
    useRef(false);

  const scheduleAutoSyncKey =
    useRef('');

  const consecutiveStatusFailures =
    useRef(0);

  const consolePausedUntil =
    useRef(0);

  const [
    consoleError,
    setConsoleError
  ] =
    useState<string | null>(
      null
    );

  const refreshConsole =
    useCallback(
      async (
        force = false
      ) => {
        if (
          consoleRequestInFlight.current ||
          busy ||
          !initialized
        ) {
          return;
        }

        if (
          !force &&
          document.visibilityState !==
            'visible'
        ) {
          return;
        }

        if (
          !force &&
          (
            !statusHealthy.current ||
            Date.now() <
              consolePausedUntil.current
          )
        ) {
          return;
        }

        consoleRequestInFlight.current =
          true;

        try {
          const previousLastId =
            lastConsoleId.current;

          const response =
            await tauriApi.logs(
              previousLastId
            );

          const incoming =
            Array.isArray(
              response?.logs
            )
              ? response.logs
              : [];

          const receivedLastId =
            incoming.reduce(
              (
                maximum,
                entry
              ) =>
                Math.max(
                  maximum,
                  Number(
                    entry.id
                  ) || 0
                ),
              0
            );

          const authoritativeLastId =
            Math.max(
              Number(
                response?.lastId
              ) || 0,
              receivedLastId
            );

          const deviceRestarted =
            authoritativeLastId <
            previousLastId;

          if (
            deviceRestarted
          ) {
            setLogs(
              [...incoming]
                .sort(
                  (
                    a,
                    b
                  ) =>
                    b.id -
                    a.id
                )
                .slice(
                  0,
                  500
                )
            );
          } else if (
            incoming.length
          ) {
            setLogs(
              (
                current
              ) => {
                const merged = [
                  ...current,
                  ...incoming
                ];

                const unique =
                  Array.from(
                    new Map(
                      merged.map(
                        (
                          entry
                        ) => [
                          entry.id,
                          entry
                        ]
                      )
                    ).values()
                  );

                return unique
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      b.id -
                      a.id
                  )
                  .slice(
                    0,
                    500
                  );
              }
            );
          }

          lastConsoleId.current =
            authoritativeLastId;

          setConsoleError(
            null
          );

          consolePausedUntil.current =
            0;
        } catch (
          error
        ) {
          const text =
            String(error);

          setConsoleError(
            text
          );

          consolePausedUntil.current =
            Date.now() +
            15_000;
        } finally {
          consoleRequestInFlight.current =
            false;
        }
      },
      [
        busy,
        initialized
      ]
    );

  const refresh =
    useCallback(
      async () => {
        if (
          statusRequestInFlight.current ||
          busy ||
          !initialized
        ) {
          return;
        }

        if (
          !connectionReady(
            config
          )
        ) {
          setStatus(
            (
              current
            ) => ({
              ...(current ??
              {}),
              connected:
                false
            } as ArduinoStatus)
          );

          setMessage(
            translate('controller.configureDetail')
          );

          return;
        }

        statusRequestInFlight.current =
          true;

        try {
          const statusValue =
            await tauriApi.status();

          setStatus({
            ...statusValue,
            connected: true
          });

          statusHealthy.current =
            true;

          consecutiveStatusFailures.current =
            0;

          consolePausedUntil.current =
            0;

          const target =
            statusValue.ipAddress
              ? `${statusValue.ipAddress}:${config.localArduinoPort || 80}`
              : `${config.localArduinoIp || config.arduinoIp}:${config.localArduinoPort || config.arduinoPort}`;

          setMessage(
            translate('controller.connected', { target })
          );
        } catch (
          error
        ) {
          consecutiveStatusFailures.current +=
            1;

          statusHealthy.current =
            false;

          const pause =
            Math.min(
              60_000,
              10_000 *
                consecutiveStatusFailures.current
            );

          consolePausedUntil.current =
            Date.now() +
            pause;

          setStatus(
            (
              current
            ) => ({
              ...(current ??
              {}),
              connected:
                false
            } as ArduinoStatus)
          );

          setMessage(
            translate('controller.unreachable', { error: String(error) })
          );
        } finally {
          statusRequestInFlight.current =
            false;

          try {
            const values =
              await tauriApi.networkLogs();

            setNetworkLogs(
              values
                .slice()
                .reverse()
            );
          } catch {
            // A helyi hálózati napló hibája nem írja felül az Arduino állapotát.
          }
        }
      },
      [
        busy,
        config,
        initialized
      ]
    );

  const refreshFirmware =
    useCallback(
      async () => {
        if (!capabilities.otaSupported) {
          setFirmware(null);
          setMessage(
            translate('controller.mobileOtaDisabled')
          );
          return;
        }

        setBusy(
          true
        );

        try {
          const value =
            await tauriApi.firmwareStatus();

          setFirmware(
            value
          );

          setMessage(
            value.message
          );
        } catch (
          error
        ) {
          setMessage(
            translate('controller.firmwareCheckError', { error: String(error) })
          );
        } finally {
          setBusy(
            false
          );
        }
      },
      [capabilities.otaSupported]
    );

  useEffect(
    () => {
      if (!capabilities.otaSupported) {
        return;
      }

      let disposed =
        false;

      const unlistenPromise =
        tauriApi.listenOtaProgress(
          (
            entry
          ) => {
            if (
              disposed
            ) {
              return;
            }

            setOtaLogs(
              (
                current
              ) => [
                ...current,
                entry
              ].slice(
                -300
              )
            );

            setOtaStage(
              entry.stage ||
              'OTA'
            );

            if (
              typeof entry.progress ===
              'number'
            ) {
              setOtaProgress(
                Math.max(
                  0,
                  Math.min(
                    100,
                    entry.progress
                  )
                )
              );
            }

            setFirmware(
              (
                current
              ) =>
                current
                  ? {
                      ...current,
                      state:
                        entry.level ===
                        'error'
                          ? 'error'
                          : entry.progress ===
                              100
                            ? 'success'
                            : 'updating',
                      message:
                        entry.message,
                      progress:
                        entry.progress ??
                        current.progress,
                      phase:
                        entry.stage
                    }
                  : current
            );
          }
        );

      return () => {
        disposed =
          true;

        void unlistenPromise.then(
          (
            unlisten
          ) =>
            unlisten()
        );
      };
    },
    []
  );

  useEffect(
    () => {
      let active =
        true;

      void (
        async () => {
          const runtime =
            await tauriApi
              .runtimeCapabilities()
              .catch(
                () => ({
                  platform:
                    'unknown',
                  mobile:
                    false,
                  otaSupported:
                    true
                })
              );

          await tauriApi
            .migrateNativeCredentials();

          const saved =
            await tauriApi
              .loadConfig()
              .catch(
                () =>
                  fallbackConfig
              );

          const merged =
            migrateLegacyPlaceholder(
              saved,
              runtime.platform
            );

          const localSchedules =
            await tauriApi
              .loadSchedules()
              .catch(
                () => []
              );

          if (
            !active
          ) {
            return;
          }

          setCapabilities(
            runtime
          );

          setConfig(
            merged
          );

          setSchedules(
            localSchedules
          );

          setScheduleSync({
            status: 'local-cache',
            count: localSchedules.length,
            revision: null,
            checksum: '',
            emptyActionCount:
              localSchedules.filter(
                (schedule) =>
                  schedule.leds.length === 0
              ).length,
            recoveredLegacyActionCount: 0,
            lastError: null
          });

          if (
            connectionReady(
              merged
            )
          ) {
            setMessage(
              translate('controller.profileLoaded')
            );
          } else {
            setMessage(
              translate('controller.firstSetup')
            );
          }

          setInitialized(
            true
          );
        }
      )();

      return () => {
        active =
          false;
      };
    },
    []
  );

  useEffect(
    () => {
      if (
        !initialized ||
        busy ||
        !connectionReady(
          config
        )
      ) {
        return;
      }

      void refresh();

      const timer =
        window.setInterval(
          () =>
            void refresh(),
          20_000
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      refresh,
      initialized,
      busy,
      config
    ]
  );

  useEffect(
    () => {
      if (
        !initialized ||
        busy ||
        activePage !==
          'logs' ||
        !connectionReady(
          config
        )
      ) {
        return;
      }

      const starter =
        window.setTimeout(
          () =>
            void refreshConsole(
              true
            ),
          1_500
        );

      const timer =
        window.setInterval(
          () =>
            void refreshConsole(),
          5_000
        );

      return () => {
        window.clearTimeout(
          starter
        );

        window.clearInterval(
          timer
        );
      };
    },
    [
      refreshConsole,
      initialized,
      busy,
      activePage,
      config
    ]
  );

  const syncTimeWithComputer =
    async () => {
      setBusy(
        true
      );

      try {
        const syncedStatus =
          await tauriApi
            .syncTimeConfig();

        setStatus({
          ...syncedStatus,
          connected: true
        });

        statusHealthy.current =
          true;

        setMessage(
          translate(
            'controller.timeSynced',
            {
              zone:
                syncedStatus
                  .timezoneId ??
                config.timezoneId
            }
          )
        );
      } catch (
        error
      ) {
        setMessage(
          translate(
            'controller.timeSyncError',
            {
              error:
                String(error)
            }
          )
        );

        throw error;
      } finally {
        setBusy(
          false
        );
      }
    };

  const persistConfig =
    async () => {
      await tauriApi.saveConfig(
        config
      );

      await tauriApi.syncTimeConfig();

      if (
        capabilities.otaSupported &&
        otaPassword
      ) {
        await tauriApi.saveOtaPassword(
          otaPassword
        );

        setOtaPassword(
          ''
        );
      }
    };

  const resetAfterConnectionChange =
    () => {
      lastConsoleId.current =
        0;

      setLogs(
        []
      );

      setConsoleError(
        null
      );

      statusHealthy.current =
        false;

      consecutiveStatusFailures.current =
        0;

      consolePausedUntil.current =
        0;
    };

  const saveConfig =
    async () => {
      setBusy(
        true
      );

      try {
        await persistConfig();

        resetAfterConnectionChange();

        setMessage(
          capabilities.mobile
            ? translate('controller.mobileProfileSaved')
            : translate('controller.profileSaved')
        );
      } catch (
        error
      ) {
        setMessage(
          translate('controller.saveError', { error: String(error) })
        );
      } finally {
        setBusy(
          false
        );
      }

      window.setTimeout(
        () =>
          void refresh(),
        250
      );
    };

  const testConnection =
    async () => {
      setBusy(
        true
      );

      try {
        await persistConfig();

        resetAfterConnectionChange();

        const statusValue =
          await tauriApi.status();

        setStatus({
          ...statusValue,
          connected: true
        });

        statusHealthy.current =
          true;

        const target =
          statusValue.ipAddress
            ? `${statusValue.ipAddress}:${statusValue.otaPort ?? config.localArduinoPort}`
            : `${config.localArduinoIp || config.arduinoIp}:${config.localArduinoPort || config.arduinoPort}`;

        setMessage(
          `Arduino kapcsolat sikeres: ${target} • firmware ${statusValue.firmwareVersion ?? 'ismeretlen'}`
        );
      } catch (
        error
      ) {
        statusHealthy.current =
          false;

        setStatus(
          (
            current
          ) => ({
            ...(current ??
            {}),
            connected:
              false
          } as ArduinoStatus)
        );

        setMessage(
          `Arduino kapcsolat tesztje sikertelen: ${String(error)}`
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  const updateStrip =
    async (
      strip: LedStrip
    ) => {
      setBusy(
        true
      );

      try {
        await tauriApi.setLed(
          strip
        );

        setMessage(
          translate('controller.ledSet', { id: strip.id })
        );
      } catch (
        error
      ) {
        setMessage(
          `LED ${strip.id} hiba: ${String(error)}`
        );
      } finally {
        setBusy(
          false
        );
      }

      window.setTimeout(
        () =>
          void refresh(),
        250
      );
    };

  const syncSchedulesFromArduino =
    useCallback(
      async ():
        Promise<ScheduleSyncSnapshot> => {
        setBusy(true);
        setScheduleSync(
          (current) => ({
            ...current,
            status: 'syncing',
            lastError: null
          })
        );

        try {
          const snapshot =
            await tauriApi
              .loadSchedulesFromArduino();

          setSchedules(
            snapshot.schedules
          );

          setScheduleSync({
            status: 'verified',
            count: snapshot.count,
            revision: snapshot.revision,
            checksum: snapshot.checksum,
            emptyActionCount:
              snapshot.emptyActionCount,
            recoveredLegacyActionCount:
              snapshot.recoveredLegacyActionCount,
            lastError: null
          });

          setMessage(
            translate('controller.schedulesLoaded', { count: snapshot.count })
          );

          return snapshot;
        } catch (
          error
        ) {
          const message =
            String(error);

          setScheduleSync(
            (current) => ({
              ...current,
              status: 'error',
              lastError: message
            })
          );

          setMessage(
            translate('controller.readError', { error: message })
          );

          throw error;
        } finally {
          setBusy(false);
        }
      },
      []
    );

  const saveSchedules =
    useCallback(
      async (
        next: LedSchedule[],
        expectedRevision:
          number |
          null,
        force = false
      ):
        Promise<ScheduleSaveResult> => {
        setBusy(true);
        setScheduleSync(
          (current) => ({
            ...current,
            status: 'syncing',
            lastError: null
          })
        );

        try {
          const result =
            await tauriApi
              .saveSchedules(
                next,
                expectedRevision,
                force
              );

          setSchedules(
            result.schedules
          );

          setScheduleSync({
            status: 'verified',
            count: result.count,
            revision: result.revision,
            checksum: result.checksum,
            emptyActionCount:
              result.emptyActionCount,
            recoveredLegacyActionCount:
              result.recoveredLegacyActionCount,
            lastError: null
          });

          setMessage(
            translate('controller.schedulesUploaded', { count: result.count })
          );

          return result;
        } catch (
          error
        ) {
          const message =
            String(error);

          setScheduleSync(
            (current) => ({
              ...current,
              status: 'error',
              lastError: message
            })
          );

          setMessage(
            translate('controller.scheduleSyncError', { error: message })
          );

          throw error;
        } finally {
          setBusy(false);
        }
      },
      []
    );

  useEffect(
    () => {
      if (
        !initialized ||
        busy ||
        !status?.connected ||
        !connectionReady(
          config
        )
      ) {
        return;
      }

      const targetKey =
        [
          config.protocol,
          config.arduinoIp,
          config.arduinoPort,
          config.arduinoApiPath
        ].join('|');

      if (
        scheduleAutoSyncKey.current ===
        targetKey
      ) {
        return;
      }

      scheduleAutoSyncKey.current =
        targetKey;

      void syncSchedulesFromArduino()
        .catch(() => undefined);
    },
    [
      busy,
      config,
      initialized,
      status?.connected,
      syncSchedulesFromArduino
    ]
  );

  const runLedTest =
    async (
      preset: LedTestPreset
    ) => {
      setBusy(
        true
      );

      try {
        if (
          !testSnapshot.current
        ) {
          testSnapshot.current =
            (
              status?.strips ??
              []
            ).map(
              (
                strip
              ) => ({
                ...strip,
                color: [
                  ...strip.color
                ] as [
                  number,
                  number,
                  number
                ]
              })
            );
        }

        const presets:
          Record<
            LedTestPreset,
            Omit<
              LedStrip,
              'id'
            > & {
              color: [
                number,
                number,
                number
              ];
            }
          > = {
            night: {
              enabled: true,
              brightness: 40,
              effect: 0,
              speed: 50,
              color: [
                0,
                0,
                255
              ]
            },
            rainbow: {
              enabled: true,
              brightness: 180,
              effect: 3,
              speed: 45,
              color: [
                255,
                255,
                255
              ]
            },
            breathe: {
              enabled: true,
              brightness: 140,
              effect: 2,
              speed: 35,
              color: [
                80,
                140,
                255
              ]
            }
          };

        for (
          const id of [
            1,
            2,
            3
          ]
        ) {
          await tauriApi.setLed({
            id,
            ...presets[
              preset
            ]
          });
        }

        setMessage(
          `LED teszt elindítva: ${
            preset ===
            'night'
              ? translate('controller.testNight')
              : preset ===
                  'rainbow'
                ? translate('controller.testRainbow')
                : translate('controller.testBreathe')
          }.`
        );
      } catch (
        error
      ) {
        setMessage(
          `LED teszthiba: ${String(error)}`
        );
      } finally {
        setBusy(
          false
        );
      }

      window.setTimeout(
        () =>
          void refresh(),
        250
      );
    };

  const stopLedTest =
    async () => {
      setBusy(
        true
      );

      try {
        const restore =
          testSnapshot.current;

        if (
          restore?.length
        ) {
          for (
            const strip of
              restore
          ) {
            await tauriApi.setLed(
              strip
            );
          }
        } else {
          for (
            const id of [
              1,
              2,
              3
            ]
          ) {
            await tauriApi.setLed({
              id,
              enabled: false,
              brightness: 0,
              effect: 0,
              speed: 50,
              color: [
                0,
                0,
                0
              ]
            });
          }
        }

        testSnapshot.current =
          null;

        setMessage(
          translate('controller.testStopped')
        );
      } catch (
        error
      ) {
        setMessage(
          translate('controller.testStopError', { error: String(error) })
        );
      } finally {
        setBusy(
          false
        );
      }

      window.setTimeout(
        () =>
          void refresh(),
        250
      );
    };

  const updateFirmware =
    async () => {
      if (
        !capabilities.otaSupported
      ) {
        setMessage(
          translate('controller.mobileFirmwareDisabled')
        );

        return;
      }

      setBusy(
        true
      );

      setOtaLogs(
        []
      );

      setOtaProgress(
        0
      );

      setOtaStage(
        translate('controller.stageStart')
      );

      try {
        const result =
          await tauriApi.firmwareUpdate();

        setFirmware(
          result
        );

        setOtaProgress(
          100
        );

        setOtaStage(
          translate('controller.stageDone')
        );

        setMessage(
          result.message
        );
      } catch (
        error
      ) {
        const text =
          String(error);

        setOtaStage(
          'Hiba'
        );

        const failureLog:
          OtaProgressEvent = {
            timestamp:
              Date.now(),
            stage: 'Hiba',
            level: 'error',
            message: text
          };

        setOtaLogs(
          (
            current
          ) =>
            current.at(
              -1
            )?.message ===
            text
              ? current
              : [
                  ...current,
                  failureLog
                ].slice(
                  -300
                )
        );

        setMessage(
          translate('controller.otaError', { error: text })
        );
      } finally {
        setBusy(
          false
        );
      }

      window.setTimeout(
        () =>
          void refresh(),
        1_500
      );
    };

  const cancelFirmware =
    async () => {
      try {
        const accepted =
          await tauriApi.firmwareCancel();
        setOtaStage(
          accepted
            ? translate('controller.cancelStage')
            : translate('controller.noActiveOperation')
        );
        setMessage(
          accepted
            ? translate('controller.cancelSent')
            : translate('controller.nothingToCancel')
        );
      } catch (error) {
        setMessage(
          translate('controller.cancelError', { error: String(error) })
        );
      }
    };

  return {
    capabilities,
    config,
    setConfig,
    status,
    logs,
    consoleError,
    networkLogs,
    schedules,
    scheduleSync,
    firmware,
    otaLogs,
    otaProgress,
    otaStage,
    otaPassword,
    setOtaPassword,
    busy,
    message,
    refresh,
    refreshFirmware,
    syncTimeWithComputer,
    saveConfig,
    testConnection,
    updateStrip,
    runLedTest,
    stopLedTest,
    saveSchedules,
    syncSchedulesFromArduino,
    updateFirmware,
    cancelFirmware
  };
}
