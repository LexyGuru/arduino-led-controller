import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Download,
  Save,
  Trash2,
  Upload,
  Wifi
} from 'lucide-react';

import {
  open,
  save
} from '@tauri-apps/plugin-dialog';

import {
  V5ScheduleConflict
} from '../components/v5/V5ScheduleConflict';

import {
  V5ScheduleState
} from '../components/v5/V5ScheduleState';

import {
  useV5Schedules
} from '../hooks/useV5Schedules';

import {
  tauriApi
} from '../services/tauriApi';

import {
  scheduleFingerprint
} from '../services/v5ScheduleModels.mjs';

import type {
  LedSchedule,
  ScheduleLed
} from '../types';

const DAYS = [
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
  'Vasárnap'
];

const DAY_SHORT = [
  'H',
  'K',
  'Sze',
  'Cs',
  'P',
  'Szo',
  'V'
];

const EFFECTS = [
  'Statikus',
  'Villogás',
  'Lélegzés',
  'Szivárvány',
  'Futófény'
];

type Action =
  | 'none'
  | 'on'
  | 'off';

type FormLed = {
  id: number;
  action: Action;
  brightness: number;
  effect: number;
  speed: number;
  color:
    [
      number,
      number,
      number
    ];
};

const emptyLeds =
  (): FormLed[] =>
    [1, 2, 3].map(
      (id) => ({
        id,
        action: 'none',
        brightness: 10,
        effect: 0,
        speed: 50,
        color: [0, 0, 255]
      })
    );

const rgbToHex = (
  color:
    [
      number,
      number,
      number
    ]
) =>
  `#${
    color
      .map(
        (value) =>
          value
            .toString(16)
            .padStart(2, '0')
      )
      .join('')
  }`;

const hexToRgb = (
  value: string
):
  [
    number,
    number,
    number
  ] => [
    parseInt(
      value.slice(1, 3),
      16
    ),
    parseInt(
      value.slice(3, 5),
      16
    ),
    parseInt(
      value.slice(5, 7),
      16
    )
  ];

