import {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Moon,
  Power,
  Sparkles,
  Square,
  Waves
} from 'lucide-react';

import {
  V5ConnectionWarning
} from '../components/v5/V5ConnectionWarning';

import {
  V5DataSourceBadge
} from '../components/v5/V5DataSourceBadge';

import {
  V5LedBulkActions
} from '../components/v5/V5LedBulkActions';

import {
  useV5Leds
} from '../hooks/useV5Leds';

import { useI18n } from '../i18n';

import type {
  LedStrip
} from '../types';

const effectKeys = ['effects.0','effects.1','effects.2','effects.3','effects.4'];

const SEND_DELAY_MS =
  4000;

const rgbToHex = (
  [
    red,
    green,
    blue
  ]:
    [
      number,
      number,
      number
    ]
) =>
  `#${
    [
      red,
      green,
      blue
    ]
      .map(
        (value) =>
          value
            .toString(16)
            .padStart(
              2,
              '0'
            )
      )
      .join('')
  }`;

const hexToRgb = (
  hex: string
):
  [
    number,
    number,
    number
  ] => [
    parseInt(
      hex.slice(
        1,
        3
      ),
      16
    ),
    parseInt(
      hex.slice(
        3,
        5
      ),
      16
    ),
    parseInt(
      hex.slice(
        5,
        7
      ),
      16
    )
  ];

const clamp = (
  value: number,
  minimum: number,
  maximum: number
) =>
  Math.min(
    maximum,
    Math.max(
      minimum,
      Number.isFinite(
        value
      )
        ? value
        : minimum
    )
  );

export type LedTestPreset =
  | 'night'
  | 'rainbow'
  | 'breathe';

type LedCardProps = {
  strip: LedStrip;
  busy: boolean;
  onUpdate:
    (
      strip: LedStrip
    ) => void;
};

