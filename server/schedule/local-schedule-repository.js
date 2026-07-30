'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  SCHEDULE_LIMITS,
  normalizePortableSchedule,
  normalizeScheduleList
} = require('./schedule-validation');

const {
  ScheduleServiceError,
  ScheduleValidationError
} = require('./schedule-error');

const {
  EVENT_TOPICS
} = require('../events/topics');

function toPlainSchedule(
  schedule,
  id = null
) {
  const normalized =
    normalizePortableSchedule(
      schedule
    );

  return {
    id:
      id ||
      normalized.id ||
      crypto.randomUUID(),
    day:
      normalized.day,
    time:
      normalized.time,
    leds:
      normalized.leds.map(
        (led) => ({
          id: led.id,
          enabled:
            led.enabled,
          brightness:
            led.brightness,
          effect:
            led.effect,
          speed:
            led.speed,
          color: [
            ...led.color
          ]
        })
      )
  };
}

function sortSchedules(
  schedules
) {
  return [...schedules].sort(
    (left, right) =>
      left.day -
        right.day ||
      left.time
        .localeCompare(
          right.time
        ) ||
      left.id
        .localeCompare(
          right.id
        )
  );
}

class LocalScheduleRepository {
  constructor({
    filePath,
    backupDir,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      typeof filePath !==
        'string' ||
      !filePath.trim()
    ) {
      throw new TypeError(
        'A helyi schedule fájlútvonala kötelező.'
      );
    }

    this.filePath =
      filePath;
    this.backupDir =
      backupDir ||
      path.join(
        path.dirname(
          filePath
        ),
        'backups'
      );
    this.logger =
      logger;
    this.eventBus =
      eventBus;
    this.writeQueue =
      Promise.resolve();
  }

  async ensureDirectories() {
    await fs.promises.mkdir(
      path.dirname(
        this.filePath
      ),
      {
        recursive: true
      }
    );

    await fs.promises.mkdir(
      this.backupDir,
      {
        recursive: true
      }
    );
  }

  async list() {
    try {
      const parsed =
        JSON.parse(
          await fs.promises
            .readFile(
              this.filePath,
              'utf8'
            )
        );

      if (
        !Array.isArray(
          parsed
        )
      ) {
        throw new ScheduleServiceError(
          500,
          'LOCAL_SCHEDULE_FILE_INVALID',
          'A helyi schedule fájl nem tömböt tartalmaz.'
        );
      }

      return sortSchedules(
        parsed.map(
          (schedule) =>
            toPlainSchedule(
              schedule,
              schedule.id
            )
        )
      );
    } catch (error) {
      if (
        error.code ===
        'ENOENT'
      ) {
        return [];
      }

      if (
        error instanceof
        ScheduleServiceError
      ) {
        throw error;
      }

      throw new ScheduleServiceError(
        500,
        'LOCAL_SCHEDULE_READ_FAILED',
        'A helyi időzítések betöltése nem sikerült.',
        null,
        {
          cause:
            error
        }
      );
    }
  }

  async getById(id) {
    const normalizedId =
      String(id || '')
        .trim();

    const schedules =
      await this.list();

    return schedules.find(
      (schedule) =>
        schedule.id ===
        normalizedId
    ) || null;
  }

  enqueueWrite(operation) {
    const execution =
      this.writeQueue.then(
        operation,
        operation
      );

    this.writeQueue =
      execution.catch(
        () => undefined
      );

    return execution;
  }

  async writeAtomic(
    schedules
  ) {
    await this
      .ensureDirectories();

    const temporaryPath =
      `${this.filePath}.tmp-${process.pid}-${Date.now()}`;

    await fs.promises.writeFile(
      temporaryPath,
      `${JSON.stringify(
        sortSchedules(
          schedules
        ),
        null,
        2
      )}\n`,
      {
        encoding:
          'utf8',
        mode:
          0o600
      }
    );

    await fs.promises.rename(
      temporaryPath,
      this.filePath
    );

    try {
      await fs.promises.chmod(
        this.filePath,
        0o600
      );
    } catch (_) {
      // Platformfüggő.
    }
  }

  async createBackup(
    schedules
  ) {
    await this
      .ensureDirectories();

    const backupFile =
      `weekly-led-schedules.backup-${Date.now()}.json`;

    await fs.promises.writeFile(
      path.join(
        this.backupDir,
        backupFile
      ),
      `${JSON.stringify(
        schedules,
        null,
        2
      )}\n`,
      {
        encoding:
          'utf8',
        mode:
          0o600
      }
    );

    return backupFile;
  }

