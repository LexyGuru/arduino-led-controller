'use strict';

const fs = require('fs');

class OpenApiService {
  constructor({
    documentPath
  } = {}) {
    if (
      typeof documentPath !==
        'string' ||
      !documentPath.trim()
    ) {
      throw new TypeError(
        'Az OpenAPI dokumentum útvonala kötelező.'
      );
    }

    this.documentPath =
      documentPath;
    this.cached =
      null;
    this.cachedMtimeMs =
      null;
  }

  async getDocument() {
    const stats =
      await fs.promises.stat(
        this.documentPath
      );

    if (
      this.cached &&
      this.cachedMtimeMs ===
        stats.mtimeMs
    ) {
      return this.cached;
    }

    const document =
      JSON.parse(
        await fs.promises
          .readFile(
            this.documentPath,
            'utf8'
          )
      );

    if (
      document.openapi !==
        '3.1.0' ||
      !document.info ||
      !document.paths
    ) {
      throw new Error(
        'Az OpenAPI dokumentum szerkezete érvénytelen.'
      );
    }

    this.cached =
      Object.freeze(
        document
      );
    this.cachedMtimeMs =
      stats.mtimeMs;

    return this.cached;
  }

  async summary() {
    const document =
      await this.getDocument();

    return {
      openapi:
        document.openapi,
      title:
        document.info.title,
      version:
        document.info.version,
      paths:
        Object.keys(
          document.paths
        ).length,
      documentPath:
        this.documentPath
    };
  }

  docsHtml() {
    return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Arduino LED Controller API v2</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:980px;margin:0 auto;padding:32px;background:#111;color:#eee}
    a{color:#7cc8ff}code,pre{background:#1d1d1d;border-radius:6px;padding:4px 7px}
    pre{padding:16px;overflow:auto}.card{border:1px solid #333;border-radius:10px;padding:20px;margin:18px 0}
  </style>
</head>
<body>
  <h1>Arduino LED Controller API v2</h1>
  <div class="card">
    <p>OpenAPI 3.1 gépi dokumentum:</p>
    <p><a href="/api/v2/openapi.json"><code>/api/v2/openapi.json</code></a></p>
  </div>
  <div class="card">
    <h2>Hitelesítés</h2>
    <p>Bearer token vagy <code>led_session</code> cookie. A session-alapú módosító kérésekhez <code>X-CSRF-Token</code> szükséges.</p>
  </div>
  <div class="card">
    <h2>Fő területek</h2>
    <p>Rendszer, Arduino, LED, schedule, helyi schedule, firmware, felhasználók, események, audit és diagnosztika.</p>
  </div>
</body>
</html>`;
  }
}

module.exports = {
  OpenApiService
};