export function SchedulesPage({
  schedules:
    legacySchedules,
  busy:
    legacyBusy,
  onSave:
    directSave,
  onSync:
    directSync
}: {
  schedules:
    LedSchedule[];
  busy:
    boolean;
  onSave:
    (
      schedules:
        LedSchedule[]
    ) => void;
  onSync:
    () => void;
}) {
  const state =
    useV5Schedules({
      legacySchedules,
      legacyBusy,
      directSave,
      directSync
    });

  const [
    draft,
    setDraft
  ] =
    useState<
      LedSchedule[]
    >(
      state.schedules
    );

  const [
    baseFingerprint,
    setBaseFingerprint
  ] =
    useState(
      state.remoteFingerprint
    );

  const [
    selectedDays,
    setSelectedDays
  ] =
    useState<number[]>(
      [1]
    );

  const [
    time,
    setTime
  ] =
    useState('19:30');

  const [
    formLeds,
    setFormLeds
  ] =
    useState<FormLed[]>(
      emptyLeds()
    );

  const [
    editingId,
    setEditingId
  ] =
    useState<
      string |
      null
    >(null);

  const [
    fileMessage,
    setFileMessage
  ] =
    useState('');

  const [
    conflict,
    setConflict
  ] =
    useState(false);

  const dirty =
    scheduleFingerprint(
      draft
    ) !==
    baseFingerprint;

  useEffect(
    () => {
      if (!dirty) {
        setDraft(
          state.schedules
        );
        setBaseFingerprint(
          state.remoteFingerprint
        );
        setConflict(false);
      } else if (
        state.remoteFingerprint !==
        baseFingerprint
      ) {
        setConflict(true);
      }
    },
    [
      baseFingerprint,
      dirty,
      state.remoteFingerprint,
      state.schedules
    ]
  );

  const grouped =
    useMemo(
      () =>
        DAYS.map(
          (
            name,
            index
          ) => ({
            name,
            day:
              index + 1,
            items:
              draft
                .filter(
                  (item) =>
                    item.day ===
                    index + 1
                )
                .sort(
                  (
                    left,
                    right
                  ) =>
                    left.time
                      .localeCompare(
                        right.time
                      )
                )
          })
        ),
      [draft]
    );

  const setFormLed = (
    id: number,
    patch:
      Partial<FormLed>
  ) =>
    setFormLeds(
      (items) =>
        items.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch
                }
              : item
        )
    );

  const resetForm = () => {
    setEditingId(null);
    setSelectedDays([1]);
    setTime('19:30');
    setFormLeds(
      emptyLeds()
    );
  };

  const saveDraft =
    async (
      force = false
    ) => {
      try {
        await state.save(
          draft,
          {
            expectedFingerprint:
              baseFingerprint,
            force
          }
        );

        setBaseFingerprint(
          scheduleFingerprint(
            draft
          )
        );
        setConflict(false);
      } catch (
        error
      ) {
        if (
          (
            error as {
              code?: string;
            }
          )?.code ===
            'SCHEDULE_CONFLICT'
        ) {
          setConflict(true);
        }
      }
    };

  const reloadRemote =
    async () => {
      const result =
        await state.refresh();

      if (result) {
        setDraft(result);
        setBaseFingerprint(
          scheduleFingerprint(
            result
          )
        );
        setConflict(false);
      }
    };

  const addOrUpdate = () => {
    const leds:
      ScheduleLed[] =
      formLeds
        .filter(
          (led) =>
            led.action !==
            'none'
        )
        .map(
          (led) => ({
            id: led.id,
            enabled:
              led.action ===
              'on',
            brightness:
              led.brightness,
            effect:
              led.effect,
            speed:
              led.speed,
            color:
              led.color
          })
        );

    if (
      !selectedDays.length ||
      !leds.length
    ) {
      return;
    }

    setDraft(
      (items) => {
        const remaining =
          editingId
            ? items.filter(
                (item) =>
                  item.id !==
                  editingId
              )
            : items;

        const additions =
          selectedDays.map(
            (day) => ({
              id:
                crypto
                  .randomUUID(),
              day,
              time,
              leds:
                leds.map(
                  (led) => ({
                    ...led,
                    color:
                      [
                        ...led.color
                      ] as [
                        number,
                        number,
                        number
                      ]
                  })
                )
            })
          );

        return [
          ...remaining,
          ...additions
        ].sort(
          (
            left,
            right
          ) =>
            left.day -
              right.day ||
            left.time
              .localeCompare(
                right.time
              )
        );
      }
    );

    resetForm();
  };

  const edit = (
    schedule:
      LedSchedule
  ) => {
    setEditingId(
      schedule.id
    );
    setSelectedDays(
      [schedule.day]
    );
    setTime(
      schedule.time
    );

    setFormLeds(
      [1, 2, 3].map(
        (id) => {
          const led =
            schedule.leds
              .find(
                (entry) =>
                  entry.id ===
                  id
              );

          return led
            ? {
                ...led,
                action:
                  led.enabled
                    ? 'on'
                    : 'off',
                speed:
                  led.speed ??
                  50,
                color:
                  [
                    ...led.color
                  ] as [
                    number,
                    number,
                    number
                  ]
              }
            : {
                id,
                action: 'none',
                brightness: 10,
                effect: 0,
                speed: 50,
                color: [0, 0, 255]
              };
        }
      )
    );

    globalThis.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const exportJson =
    async () => {
      try {
        const path =
          await save({
            title:
              'Heti LED-időzítések mentése',
            defaultPath:
              'weekly-led-schedules.json',
            filters: [
              {
                name:
                  'JSON időzítés',
                extensions:
                  ['json']
              }
            ]
          });

        if (!path) {
          return;
        }

        await tauriApi
          .exportSchedulesFile(
            path,
            draft
          );

        setFileMessage(
          `${draft.length} időzítés elmentve: ${path}`
        );
      } catch (
        error
      ) {
        setFileMessage(
          `Letöltési hiba: ${String(error)}`
        );
      }
    };

  const importJson =
    async () => {
      try {
        const selected =
          await open({
            title:
              'Heti LED-időzítések megnyitása',
            multiple: false,
            directory: false,
            filters: [
              {
                name:
                  'JSON időzítés',
                extensions:
                  ['json']
              }
            ]
          });

        if (
          !selected ||
          Array.isArray(
            selected
          )
        ) {
          return;
        }

        const imported =
          await tauriApi
            .importSchedulesFile(
              selected
            );

        setDraft(imported);
        setFileMessage(
          `${imported.length} időzítés betöltve. Mentéskor konfliktusellenőrzés fut.`
        );
      } catch (
        error
      ) {
        setFileMessage(
          `Feltöltési hiba: ${String(error)}`
        );
      }
    };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            V5 ÉS ARDUINO IDŐZÍTÉSEK
          </p>
          <h2>
            Heti időzítés
          </h2>
          <p className="muted">
            A V5 szerverlista az elsődleges; mentés előtt automatikus
            konfliktusellenőrzés fut.
          </p>
        </div>

        <div className="page-actions">
          <button
            onClick={
              () =>
                void saveDraft()
            }
            disabled={
              state.busy ||
              !dirty
            }
          >
            <Save size={17} />
            Mentés
          </button>

          <button
            className="secondary"
            onClick={
              () =>
                void state
                  .syncArduino()
            }
            disabled={
              state.busy
            }
          >
            <Wifi size={17} />
            Szinkron Arduino-ra
          </button>

          <button
            className="secondary"
            onClick={
              () =>
                void exportJson()
            }
            disabled={
              state.busy
            }
          >
            <Download size={17} />
            JSON mentés
          </button>

          <button
            className="secondary"
            onClick={
              () =>
                void importJson()
            }
            disabled={
              state.busy
            }
          >
            <Upload size={17} />
            JSON betöltés
          </button>
        </div>
      </div>

      <V5ScheduleState
        source={
          state.source
        }
        dirty={dirty}
        conflict={conflict}
        runner={
          state.runner
        }
        busy={
          state.busy
        }
        onRefresh={
          () =>
            void reloadRemote()
        }
        onTick={
          () =>
            void state
              .forceTick()
        }
      />

      <V5ScheduleConflict
        visible={conflict}
        busy={
          state.busy
        }
        onReload={
          () =>
            void reloadRemote()
        }
        onForceSave={
          () =>
            void saveDraft(
              true
            )
        }
      />

      {(fileMessage ||
        state.notice ||
        state.error) && (
        <section className="panel">
          {fileMessage && (
            <p className="notice-text">
              {fileMessage}
            </p>
          )}

          {state.notice && (
            <p className="notice-text">
              {state.notice}
            </p>
          )}

          {state.error && (
            <p className="console-warning">
              {state.error.code}
              {': '}
              {state.error.message}
            </p>
          )}
        </section>
      )}

      <section className="panel schedule-editor">
        <div className="schedule-top-row">
          <label>
            Idő
            <input
              type="time"
              value={time}
              onChange={
                (event) =>
                  setTime(
                    event.target
                      .value
                  )
              }
            />
          </label>

          <div className="day-picker">
            <label className="select-all">
              <input
                type="checkbox"
                checked={
                  selectedDays
                    .length ===
                  7
                }
                onChange={
                  (event) =>
                    setSelectedDays(
                      event.target
                        .checked
                        ? [
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7
                          ]
                        : []
                    )
                }
              />
              Összes nap kijelölése
            </label>

            <div className="day-buttons">
              {DAY_SHORT.map(
                (
                  name,
                  index
                ) => (
                  <button
                    type="button"
                    key={name}
                    className={
                      selectedDays
                        .includes(
                          index + 1
                        )
                        ? 'day-active'
                        : 'secondary'
                    }
                    onClick={
                      () =>
                        setSelectedDays(
                          (current) =>
                            current
                              .includes(
                                index + 1
                              )
                              ? current
                                  .filter(
                                    (day) =>
                                      day !==
                                      index +
                                        1
                                  )
                              : [
                                  ...current,
                                  index +
                                    1
                                ].sort()
                        )
                    }
                  >
                    {name}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="schedule-led-grid">
          {formLeds.map(
            (led) => (
              <article
                className="schedule-led-card"
                key={led.id}
              >
                <h3>
                  LED {led.id}
                </h3>

                <label>
                  Művelet

                  <select
                    value={
                      led.action
                    }
                    onChange={
                      (event) =>
                        setFormLed(
                          led.id,
                          {
                            action:
                              event
                                .target
                                .value as Action
                          }
                        )
                    }
                  >
                    <option value="none">
                      Nincs módosítás
                    </option>
                    <option value="on">
                      Bekapcsolás
                    </option>
                    <option value="off">
                      Kikapcsolás
                    </option>
                  </select>
                </label>

                <label>
                  Szín

                  <div className="color-row">
                    <input
                      type="color"
                      disabled={
                        led.action ===
                        'none'
                      }
                      value={
                        rgbToHex(
                          led.color
                        )
                      }
                      onChange={
                        (event) =>
                          setFormLed(
                            led.id,
                            {
                              color:
                                hexToRgb(
                                  event
                                    .target
                                    .value
                                )
                            }
                          )
                      }
                    />

                    <code>
                      RGB(
                      {led.color
                        .join(',')}
                      )
                    </code>
                  </div>
                </label>

                <label>
                  Fényerő
                  {' '}
                  <b>
                    {led.brightness}
                  </b>

                  <input
                    type="range"
                    min="0"
                    max="255"
                    disabled={
                      led.action ===
                      'none'
                    }
                    value={
                      led.brightness
                    }
                    onChange={
                      (event) =>
                        setFormLed(
                          led.id,
                          {
                            brightness:
                              Number(
                                event
                                  .target
                                  .value
                              )
                          }
                        )
                    }
                  />
                </label>

                <label>
                  Effekt

                  <select
                    disabled={
                      led.action ===
                      'none'
                    }
                    value={
                      led.effect
                    }
                    onChange={
                      (event) =>
                        setFormLed(
                          led.id,
                          {
                            effect:
                              Number(
                                event
                                  .target
                                  .value
                              )
                          }
                        )
                    }
                  >
                    {EFFECTS.map(
                      (
                        name,
                        index
                      ) => (
                        <option
                          value={index}
                          key={name}
                        >
                          {name}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </article>
            )
          )}
        </div>

        <div className="v5-actions">
          <button
            className="schedule-add"
            disabled={
              state.busy ||
              !selectedDays
                .length ||
              formLeds.every(
                (led) =>
                  led.action ===
                  'none'
              )
            }
            onClick={
              addOrUpdate
            }
          >
            {editingId
              ? 'Időzítés módosítása'
              : 'Új időzítés mentése'}
          </button>

          {editingId && (
            <button
              className="secondary"
              onClick={
                resetForm
              }
            >
              Szerkesztés megszakítása
            </button>
          )}
        </div>
      </section>

      <section className="schedule-groups">
        {grouped.map(
          (group) =>
            group.items.length >
              0 && (
              <article
                className="panel day-group"
                key={group.day}
              >
                <div className="day-group-title">
                  <h3>
                    {group.name}
                  </h3>
                  <span>
                    {group.items.length}
                    {' esemény'}
                  </span>
                </div>

                {group.items.map(
                  (schedule) => (
                    <div
                      className="schedule-summary"
                      key={
                        schedule.id
                      }
                    >
                      <button
                        className="summary-main"
                        onClick={
                          () =>
                            edit(
                              schedule
                            )
                        }
                      >
                        <strong>
                          {schedule.time}
                        </strong>

                        <span>
                          {schedule.leds
                            .map(
                              (led) =>
                                `LED ${led.id} ${led.enabled ? 'be' : 'ki'} · ${led.brightness} · RGB(${led.color.join(',')})`
                            )
                            .join(
                              ' | '
                            )}
                        </span>
                      </button>

                      <button
                        className="icon-button danger"
                        title="Törlés"
                        onClick={
                          () =>
                            setDraft(
                              (items) =>
                                items.filter(
                                  (item) =>
                                    item.id !==
                                    schedule.id
                                )
                            )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )
                )}
              </article>
            )
        )}
      </section>

      {!draft.length && (
        <section className="panel empty">
          <h3>
            Nincs időzítés
          </h3>
          <p>
            Állíts be időpontot és legalább egy LED-műveletet,
            vagy tölts be JSON-fájlt.
          </p>
        </section>
      )}
    </div>
  );
}
