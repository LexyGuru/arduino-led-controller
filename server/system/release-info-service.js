'use strict';

const fs = require('fs');
const crypto = require('crypto');

async function fileHash(filePath) {
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

class ReleaseInfoService {
  constructor({
    config,
    paths,
    lifecycle,
    maintenanceService,
    migrationService
  } = {}) {
    this.config = config;
    this.paths = paths;
    this.lifecycle = lifecycle;
    this.maintenanceService =
      maintenanceService;
    this.migrationService =
      migrationService;
  }

  async getInfo() {
    const openApiSha256 =
      fs.existsSync(
        this.paths
          .openApiDocumentFile
      )
        ? await fileHash(
            this.paths
              .openApiDocumentFile
          )
        : null;

    const migrations =
      await this.migrationService
        .status();

    return {
      service:
        this.config.service.name,
      version:
        this.config.service.version,
      environment:
        this.config.service
          .environment,
      lifecycle:
        this.lifecycle
          ?.getStatus?.() ||
        null,
      maintenance:
        this.maintenanceService
          .getStatus(),
      migrations: {
        pending:
          migrations.pending
      },
      release: {
        channel:
          this.config.release
            .channel,
        candidate:
          this.config.release
            .candidate,
        commit:
          this.config.release
            .commit,
        builtAt:
          this.config.release
            .builtAt
      },
      openApi: {
        path:
          this.paths
            .openApiDocumentFile,
        sha256:
          openApiSha256
      },
      node:
        process.version,
      generatedAt:
        new Date().toISOString()
    };
  }
}

module.exports = {
  ReleaseInfoService,
  fileHash
};