function LedCard({
  strip,
  busy,
  onUpdate
}: LedCardProps) {
  const { t } = useI18n();
  const [
    draft,
    setDraft
  ] =
    useState<LedStrip>(
      strip
    );

  const [
    pendingField,
    setPendingField
  ] =
    useState<
      'brightness' |
      'speed' |
      null
    >(null);

  const timer =
    useRef<
      number |
      null
    >(null);

  const latest =
    useRef<LedStrip>(
      strip
    );

  useEffect(
    () => {
      latest.current =
        draft;
    },
    [draft]
  );

  useEffect(
    () => {
      if (
        timer.current ===
          null
      ) {
        setDraft(strip);
        latest.current =
          strip;
      }
    },
    [strip]
  );

  useEffect(
    () =>
      () => {
        if (
          timer.current !==
            null
        ) {
          window.clearTimeout(
            timer.current
          );
        }
      },
    []
  );

  const sendNow = (
    next: LedStrip
  ) => {
    if (
      timer.current !==
        null
    ) {
      window.clearTimeout(
        timer.current
      );
    }

    timer.current =
      null;
    setPendingField(
      null
    );
    setDraft(next);
    latest.current =
      next;
    onUpdate(next);
  };

  const scheduleSend = (
    next: LedStrip,
    field:
      'brightness' |
      'speed'
  ) => {
    setDraft(next);
    latest.current =
      next;
    setPendingField(
      field
    );

    if (
      timer.current !==
        null
    ) {
      window.clearTimeout(
        timer.current
      );
    }

    timer.current =
      window.setTimeout(
        () => {
          timer.current =
            null;
          setPendingField(
            null
          );
          onUpdate(
            latest.current
          );
        },
        SEND_DELAY_MS
      );
  };

  const numberKeyDown = (
    event:
      React.KeyboardEvent<
        HTMLInputElement
      >
  ) => {
    if (
      event.key ===
        'Enter'
    ) {
      event.currentTarget
        .blur();
      sendNow(
        latest.current
      );
    }
  };

  return (
    <article className={`panel led-card core-v3-led-card ${draft.enabled ? 'is-enabled' : 'is-disabled'}`} data-led-id={draft.id}>
      <div className="led-card-head core-v3-led-card-head">
        <div>
          <span>
            {t('leds.channel',{id:draft.id})}
          </span>
          <h3>
            LED {draft.id}
          </h3>
        </div>

        <button
          className={
            `power core-v3-power-control ${
              draft.enabled
                ? 'on'
                : ''
            }`
          }
          disabled={busy}
          onClick={
            () =>
              sendNow({
                ...draft,
                enabled:
                  !draft.enabled
              })
          }
        >
          <Power size={22} />
        </button>
      </div>

      <div
        className="color-preview core-v3-led-preview"
        style={{
          background:
            rgbToHex(
              draft.color
            ),
          opacity:
            draft.enabled
              ? 1
              : .25
        }}
      />

      <label className="core-control-field core-control-field--color">
        <span className="core-control-label">{t('leds.color')}</span>

        <div className="color-row core-control-row">
          <input
            className="core-color-input"
            type="color"
            value={
              rgbToHex(
                draft.color
              )
            }
            onChange={
              (event) =>
                sendNow({
                  ...draft,
                  color:
                    hexToRgb(
                      event.target
                        .value
                    )
                })
            }
          />

          <code className="core-value-pill">
            {rgbToHex(
              draft.color
            ).toUpperCase()}
          </code>
        </div>
      </label>

      <label className="core-control-field">
        <span className="core-control-label">{t('leds.brightness')}</span>

        <div className="slider-number-row core-control-row core-range-row">
          <input
            className="core-range-input"
            type="range"
            min="0"
            max="255"
            value={
              draft.brightness
            }
            onChange={
              (event) =>
                scheduleSend({
                  ...draft,
                  brightness:
                    clamp(
                      Number(
                        event.target
                          .value
                      ),
                      0,
                      255
                    )
                }, 'brightness')
            }
          />

          <input
            className="value-number core-number-input"
            type="number"
            min="0"
            max="255"
            value={
              draft.brightness
            }
            onChange={
              (event) =>
                scheduleSend({
                  ...draft,
                  brightness:
                    clamp(
                      Number(
                        event.target
                          .value
                      ),
                      0,
                      255
                    )
                }, 'brightness')
            }
            onBlur={
              () =>
                sendNow(
                  latest.current
                )
            }
            onKeyDown={
              numberKeyDown
            }
          />
        </div>

        <span className="send-hint core-control-hint">
          {pendingField ===
            'brightness'
            ? t('leds.delayedSend')
            : t('leds.brightnessHelp')}
        </span>
      </label>

      <label className="core-control-field">
        <span className="core-control-label">{t('leds.effect')}</span>

        <select
          className="core-select-input"
          value={
            draft.effect
          }
          onChange={
            (event) =>
              sendNow({
                ...draft,
                effect:
                  Number(
                    event.target
                      .value
                  )
              })
          }
        >
          {effectKeys.map(
            (
              key,
              index
            ) => (
              <option
                key={key}
                value={index}
              >
                {t(key)}
              </option>
            )
          )}
        </select>
      </label>

      <label className="core-control-field">
        <span className="core-control-label">{t('leds.speed')}</span>

        <div className="slider-number-row">
          <input
            className="core-range-input"
            type="range"
            min="1"
            max="100"
            value={
              draft.speed
            }
            onChange={
              (event) =>
                scheduleSend({
                  ...draft,
                  speed:
                    clamp(
                      Number(
                        event.target
                          .value
                      ),
                      1,
                      100
                    )
                }, 'speed')
            }
          />

          <input
            className="value-number core-number-input"
            type="number"
            min="1"
            max="100"
            value={
              draft.speed
            }
            onChange={
              (event) =>
                scheduleSend({
                  ...draft,
                  speed:
                    clamp(
                      Number(
                        event.target
                          .value
                      ),
                      1,
                      100
                    )
                }, 'speed')
            }
            onBlur={
              () =>
                sendNow(
                  latest.current
                )
            }
            onKeyDown={
              numberKeyDown
            }
          />
        </div>

        <span className="send-hint">
          {pendingField ===
            'speed'
            ? t('leds.delayedSend')
            : t('leds.speedHelp')}
        </span>
      </label>
    </article>
  );
}