  async create(input) {
    return this.enqueueWrite(
      async () => {
        const days =
          Array.isArray(
            input?.days
          )
            ? input.days
            : [
                input?.day
              ];

        const uniqueDays =
          [
            ...new Set(
              days.map(
                Number
              )
            )
          ];

        if (
          uniqueDays.length ===
          0
        ) {
          throw new ScheduleValidationError(
            'EMPTY_SCHEDULE_DAYS',
            'Legalább egy napot ki kell választani.'
          );
        }

        const created =
          uniqueDays.map(
            (day) =>
              toPlainSchedule({
                ...input,
                day
              })
          );

        const current =
          await this.list();

        if (
          current.length +
          created.length >
          SCHEDULE_LIMITS
            .maximumImportEntries
        ) {
          throw new ScheduleValidationError(
            'TOO_MANY_LOCAL_SCHEDULES',
            `Legfeljebb ${SCHEDULE_LIMITS.maximumImportEntries} helyi időzítés tárolható.`
          );
        }

        await this
          .writeAtomic([
            ...current,
            ...created
          ]);

        this.eventBus
          ?.publish?.(
            EVENT_TOPICS
              .LOCAL_SCHEDULE_CREATED,
            {
              ids:
                created.map(
                  (schedule) =>
                    schedule.id
                ),
              count:
                created.length
            }
          );

        return created;
      }
    );
  }

  async update(
    id,
    input
  ) {
    return this.enqueueWrite(
      async () => {
        const normalizedId =
          String(id || '')
            .trim();

        const current =
          await this.list();

        const index =
          current.findIndex(
            (schedule) =>
              schedule.id ===
              normalizedId
          );

        if (index < 0) {
          throw new ScheduleServiceError(
            404,
            'LOCAL_SCHEDULE_NOT_FOUND',
            'A helyi időzítés nem található.',
            {
              id:
                normalizedId
            }
          );
        }

        const updated =
          toPlainSchedule(
            input,
            normalizedId
          );

        const schedules =
          [...current];

        schedules[index] =
          updated;

        await this
          .writeAtomic(
            schedules
          );

        this.eventBus
          ?.publish?.(
            EVENT_TOPICS
              .LOCAL_SCHEDULE_UPDATED,
            {
              id:
                normalizedId,
              day:
                updated.day,
              time:
                updated.time
            }
          );

        return updated;
      }
    );
  }

  async remove(id) {
    return this.enqueueWrite(
      async () => {
        const current =
          await this.list();

        const filtered =
          current.filter(
            (schedule) =>
              schedule.id !==
              id
          );

        if (
          filtered.length ===
          current.length
        ) {
          throw new ScheduleServiceError(
            404,
            'LOCAL_SCHEDULE_NOT_FOUND',
            'A helyi időzítés nem található.',
            {
              id
            }
          );
        }

        await this
          .writeAtomic(
            filtered
          );

        this.eventBus
          ?.publish?.(
            EVENT_TOPICS
              .LOCAL_SCHEDULE_REMOVED,
            {
              id
            }
          );

        return {
          removed:
            true,
          id
        };
      }
    );
  }

  async replaceAll(
    input,
    {
      createBackup =
        true
    } = {}
  ) {
    return this.enqueueWrite(
      async () => {
        const source =
          Array.isArray(
            input
          )
            ? input
            : input
                ?.schedules;

        const normalized =
          normalizeScheduleList(
            source,
            {
              maximumEntries:
                SCHEDULE_LIMITS
                  .maximumImportEntries,
              allowEmpty:
                true
            }
          ).map(
            (schedule) =>
              toPlainSchedule(
                schedule,
                schedule.id
              )
          );

        const current =
          await this.list();

        const backupFile =
          createBackup
            ? await this
                .createBackup(
                  current
                )
            : null;

        await this
          .writeAtomic(
            normalized
          );

        this.eventBus
          ?.publish?.(
            EVENT_TOPICS
              .LOCAL_SCHEDULE_IMPORTED,
            {
              count:
                normalized.length,
              backupFile
            }
          );

        return {
          count:
            normalized.length,
          backupFile
        };
      }
    );
  }

  async exportDocument() {
    return {
      format:
        'arduino-led-controller-schedules',
      version:
        1,
      exportedAt:
        new Date()
          .toISOString(),
      schedules:
        await this.list()
    };
  }
}

module.exports = {
  LocalScheduleRepository,
  sortSchedules,
  toPlainSchedule
};
