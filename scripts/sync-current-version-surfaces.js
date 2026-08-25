#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const versionSsot = require('./lib/version-ssot');

const root = path.resolve(__dirname, '..');
const release = versionSsot.release;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, value) {
  fs.writeFileSync(path.join(root, rel), value);
}

function currentDocPrefix() {
  const match = release.application.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/
  );
  if (!match) {
    throw new Error(`Unsupported application version: ${release.application}`);
  }

  const [, major, minor, , betaNumber] = match;
  if (release.channel === 'beta') {
    return major === '5' && minor === '0'
      ? `BETA${betaNumber}`
      : `V${major}${minor}_BETA${betaNumber}`;
  }
  return `V${major}${minor}_STABLE`;
}

function upsertVersionBlock(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`Current documentation file missing: ${rel}`);
  }

  const begin = '<!-- CURRENT_VERSION_SSOT_BEGIN -->';
  const end = '<!-- CURRENT_VERSION_SSOT_END -->';
  const block = [
    begin,
    `Current application: \`${release.application}\``,
    `Current firmware: \`${release.firmware}\``,
    `Current Direct API: \`${release.directApi}\``,
    end
  ].join('\n');

  let body = fs.readFileSync(abs, 'utf8');
  const start = body.indexOf(begin);
  const finish = body.indexOf(end);

  if (start >= 0 && finish > start) {
    body =
      body.slice(0, start)
      + block
      + body.slice(finish + end.length);
  } else {
    const firstNewline = body.indexOf('\n');
    if (firstNewline >= 0) {
      body =
        body.slice(0, firstNewline + 1)
        + '\n'
        + block
        + '\n'
        + body.slice(firstNewline + 1);
    } else {
      body = `${body}\n\n${block}\n`;
    }
  }

  fs.writeFileSync(abs, body);
}

write('VERSION', `${release.application}\n`);

const firmwareReleasePath = 'firmware/firmware-release.json';
const firmwareRelease = JSON.parse(read(firmwareReleasePath));
firmwareRelease.firmwareVersion = release.firmware;
firmwareRelease.directApiVersion = release.directApi;
firmwareRelease.board = release.board;
firmwareRelease.otaPort = release.otaPort;
write(
  firmwareReleasePath,
  JSON.stringify(firmwareRelease, null, 2) + '\n'
);

const firmwarePath = 'firmware/ArduinoLedController/ArduinoLedController.ino';
let firmware = read(firmwarePath);
firmware = firmware.replace(
  /^#define FIRMWARE_VERSION ".*"$/m,
  `#define FIRMWARE_VERSION "${release.firmware}"`
);
firmware = firmware.replace(
  /^#define DIRECT_API_VERSION ".*"$/m,
  `#define DIRECT_API_VERSION "${release.directApi}"`
);
write(firmwarePath, firmware);

const prefix = currentDocPrefix();
const currentDocs = [
  'README.md',
  'docs/v5/CURRENT_STATE.md',
  `docs/v5/${prefix}_INSTALLATION_GUIDE.md`,
  `docs/v5/${prefix}_RELEASE_NOTES.md`,
  `docs/v5/${prefix}_RELEASE_CHECKLIST.md`,
  `RELEASE_NOTES_${release.application}.md`
];

for (const rel of currentDocs) {
  upsertVersionBlock(rel);
}

console.log(`VERSION_SSOT_APPLICATION=${release.application}`);
console.log(`VERSION_SSOT_FIRMWARE=${release.firmware}`);
console.log(`VERSION_SSOT_DIRECT_API=${release.directApi}`);
console.log(`VERSION_SSOT_DOC_PREFIX=${prefix}`);
console.log('VERSION_SSOT_SURFACE_SYNC=PASSED');