export function LedsPage({
  strips:
    legacyStrips,
  busy:
    legacyBusy,
  onUpdate:
    directUpdate,
  onTest:
    directTest,
  onStopTest:
    directStop
}: {
  strips:
    LedStrip[];
  busy:
    boolean;
  onUpdate:
    (
      strip: LedStrip
    ) => void;
  onTest:
    (
      preset:
        LedTestPreset
    ) => void;
  onStopTest:
    () => void;
}) {
  const { t } = useI18n();
  const state =
    useV5Leds({
      legacyStrips,
      legacyBusy,
      directUpdate,
      directTest,
      directStop
    });

  return (
    <div className="page beta4-leds-page core-v3-leds-page" data-core-controls="3.0">
      <div className="page-heading core-v3-leds-heading">
        <div>
          <p className="eyebrow">
            {t('leds.eyebrow')}
          </p>
          <h2>
            {t('leds.title')}
          </h2>
          <p className="muted">
            {t('leds.description')}
          </p>
        </div>

        <V5DataSourceBadge
          source={
            state.source
          }
        />
      </div>

      {state.error && (
        <V5ConnectionWarning
          title={
            t('leds.apiError')
          }
          message={
            t('leds.apiErrorDetail',{code:state.error.code,message:state.error.message})
          }
          busy={
            state.busy
          }
          onRetry={
            () =>
              void state.refresh()
          }
        />
      )}

      {state.lastResult && (
        <div className="v5-led-result">
          {state.lastResult}
        </div>
      )}

      <V5LedBulkActions
        busy={state.busy}
        onAllOn={
          () =>
            void state.allOn()
        }
        onAllOff={
          () =>
            void state.stop()
        }
        onReset={
          () =>
            void state.reset()
        }
        onRefresh={
          () =>
            void state.refresh()
        }
      />

      <section className="panel beta2-scene-panel core-v3-command-panel core-v3-scene-panel">
        <div>
          <p className="eyebrow">
            {t('beta2.scene.eyebrow')}
          </p>
          <h2>
            {t('beta2.scene.title')}
          </h2>
          <p className="muted">
            {t('beta2.scene.subtitle')}
          </p>
        </div>

        <div className="beta2-scene-actions core-v3-command-grid">
          <button className="secondary core-v3-command-chip" disabled={state.busy} onClick={() => void state.applyScene('relax')}>
            <Moon size={17} />
            {t('beta2.scene.relax')}
          </button>
          <button className="secondary core-v3-command-chip" disabled={state.busy} onClick={() => void state.applyScene('movie')}>
            <Square size={16} />
            {t('beta2.scene.movie')}
          </button>
          <button className="secondary core-v3-command-chip" disabled={state.busy} onClick={() => void state.applyScene('gaming')}>
            <Sparkles size={17} />
            {t('beta2.scene.gaming')}
          </button>
          <button className="secondary core-v3-command-chip" disabled={state.busy} onClick={() => void state.applyScene('party')}>
            <Waves size={17} />
            {t('beta2.scene.party')}
          </button>
          <button className="danger core-v3-command-chip" disabled={state.busy} onClick={() => void state.applyScene('all-off')}>
            <Power size={17} />
            {t('beta2.scene.allOff')}
          </button>
        </div>
      </section>

      <section className="panel test-panel core-v3-command-panel core-v3-test-panel">
        <div>
          <p className="eyebrow">
            {t('leds.quickCheck')}
          </p>
          <h2>
            {t('leds.testTitle')}
          </h2>
          <p className="muted">
            {t('leds.testDescription')}
          </p>
        </div>

        <div className="test-actions core-v3-command-grid">
          <button
            className="secondary core-v3-command-chip"
            disabled={
              state.busy
            }
            onClick={
              () =>
                void state
                  .runPreset(
                    'night'
                  )
            }
          >
            <Moon size={17} />
            {t('leds.nightBlue')}
          </button>

          <button
            className="secondary core-v3-command-chip"
            disabled={
              state.busy
            }
            onClick={
              () =>
                void state
                  .runPreset(
                    'rainbow'
                  )
            }
          >
            <Sparkles
              size={17}
            />
            {t('leds.rainbowTest')}
          </button>

          <button
            className="secondary core-v3-command-chip"
            disabled={
              state.busy
            }
            onClick={
              () =>
                void state
                  .runPreset(
                    'breathe'
                  )
            }
          >
            <Waves size={17} />
            {t('leds.breatheTest')}
          </button>

          <button
            className="danger core-v3-command-chip"
            disabled={
              state.busy
            }
            onClick={
              () =>
                void state.stop()
            }
          >
            <Square size={16} />
            {t('leds.stopTest')}
          </button>
        </div>
      </section>

      <section className="led-grid core-v3-led-grid">
        {state.strips.map(
          (strip) => (
            <LedCard
              key={strip.id}
              strip={strip}
              busy={state.busy}
              onUpdate={
                (next) =>
                  void state
                    .update(next)
              }
            />
          )
        )}
      </section>
    </div>
  );
}
