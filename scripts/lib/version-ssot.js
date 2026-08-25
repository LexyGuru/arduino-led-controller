'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const release = JSON.parse(
  fs.readFileSync(path.join(root, 'release-versions.json'), 'utf8')
);

const versionSsot = {
  application: release.application,
  firmware: release.firmware,
  directApi: release.directApi,
  channel: release.channel,
  board: release.board,
  otaPort: release.otaPort,
  fixtures: Object.freeze(release.testFixtures || {}),
  release,

  assertFirmwareVersion(source) {
    assert.ok(
      source.includes(`#define FIRMWARE_VERSION "${release.firmware}"`),
      `Firmware source does not match canonical firmware ${release.firmware}`
    );
  },

  assertFirmwareDirectApi(source) {
    assert.ok(
      source.includes(`#define DIRECT_API_VERSION "${release.directApi}"`),
      `Firmware source does not match canonical Direct API ${release.directApi}`
    );
  }
};

module.exports = Object.freeze(versionSsot);
