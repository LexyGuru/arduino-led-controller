import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  CopyPlus,
  Database,
  Download,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Upload
} from 'lucide-react';

import {
  open,
  save
} from '@tauri-apps/plugin-dialog';

import {
  useV5Schedules
} from '../hooks/useV5Schedules';

import {
  tauriApi
} from '../services/tauriApi';

import {
  scheduleFingerprint
} from '../services/v5ScheduleModels.mjs';

import { useI18n } from '../i18n';

import type {
  LedSchedule,
  ScheduleBackup,
  ScheduleLed,
  ScheduleSaveProgressEvent,
  ScheduleSaveResult,
  ScheduleSyncSnapshot,
  ScheduleSyncState
} from '../types';

const tauriRuntime = typeof globalThis !== 'undefined' && '__TAURI_INTERNALS__' in globalThis;

async function pickBrowserJsonFile():Promise<LedSchedule[]|null>{return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=async()=>{try{const file=input.files?.[0];if(!file){resolve(null);return}const value=JSON.parse(await file.text());const schedules=Array.isArray(value)?value:Array.isArray(value?.schedules)?value.schedules:null;if(!schedules)throw new Error('A JSON nem tartalmaz schedules listát.');resolve(schedules as LedSchedule[])}catch(error){reject(error)}};input.click()})}
function downloadBrowserJson(json:string){const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='weekly-led-schedules.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}

const dayKeys = [
  'days.1',
  'days.2',
  'days.3',
  'days.4',
  'days.5',
  'days.6',
  'days.7'
];

const dayShortKeys = [
  'daysShort.1',
  'daysShort.2',
  'daysShort.3',
  'daysShort.4',
  'daysShort.5',
  'daysShort.6',
  'daysShort.7'
];

const effectKeys = [
  'effects.0',
  'effects.1',
  'effects.2',
  'effects.3',
  'effects.4'
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
  scheduleSync,
  busy:
    legacyBusy,
  onSave:
    directSave,
  onSync:
    directSync
}: {
  schedules:
    LedSchedule[];
  scheduleSync:
    ScheduleSyncState;
  busy:
    boolean;
  onSave:
    (
      schedules:
        LedSchedule[],
      expectedRevision:
        number |
        null,
      force?: boolean
    ) => Promise<ScheduleSaveResult>;
  onSync:
    () => Promise<ScheduleSyncSnapshot>;
}) {
  const { t, language } = useI18n();
  const state =
    useV5Schedules({
      legacySchedules,
      legacyBusy,
      syncState:
        scheduleSync,
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
    baseRevision,
    setBaseRevision
  ] =
    useState<number | null>(
      state.remoteRevision
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

  const [saveProgress, setSaveProgress] =
    useState<ScheduleSaveProgressEvent | null>(null);
  const saveStartedAt = useRef<number | null>(null);

  const [
    backups,
    setBackups
  ] = useState<ScheduleBackup[]>([]);

  const [
    conflict,
    setConflict
  ] =
    useState(false);

  const [
    copySourceDay,
    setCopySourceDay
  ] =
    useState(1);

  const [
    copyTargetDays,
    setCopyTargetDays
  ] =
    useState<number[]>([2]);

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
        setBaseRevision(
          state.remoteRevision
        );
        setConflict(false);
      } else if (
        state.remoteFingerprint !==
          baseFingerprint ||
        state.remoteRevision !==
          baseRevision
      ) {
        setConflict(true);
      }
    },
    [
      baseFingerprint,
      baseRevision,
      dirty,
      state.remoteFingerprint,
      state.remoteRevision,
      state.schedules
    ]
  );

  useEffect(() => {
    void tauriApi.listScheduleBackups().then(setBackups).catch(() => undefined);
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void tauriApi.listenScheduleSaveProgress((entry) => {
      if (!disposed) setSaveProgress(entry);
    }).then((dispose) => {
      if (disposed) dispose(); else unlisten = dispose;
    }).catch(() => undefined);
    return () => { disposed = true; unlisten?.(); };
  }, []);

  const deleteAllSchedules = async () => {
    if (!state.canWrite || draft.length === 0) return;
    const confirmation = globalThis.prompt(
      t('schedules.deletePrompt',{count:draft.length})
    );
    if (confirmation !== t('schedules.deleteToken')) return;
    try {
      const backup = await tauriApi.createScheduleBackup(
        draft,
        baseRevision,
        state.syncState.checksum
      );
      const result = await state.save([], { expectedRevision: baseRevision, force: false });
      setDraft(result.schedules);
      setBaseFingerprint(scheduleFingerprint(result.schedules));
      setBaseRevision(result.revision);
      setBackups(await tauriApi.listScheduleBackups());
      setFileMessage(t('schedules.deleted',{count:backup.count,id:backup.id}));
      setConflict(false);
    } catch (error) {
      setFileMessage(t('schedules.deleteError',{error:String(error)}));
    }
  };

  const restoreScheduleBackup = async (backup: ScheduleBackup) => {
    if (!state.canWrite) return;
    if (!globalThis.confirm(t('schedules.restoreConfirm',{count:backup.count}))) return;
    try {
      await tauriApi.createScheduleBackup(draft, baseRevision, state.syncState.checksum);
      const result = await state.save(backup.schedules, { expectedRevision: baseRevision, force: false });
      setDraft(result.schedules);
      setBaseFingerprint(scheduleFingerprint(result.schedules));
      setBaseRevision(result.revision);
      setBackups(await tauriApi.listScheduleBackups());
      setFileMessage(t('schedules.restored',{id:backup.id}));
      setConflict(false);
    } catch (error) {
      setFileMessage(t('schedules.restoreError',{error:String(error)}));
    }
  };

  const grouped =
    useMemo(
      () =>
        dayKeys.map(
          (
            key,
            index
          ) => ({
            name: t(key),
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
      [draft, t]
    );

  const copyDaySchedules =
    () => {
      const source =
        draft.filter(
          (item) =>
            item.day ===
            copySourceDay
        );

      if (
        !source.length ||
        !copyTargetDays.length
      ) {
        setFileMessage(
          t('beta2.schedule.empty')
        );
        return;
      }

      const targetSet =
        new Set(
          copyTargetDays.filter(
            (day) =>
              day !==
              copySourceDay
          )
        );

      if (!targetSet.size) {
        setFileMessage(
          t('beta2.schedule.sameDayOnly')
        );
        return;
      }

      const sourceTimes =
        new Set(
          source.map(
            (item) =>
              item.time
          )
        );

      setDraft(
        (current) => {
          const remaining =
            current.filter(
              (item) =>
                !(
                  targetSet.has(
                    item.day
                  ) &&
                  sourceTimes.has(
                    item.time
                  )
                )
            );

          const copied =
            [...targetSet]
              .flatMap(
                (day) =>
                  source.map(
                    (item) => ({
                      ...item,
                      id:
                        crypto.randomUUID(),
                      day,
                      leds:
                        item.leds.map(
                          (led) => ({
                            ...led,
                            color:
                              [...led.color] as [
                                number,
                                number,
                                number
                              ]
                          })
                        )
                    })
                  )
              );

          return [
            ...remaining,
            ...copied
          ].sort(
            (
              left,
              right
            ) =>
              left.day -
                right.day ||
              left.time.localeCompare(
                right.time
              )
          );
        }
      );

      setFileMessage(
        `${t('beta2.schedule.copied',{source:source.length,targets:targetSet.size})} ${t('beta2.schedule.saveHint')}`
      );
    };

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
        saveStartedAt.current = Date.now();
        setSaveProgress({timestamp:Date.now(),stage:'preparing',level:'info',message:t('schedules.saveProgress.preparing'),current:0,total:draft.length,progress:null});
        const result =
          await state.save(
            draft,
            {
              expectedRevision:
                baseRevision,
              force
            }
          );

        setDraft(
          result.schedules
        );
        setBaseFingerprint(
          scheduleFingerprint(
            result.schedules
          )
        );
        setBaseRevision(
          result.revision
        );
        setConflict(false);
        setSaveProgress({timestamp:Date.now(),stage:'success',level:'success',message:t('schedules.saveProgress.success'),current:result.count,total:result.count,progress:100,revisionBefore:result.revisionBefore,revisionAfter:result.revisionAfter,checksum:result.checksumAfter,durationMs:saveStartedAt.current==null?null:Date.now()-saveStartedAt.current});
      } catch (
        error
      ) {
        setSaveProgress((current)=>({timestamp:Date.now(),stage:'error',level:'error',message:String(error),current:current?.current??0,total:current?.total??draft.length,progress:current?.progress??null,revisionBefore:current?.revisionBefore??baseRevision,revisionAfter:current?.revisionAfter??null,checksum:current?.checksum??null,durationMs:saveStartedAt.current==null?null:Date.now()-saveStartedAt.current}));
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
        setDraft(
          result.schedules
        );
        setBaseFingerprint(
          scheduleFingerprint(
            result.schedules
          )
        );
        setBaseRevision(
          result.revision
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

  const editAndReveal = (
    schedule: LedSchedule
  ) => {
    edit(schedule);

    globalThis.requestAnimationFrame(() => {
      document
        .getElementById('schedule-editor')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    });
  };

  const exportJson =
    async () => {
      try {
        const json = JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            count: draft.length,
            schedules: draft
          },
          null,
          2
        );

        if (json.length < 40 || !json.includes('\"schedules\"')) {
          throw new Error(t('schedules.exportEmpty'));
        }

        const file = new File(
          [json],
          'weekly-led-schedules.json',
          { type: 'application/json' }
        );

        if (
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title: t('schedules.exportTitle'),
            files: [file]
          });
          setFileMessage(
            t('schedules.exportShared',{count:draft.length,bytes:json.length})
          );
          return;
        }

        if (!tauriRuntime) {
          downloadBrowserJson(json);
          setFileMessage(t('schedules.exportSaved',{count:draft.length,path:'weekly-led-schedules.json',bytes:json.length}));
          return;
        }

        const path =
          await save({
            title:
              t('schedules.exportTitle'),
            defaultPath:
              'weekly-led-schedules.json',
            filters: [
              {
                name:
                  t('schedules.jsonFilter'),
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
          t('schedules.exportSaved',{count:draft.length,path,bytes:json.length})
        );
      } catch (
        error
      ) {
        setFileMessage(
          t('schedules.exportError',{error:String(error)})
        );
      }
    };

  const importJson =
    async () => {
      try {
        if (!tauriRuntime) {
          const imported=await pickBrowserJsonFile();
          if(!imported)return;
          setDraft(imported);
          setFileMessage(t('schedules.imported',{count:imported.length}));
          return;
        }

        const selected =
          await open({
            title:
              t('schedules.exportTitle'),
            multiple: false,
            directory: false,
            filters: [
              {
                name:
                  t('schedules.jsonFilter'),
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
          t('schedules.imported',{count:imported.length})
        );
      } catch (
        error
      ) {
        setFileMessage(
          t('schedules.importError',{error:String(error)})
        );
      }
    };

  return (
    <div className="page v55-schedules-page beta4-schedules-redesign core-v3-management-page core-v3-schedules-page" data-core-management="schedules">
      <div className="page-heading v55-management-heading core-v3-management-heading">
        <div>
          <p className="eyebrow">
            ARDUINO DIRECT API V1
          </p>
          <h2>
            {t('schedules.title')}
          </h2>
          <p className="muted">
            {t('schedules.description')}
          </p>
        </div>

        <div className="page-actions core-v3-management-actions">
          <button
            onClick={
              () =>
                void saveDraft()
            }
            disabled={
              state.busy ||
              !dirty ||
              !state.canWrite
            }
          >
            <Save size={17} />
            {t('schedules.saveArduino')}
          </button>

          <button
            className="secondary"
            onClick={
              () =>
                void reloadRemote()
            }
            disabled={
              state.busy
            }
          >
            <RefreshCw size={17} />
            {t('schedules.loadArduino')}
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
            {t('schedules.saveJson')}
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
            {t('schedules.loadJson')}
          </button>

          <button
            className="danger"
            onClick={() => void deleteAllSchedules()}
            disabled={state.busy || !state.canWrite || draft.length === 0}
          >
            <Trash2 size={17} />
            {t('schedules.deleteAll')}
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              {t('schedules.verified')}
            </p>
            <h2>
              Schedule szinkron
            </h2>
          </div>

          {state.canWrite
            ? <CheckCircle2 className="ok" />
            : <Database />}
        </div>

        <div className="details-grid compact">
          <div>
            <span>
              {t('schedules.arduinoRecords')}
            </span>
            <strong>
              {state.syncState.count}
            </strong>
          </div>

          <div>
            <span>
              {t('schedules.editList')}
            </span>
            <strong>
              {draft.length}
            </strong>
          </div>

          <div>
            <span>
              Revision
            </span>
            <strong>
              {state.syncState.revision ?? '—'}
            </strong>
          </div>

          <div>
            <span>
              Checksum
            </span>
            <strong>
              {state.syncState.checksum || '—'}
            </strong>
          </div>
        </div>

        {!state.canWrite && (
          <div className="notice">
            <AlertTriangle size={18} />
            <p>
              {t('schedules.writeDisabled')}
            </p>
          </div>
        )}

        {state.syncState.recoveredLegacyActionCount > 0 && (
          <div className="notice">
            <AlertTriangle size={18} />
            <p>
              {t('schedules.recoveredLegacy',{
                count: state.syncState.recoveredLegacyActionCount
              })}
            </p>
          </div>
        )}

        {state.syncState.emptyActionCount > 0 && (
          <div className="notice">
            <AlertTriangle size={18} />
            <p>
              {t('schedules.emptyRecords',{
                count: state.syncState.emptyActionCount
              })}
            </p>
          </div>
        )}
      </section>

      {saveProgress && (
        <section className="schedule-save-progress-card" data-level={saveProgress.level} aria-live="polite">
          <div className="schedule-save-progress-head">
            <div className="schedule-save-progress-title">
              {saveProgress.level==='success'?<CheckCircle2 className="ok" size={19}/>:saveProgress.level==='error'?<AlertTriangle size={19}/>:<Save className="is-running" size={19}/>}
              <div><strong>{t('schedules.saveProgress.title')}</strong><small>{t(`schedules.saveProgress.${saveProgress.stage}`)}</small></div>
            </div>
            {saveProgress.total>0&&<span className="schedule-save-progress-count">{saveProgress.current} / {saveProgress.total}</span>}
          </div>
          <div className={`schedule-save-progress-track ${saveProgress.level==='info'&&saveProgress.stage!=='uploading'?'is-indeterminate':''}`}>
            <div className="schedule-save-progress-bar" style={{width:`${saveProgress.level==='success'?100:saveProgress.stage==='uploading'&&saveProgress.total>0?Math.round((saveProgress.current/saveProgress.total)*100):Math.max(4,saveProgress.progress??0)}%`}}/>
          </div>
          <div className="schedule-save-progress-details">
            {saveProgress.total>0&&<span>{t('schedules.saveProgress.records',{current:saveProgress.current,total:saveProgress.total})}</span>}
            {saveProgress.revisionBefore!=null&&saveProgress.revisionAfter!=null&&<span>{t('schedules.saveProgress.revision',{before:saveProgress.revisionBefore,after:saveProgress.revisionAfter})}</span>}
            {saveProgress.checksum&&<code>{saveProgress.checksum}</code>}
            {saveProgress.durationMs!=null&&<span>{t('schedules.saveProgress.duration',{seconds:(saveProgress.durationMs/1000).toFixed(1)})}</span>}
          </div>
          {saveProgress.level==='error'&&<p className="schedule-save-progress-error">{saveProgress.message}</p>}
        </section>
      )}

      <section className="schedule-week-overview" aria-label={t('schedules.title')}>
        <div className="schedule-week-overview-head">
          <div>
            <p className="eyebrow">{t('schedules.title')}</p>
            <h2>{t('schedules.editList')}</h2>
          </div>
          <span className="schedule-week-total">
            {draft.length}{t('schedules.eventCount',{count:draft.length})}
          </span>
        </div>

        <div className="schedule-week-grid">
          {grouped.map((group) => (
            <article className="schedule-day-card" key={group.day}>
              <div className="schedule-day-card-head">
                <h3>{group.name}</h3>
                <span>{group.items.length}</span>
              </div>

              <div className="schedule-day-items">
                {group.items.length === 0 ? (
                  <div className="schedule-day-empty">
                    {t('schedules.empty')}
                  </div>
                ) : (
                  group.items.map((schedule) => (
                    <div className="schedule-compact-card" key={schedule.id}>
                      <button
                        type="button"
                        className="schedule-compact-time"
                        disabled={!state.canWrite}
                        onClick={() => edit(schedule)}
                      >
                        {schedule.time}
                      </button>

                      <div className="schedule-led-chips">
                        {schedule.leds.length ? (
                          schedule.leds.map((led) => (
                            <span
                              className={`schedule-led-chip ${led.enabled ? 'is-on' : 'is-off'}`}
                              key={led.id}
                              title={t('schedules.ledSummary',{
                                id:led.id,
                                state:t(led.enabled?'common.on':'common.off'),
                                brightness:led.brightness,
                                color:led.color.join(',')
                              })}
                            >
                              <i
                                className="schedule-color-dot"
                                style={{ backgroundColor: `rgb(${led.color.join(',')})` }}
                              />
                              LED {led.id} · {t(led.enabled?'common.on':'common.off')} · {led.brightness}
                            </span>
                          ))
                        ) : (
                          <span className="schedule-no-action">
                            {t('schedules.noLedAction')}
                          </span>
                        )}
                      </div>

                      <div className="schedule-compact-actions">
                        <button
                          type="button"
                          className="icon-button secondary schedule-compact-edit"
                          title={t('schedules.edit')}
                          aria-label={t('schedules.edit')}
                          disabled={!state.canWrite}
                          onClick={() => editAndReveal(schedule)}
                        >
                          <Pencil size={15} />
                        </button>

                      <button
                        type="button"
                        className="icon-button danger schedule-compact-delete"
                        title={t('common.delete')}
                        disabled={!state.canWrite}
                        onClick={() =>
                          setDraft((items) =>
                            items.filter((item) => item.id !== schedule.id)
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel beta2-schedule-copy">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('beta2.schedule.eyebrow')}</p>
            <h2>{t('beta2.schedule.title')}</h2>
          </div>
          <CopyPlus />
        </div>

        <div className="beta2-copy-grid">
          <label>
            {t('beta2.schedule.sourceDay')}
            <select
              value={copySourceDay}
              onChange={(event) =>
                setCopySourceDay(
                  Number(event.target.value)
                )
              }
            >
              {dayKeys.map((key, index) => (
                <option key={key} value={index + 1}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="muted">{t('beta2.schedule.targetDays')}</span>
            <div className="beta2-copy-targets">
              {dayShortKeys.map((key, index) => {
                const day = index + 1;
                const active = copyTargetDays.includes(day);

                return (
                  <button
                    key={key}
                    type="button"
                    className={active ? 'secondary active' : 'secondary'}
                    disabled={day === copySourceDay}
                    onClick={() =>
                      setCopyTargetDays(
                        (current) =>
                          current.includes(day)
                            ? current.filter((value) => value !== day)
                            : [...current, day].sort()
                      )
                    }
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="beta2-copy-preview">
            {t('beta2.schedule.preview',{
              source: draft.filter((item) => item.day === copySourceDay).length,
              targets: copyTargetDays.filter((day) => day !== copySourceDay).length
            })}
          </div>

          <button
            type="button"
            className="secondary"
            disabled={
              state.busy ||
              !draft.some((item) => item.day === copySourceDay)
            }
            onClick={copyDaySchedules}
          >
            <CopyPlus size={17} />
            {t('beta2.schedule.copy')}
          </button>
        </div>
      </section>

      {conflict && (
        <section className="v5-schedule-conflict">
          <AlertTriangle size={22} />

          <div>
            <strong>
              {t('schedules.conflictTitle')}
            </strong>
            <span>
              {t('schedules.conflictHelp')}
            </span>
          </div>

          <div className="v5-actions">
            <button
              className="secondary"
              disabled={state.busy}
              onClick={
                () =>
                  void reloadRemote()
              }
            >
              <RefreshCw size={16} />
              {t('schedules.reload')}
            </button>
          </div>
        </section>
      )}

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

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{t('schedules.backupsEyebrow')}</p>
            <h2>{t('schedules.restore')}</h2>
          </div>
          <Database />
        </div>
        {backups.length === 0 ? (
          <p className="muted">{t('schedules.noBackups')}</p>
        ) : (
          <div className="v5-backup-list">
            {backups.slice(0, 10).map((backup) => (
              <article key={backup.id}>
                <div>
                  <strong>{t('schedules.recordCount',{count:backup.count})}</strong>
                  <small>{new Date(backup.createdAt).toLocaleString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU')} · revision {backup.revision ?? '—'}</small>
                  <code>{backup.checksum || backup.id}</code>
                </div>
                <button className="secondary" disabled={state.busy || !state.canWrite} onClick={() => void restoreScheduleBackup(backup)}>
                  {t('schedules.restoreButton')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="schedule-editor" className="panel schedule-editor">
        <div className="schedule-top-row">
          <label>
            {t('schedules.time')}
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
              {t('schedules.selectAllDays')}
            </label>

            <div className="day-buttons">
              {dayShortKeys.map(
                (
                  key,
                  index
                ) => (
                  <button
                    type="button"
                    key={key}
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
                    {t(key)}
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
                  {t('schedules.action')}

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
                      {t('schedules.noChange')}
                    </option>
                    <option value="on">
                      {t('schedules.turnOn')}
                    </option>
                    <option value="off">
                      {t('schedules.turnOff')}
                    </option>
                  </select>
                </label>

                <label>
                  {t('schedules.color')}

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
                  {t('schedules.brightness')}
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
                  {t('schedules.effect')}

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
                    {effectKeys.map(
                      (
                        key,
                        index
                      ) => (
                        <option
                          value={index}
                          key={key}
                        >
                          {t(key)}
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
              !state.canWrite ||
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
              ? t('schedules.edit')
              : t('schedules.new')}
          </button>

          {editingId && (
            <button
              className="secondary"
              onClick={
                resetForm
              }
            >
              {t('schedules.cancelEdit')}
            </button>
          )}
        </div>
      </section>



      {!draft.length && (
        <section className="panel empty">
          <h3>
            {t('schedules.empty')}
          </h3>
          <p>
            {t('schedules.emptyHelp')}
          </p>
        </section>
      )}
    </div>
  );
}
