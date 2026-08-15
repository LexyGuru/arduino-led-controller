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
  ledCommand,
  normalizeLedList,
  presetCommands,
  shouldUseDirectFallback
} from '../services/v5LedModels.mjs';

import { translate } from '../i18n/runtime';

import type {
  LedStrip
} from '../types';

type Preset =
  | 'night'
  | 'rainbow'
  | 'breathe';

export type V5SceneId =
  | 'relax'
  | 'movie'
  | 'gaming'
  | 'party'
  | 'all-off';

function sceneCommands(
  strips: LedStrip[],
  scene: V5SceneId
): LedStrip[] {
  const defaults =
    strips.length
      ? strips
      : [1, 2, 3].map((id) => ({
          id,
          enabled: false,
          brightness: 0,
          effect: 0,
          speed: 50,
          color: [0, 0, 0] as [number, number, number]
        }));

  return defaults.map((strip) => {
    if (scene === 'all-off') {
      return {
        ...strip,
        enabled: false,
        brightness: 0,
        effect: 0
      };
    }

    if (scene === 'relax') {
      return {
        ...strip,
        enabled: true,
        brightness: 70,
        effect: 2,
        speed: 24,
        color: [80, 120, 255] as [number, number, number]
      };
    }

    if (scene === 'movie') {
      return {
        ...strip,
        enabled: strip.id !== 2,
        brightness: strip.id === 1 ? 28 : 18,
        effect: 0,
        speed: 20,
        color:
          strip.id === 1
            ? [255, 70, 30] as [number, number, number]
            : [20, 20, 110] as [number, number, number]
      };
    }

    if (scene === 'gaming') {
      return {
        ...strip,
        enabled: true,
        brightness: 145,
        effect: strip.id === 2 ? 3 : 2,
        speed: 55,
        color:
          strip.id === 1
            ? [0, 180, 255] as [number, number, number]
            : strip.id === 2
              ? [255, 0, 180] as [number, number, number]
              : [90, 0, 255] as [number, number, number]
      };
    }

    return {
      ...strip,
      enabled: true,
      brightness: 210,
      effect: 3,
      speed: 72,
      color: [255, 255, 255] as [number, number, number]
    };
  });
}

function isLedEvent(
  event: unknown
) {
  return String(
    (
      event as {
        topic?: unknown;
      }
    )?.topic ||
    ''
  ).startsWith(
    'led.'
  );
}

export function useV5Leds({
  legacyStrips,
  legacyBusy,
  directUpdate,
  directTest,
  directStop
}: {
  legacyStrips:
    LedStrip[];
  legacyBusy:
    boolean;
  directUpdate:
    (
      strip: LedStrip
    ) => void;
  directTest:
    (
      preset: Preset
    ) => void;
  directStop:
    () => void;
}) {
  const {
    api,
    connectivity,
    auth
  } =
    useDesktopApi();

  const [
    apiStrips,
    setApiStrips
  ] =
    useState<
      LedStrip[]
    >([]);

  const [
    busy,
    setBusy
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

  const [
    lastResult,
    setLastResult
  ] =
    useState('');

  const authenticated =
    auth.authenticated ===
      true;

  const online =
    connectivity.online ===
      true;

  const directFallback =
    shouldUseDirectFallback({
      authenticated,
      online
    });

  const source:
    'legacy-direct' |
    'api-v2' =
      directFallback
        ? 'legacy-direct'
        : 'api-v2';

  const refresh =
    useCallback(
      async () => {
        if (directFallback) {
          setApiStrips([]);
          return legacyStrips;
        }

        try {
          const result =
            await api.led.list();

          const normalized =
            normalizeLedList(
              result,
              legacyStrips
            );

          setApiStrips(
            normalized
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

          return null;
        }
      },
      [
        api,
        directFallback,
        legacyStrips
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
              isLedEvent(event)
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

  const strips =
    useMemo(
      () =>
        directFallback
          ? legacyStrips
          : (
              apiStrips.length
                ? apiStrips
                : legacyStrips
            ),
      [
        apiStrips,
        directFallback,
        legacyStrips
      ]
    );

  const update =
    useCallback(
      async (
        strip: LedStrip
      ) => {
        if (directFallback) {
          directUpdate(strip);
          setLastResult(
            translate('v5led.direct',{id:strip.id})
          );
          return;
        }

        const previous =
          apiStrips;

        setApiStrips(
          (current) =>
            current.map(
              (entry) =>
                entry.id ===
                  strip.id
                  ? strip
                  : entry
            )
        );
        setBusy(true);
        setError(null);

        try {
          await api.led.update(
            strip.id,
            ledCommand(strip)
          );

          setLastResult(
            translate('v5led.sent',{id:strip.id})
          );

          await refresh();
        } catch (
          requestError
        ) {
          setApiStrips(
            previous
          );
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
        apiStrips,
        directFallback,
        directUpdate,
        refresh
      ]
    );

  const runPreset =
    useCallback(
      async (
        preset: Preset
      ) => {
        if (directFallback) {
          directTest(preset);
          return;
        }

        const commands =
          presetCommands(
            strips,
            preset
          );

        setBusy(true);
        setError(null);
        setApiStrips(commands);

        try {
          await api.led
            .updateMany(
              commands.map(
                (strip) => ({
                  id:
                    strip.id,
                  command:
                    ledCommand(
                      strip
                    )
                })
              )
            );

          setLastResult(
            `API v2 tesztminta: ${preset}`
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
        directTest,
        refresh,
        strips
      ]
    );

  const applyScene =
    useCallback(
      async (
        scene: V5SceneId
      ) => {
        const commands =
          sceneCommands(
            strips,
            scene
          );

        if (directFallback) {
          for (const strip of commands) {
            directUpdate(strip);
          }

          setLastResult(
            translate('beta2.scene.directResult',{scene})
          );

          return;
        }

        setBusy(true);
        setError(null);
        setApiStrips(commands);

        try {
          await api.led.updateMany(
            commands.map(
              (strip) => ({
                id: strip.id,
                command:
                  ledCommand(strip)
              })
            )
          );

          setLastResult(
            translate('beta2.scene.apiResult',{scene})
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
        directUpdate,
        refresh,
        strips
      ]
    );

  const stop =
    useCallback(
      async () => {
        if (directFallback) {
          directStop();
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await api.led.allOff();

          setLastResult(
            'Minden LED kikapcsolva API v2-n'
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
        directStop,
        refresh
      ]
    );

  const allOn =
    useCallback(
      async () => {
        if (directFallback) {
          for (
            const strip
            of strips
          ) {
            directUpdate({
              ...strip,
              enabled: true
            });
          }
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await api.led.allOn();
          setLastResult(
            'Minden LED bekapcsolva API v2-n'
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
        directUpdate,
        refresh,
        strips
      ]
    );

  const reset =
    useCallback(
      async () => {
        if (directFallback) {
          await refresh();
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await api.led.reset();
          setLastResult(
            translate('v5led.reset')
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

  return {
    strips,
    busy:
      busy ||
      legacyBusy,
    source,
    error,
    lastResult,
    refresh,
    update,
    runPreset,
    applyScene,
    stop,
    allOn,
    reset
  };
}
