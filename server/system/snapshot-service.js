'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  SystemServiceError
} = require('./system-error');

function safeSnapshotId(value) {
  const normalized =
    String(value || '').trim();

  if (
    !/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$/i
      .test(normalized)
  ) {
    throw SystemServiceError
      .invalid(
        'INVALID_SNAPSHOT_ID',
        'Érvénytelen snapshot azonosító.'
      );
  }

  return normalized;
}

async function sha256File(filePath) {
  const hash =
    crypto.createHash(
      'sha256'
    );

  const stream =
    fs.createReadStream(
      filePath
    );

  for await (
    const chunk
    of stream
  ) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function timestampId() {
  const stamp =
    new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  return `${stamp}-${crypto.randomBytes(4).toString('hex')}`;
}

class SystemSnapshotService {
  constructor({
    snapshotsDir,
    sources,
    maximumSnapshots = 10,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      typeof snapshotsDir !==
        'string' ||
      !snapshotsDir.trim()
    ) {
      throw new TypeError(
        'A snapshotsDir kötelező.'
      );
    }

    this.snapshotsDir =
      snapshotsDir;
    this.sources =
      Array.isArray(sources)
        ? sources
        : [];
    this.maximumSnapshots =
      Math.max(
        2,
        Number(
          maximumSnapshots
        ) || 10
      );
    this.logger = logger;
    this.eventBus = eventBus;
  }

  snapshotPath(id) {
    return path.join(
      this.snapshotsDir,
      safeSnapshotId(id)
    );
  }

  async ensureRoot() {
    await fs.promises.mkdir(
      this.snapshotsDir,
      {
        recursive: true
      }
    );
  }

  async collectFiles(
    source,
    prefix = ''
  ) {
    const stats =
      await fs.promises.stat(
        source.path
      );

    if (stats.isFile()) {
      return [{
        source:
          source.path,
        relative:
          path.join(
            source.name,
            prefix ||
            path.basename(
              source.path
            )
          )
      }];
    }

    const entries =
      await fs.promises.readdir(
        source.path,
        {
          withFileTypes: true
        }
      );

    const files = [];

    for (const entry of entries) {
      const childPrefix =
        path.join(
          prefix,
          entry.name
        );

      const childPath =
        path.join(
          source.path,
          entry.name
        );

      if (entry.isDirectory()) {
        files.push(
          ...await this.collectFiles(
            {
              ...source,
              path:
                childPath
            },
            childPrefix
          )
        );
      } else if (entry.isFile()) {
        files.push({
          source:
            childPath,
          relative:
            path.join(
              source.name,
              childPrefix
            )
        });
      }
    }

    return files;
  }

  async create({
    label = '',
    principal = null
  } = {}) {
    await this.ensureRoot();

    const id =
      timestampId();

    const target =
      path.join(
        this.snapshotsDir,
        id
      );

    const payloadDir =
      path.join(
        target,
        'payload'
      );

    await fs.promises.mkdir(
      payloadDir,
      {
        recursive: true
      }
    );

    const manifestFiles = [];

    for (
      const source
      of this.sources
    ) {
      if (
        !source ||
        !source.path ||
        !fs.existsSync(
          source.path
        )
      ) {
        continue;
      }

      const files =
        await this.collectFiles(
          source
        );

      for (const file of files) {
        const destination =
          path.join(
            payloadDir,
            file.relative
          );

        await fs.promises.mkdir(
          path.dirname(
            destination
          ),
          {
            recursive: true
          }
        );

        await fs.promises.copyFile(
          file.source,
          destination
        );

        const stats =
          await fs.promises.stat(
            destination
          );

        manifestFiles.push({
          path:
            file.relative
              .split(path.sep)
              .join('/'),
          bytes:
            stats.size,
          sha256:
            await sha256File(
              destination
            )
        });
      }
    }

    const manifest = {
      id,
      label:
        String(label || '')
          .trim()
          .slice(0, 120),
      createdAt:
        new Date().toISOString(),
      createdBy:
        principal?.subject ||
        'system',
      files:
        manifestFiles
    };

    await fs.promises.writeFile(
      path.join(
        target,
        'manifest.json'
      ),
      `${JSON.stringify(
        manifest,
        null,
        2
      )}\n`,
      {
        encoding: 'utf8',
        mode: 0o600
      }
    );

    await this.prune();

    this.eventBus?.publish?.(
      'system.snapshot.created',
      {
        id,
        files:
          manifestFiles.length
      }
    );

    this.logger?.info?.(
      'Rendszer-snapshot elkészült.',
      {
        id,
        files:
          manifestFiles.length
      }
    );

    return manifest;
  }

  async list() {
    await this.ensureRoot();

    const entries =
      await fs.promises.readdir(
        this.snapshotsDir,
        {
          withFileTypes: true
        }
      );

    const snapshots = [];

    for (
      const entry
      of entries
    ) {
      if (!entry.isDirectory()) {
        continue;
      }

      try {
        const manifest =
          JSON.parse(
            await fs.promises.readFile(
              path.join(
                this.snapshotsDir,
                entry.name,
                'manifest.json'
              ),
              'utf8'
            )
          );

        snapshots.push({
          id:
            manifest.id,
          label:
            manifest.label,
          createdAt:
            manifest.createdAt,
          createdBy:
            manifest.createdBy,
          files:
            manifest.files?.length ||
            0
        });
      } catch (_) {
        // Sérült snapshot kimarad a listából.
      }
    }

    return snapshots.sort(
      (left, right) =>
        right.createdAt
          .localeCompare(
            left.createdAt
          )
    );
  }

  async verify(id) {
    const snapshotId =
      safeSnapshotId(id);

    const target =
      this.snapshotPath(
        snapshotId
      );

    const manifest =
      JSON.parse(
        await fs.promises.readFile(
          path.join(
            target,
            'manifest.json'
          ),
          'utf8'
        )
      );

    const checks = [];

    for (
      const file
      of manifest.files || []
    ) {
      const filePath =
        path.join(
          target,
          'payload',
          file.path
        );

      try {
        const actual =
          await sha256File(
            filePath
          );

        checks.push({
          path:
            file.path,
          ok:
            actual ===
            file.sha256,
          expected:
            file.sha256,
          actual
        });
      } catch (error) {
        checks.push({
          path:
            file.path,
          ok: false,
          code:
            error.code ||
            'FILE_MISSING'
        });
      }
    }

    return {
      id:
        snapshotId,
      ok:
        checks.every(
          (item) => item.ok
        ),
      checks
    };
  }

  async restore(
    id,
    {
      confirm,
      maintenanceService,
      principal = null
    } = {}
  ) {
    if (
      confirm !==
      'RESTORE_SYSTEM_SNAPSHOT'
    ) {
      throw SystemServiceError
        .invalid(
          'SNAPSHOT_CONFIRMATION_REQUIRED',
          'A visszaállításhoz pontos megerősítés szükséges.'
        );
    }

    if (
      !maintenanceService
        ?.isEnabled?.()
    ) {
      throw SystemServiceError
        .conflict(
          'MAINTENANCE_REQUIRED',
          'Snapshot visszaállítása csak karbantartási módban végezhető.'
        );
    }

    const verification =
      await this.verify(id);

    if (!verification.ok) {
      throw SystemServiceError
        .conflict(
          'SNAPSHOT_VERIFICATION_FAILED',
          'A snapshot integritás-ellenőrzése sikertelen.',
          verification
        );
    }

    const snapshotId =
      safeSnapshotId(id);

    const payloadDir =
      path.join(
        this.snapshotPath(
          snapshotId
        ),
        'payload'
      );

    const manifest =
      JSON.parse(
        await fs.promises.readFile(
          path.join(
            this.snapshotPath(
              snapshotId
            ),
            'manifest.json'
          ),
          'utf8'
        )
      );

    const sourceMap =
      new Map(
        this.sources.map(
          (source) => [
            source.name,
            source
          ]
        )
      );

    let restored = 0;

    for (
      const file
      of manifest.files || []
    ) {
      const [
        sourceName,
        ...segments
      ] =
        file.path.split('/');

      const source =
        sourceMap.get(
          sourceName
        );

      if (!source) continue;

      const destination =
        fs.existsSync(source.path) &&
        fs.statSync(
          source.path
        ).isFile()
          ? source.path
          : path.join(
              source.path,
              ...segments
            );

      await fs.promises.mkdir(
        path.dirname(
          destination
        ),
        {
          recursive: true
        }
      );

      await fs.promises.copyFile(
        path.join(
          payloadDir,
          file.path
        ),
        destination
      );

      restored += 1;
    }

    this.eventBus?.publish?.(
      'system.snapshot.restored',
      {
        id:
          snapshotId,
        restored,
        restoredBy:
          principal?.subject ||
          'system'
      }
    );

    return {
      id:
        snapshotId,
      restored,
      restartRequired:
        true
    };
  }

  async remove(id) {
    const snapshotId =
      safeSnapshotId(id);

    const target =
      this.snapshotPath(
        snapshotId
      );

    if (
      !fs.existsSync(target)
    ) {
      throw SystemServiceError
        .notFound(
          'SNAPSHOT_NOT_FOUND',
          'A snapshot nem található.',
          {
            id:
              snapshotId
          }
        );
    }

    await fs.promises.rm(
      target,
      {
        recursive: true,
        force: true
      }
    );

    return {
      removed: true,
      id:
        snapshotId
    };
  }

  async prune() {
    const snapshots =
      await this.list();

    for (
      const snapshot
      of snapshots.slice(
        this.maximumSnapshots
      )
    ) {
      await fs.promises.rm(
        this.snapshotPath(
          snapshot.id
        ),
        {
          recursive: true,
          force: true
        }
      );
    }
  }
}

module.exports = {
  SystemSnapshotService,
  safeSnapshotId,
  sha256File,
  timestampId
};
