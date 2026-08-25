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

const stagingEnvPath = 'deploy/staging.env.example';
let stagingEnv = read(stagingEnvPath);
const betaMatch = release.application.match(/-beta\.(\d+)$/);
const releaseCandidate = betaMatch
  ? `beta.${betaMatch[1]}-gate`
  : 'stable-gate';
stagingEnv = stagingEnv.replace(
  /^RELEASE_TARGET_VERSION=.*$/m,
  `RELEASE_TARGET_VERSION=${release.application}`
);
stagingEnv = stagingEnv.replace(
  /^RELEASE_CANDIDATE=.*$/m,
  `RELEASE_CANDIDATE=${releaseCandidate}`
);
write(stagingEnvPath, stagingEnv);


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

const readmePath = 'README.md';
let readme = read(readmePath);
const begin = '<!-- CURRENT_RELEASE_DOCS_SSOT_BEGIN -->';
const end = '<!-- CURRENT_RELEASE_DOCS_SSOT_END -->';
const block = [
  begin,
  `- Release notes: \`docs/v5/${prefix}_RELEASE_NOTES.md\``,
  `- Installation guide: \`docs/v5/${prefix}_INSTALLATION_GUIDE.md\``,
  `- Release checklist: \`docs/v5/${prefix}_RELEASE_CHECKLIST.md\``,
  `- Root release notes: \`RELEASE_NOTES_${release.application}.md\``,
  end
].join('\n');

const start = readme.indexOf(begin);
const finish = readme.indexOf(end);
if (start >= 0 && finish > start) {
  readme = readme.slice(0,start) + block + readme.slice(finish + end.length);
} else {
  const versionEnd = '<!-- CURRENT_VERSION_SSOT_END -->';
  const pos = readme.indexOf(versionEnd);
  if (pos < 0) throw new Error('README current version SSOT block missing');
  const after = pos + versionEnd.length;
  readme = readme.slice(0,after) + '\n\n' + block + readme.slice(after);
}

write(readmePath, readme);

const changelogPath = 'CHANGELOG.md';
let changelog = read(changelogPath);
const changelogBegin = '<!-- CURRENT_CHANGELOG_SSOT_BEGIN -->';
const changelogEnd = '<!-- CURRENT_CHANGELOG_SSOT_END -->';
const changelogBlock = [
  changelogBegin,
  `# ${release.application} — Current release`,
  '',
  `- Application: \`${release.application}\``,
  `- Firmware: \`${release.firmware}\``,
  `- Direct API: \`${release.directApi}\``,
  changelogEnd,
  ''
].join('\n');

const cStart = changelog.indexOf(changelogBegin);
const cEnd = changelog.indexOf(changelogEnd);
if (cStart >= 0 && cEnd > cStart) {
  changelog =
    changelog.slice(0,cStart)
    + changelogBlock
    + changelog.slice(cEnd + changelogEnd.length).replace(/^\n*/, '\n');
} else if (!changelog.startsWith(`# ${release.application} — `)) {
  changelog = changelogBlock + '\n' + changelog;
}

write(changelogPath, changelog);

function updateJsonVersion(rel, mutate) {
  const data = JSON.parse(read(rel));
  mutate(data);
  write(rel, JSON.stringify(data, null, 2) + '\n');
}

function updatePackageJson(rel) {
  updateJsonVersion(rel, (data) => {
    data.version = release.application;
  });
}

function updatePackageLock(rel) {
  updateJsonVersion(rel, (data) => {
    data.version = release.application;
    if (!data.packages || typeof data.packages !== 'object' || !data.packages['']) {
      throw new Error(`Package lock root package missing: ${rel}`);
    }
    data.packages[''].version = release.application;
  });
}

updatePackageJson('package.json');
updatePackageLock('package-lock.json');
updatePackageJson('desktop-tauri/package.json');
updatePackageLock('desktop-tauri/package-lock.json');
updatePackageJson('web-lxc/package.json');
if (fs.existsSync(path.join(root, 'web-lxc/package-lock.json'))) {
  updatePackageLock('web-lxc/package-lock.json');
}

updateJsonVersion('desktop-tauri/src-tauri/tauri.conf.json', (data) => {
  data.version = release.application;
});

updateJsonVersion('docs/api/openapi-v2.json', (data) => {
  if (!data.info || typeof data.info !== 'object') {
    throw new Error('OpenAPI info object missing');
  }
  data.info.version = release.application;
});

const cargoTomlPath = 'desktop-tauri/src-tauri/Cargo.toml';
let cargoToml = read(cargoTomlPath);
const cargoTomlUpdated = cargoToml.replace(
  /(^\[package\][\s\S]*?^version\s*=\s*)"[^"]+"/m,
  `$1"${release.application}"`
);
if (cargoTomlUpdated === cargoToml) {
  throw new Error('Cargo.toml package version surface not found');
}
write(cargoTomlPath, cargoTomlUpdated);

const cargoLockPath = 'desktop-tauri/src-tauri/Cargo.lock';
let cargoLock = read(cargoLockPath);
const cargoLockPattern =
  /(\[\[package\]\]\s*\nname\s*=\s*"arduino-led-controller"\s*\nversion\s*=\s*)"[^"]+"/m;
const cargoLockUpdated = cargoLock.replace(
  cargoLockPattern,
  `$1"${release.application}"`
);
if (cargoLockUpdated === cargoLock) {
  throw new Error('Cargo.lock application package version surface not found');
}
write(cargoLockPath, cargoLockUpdated);

const tauriApiPath = 'desktop-tauri/src/services/tauriApi.ts';
let tauriApi = read(tauriApiPath);
const tauriApiUpdated = tauriApi.replace(
  /(const\s+APP_VERSION\s*=\s*['"])[^'"]+(['"])/,
  `$1${release.application}$2`
);
if (tauriApiUpdated === tauriApi) {
  throw new Error('tauriApi APP_VERSION surface not found');
}
write(tauriApiPath, tauriApiUpdated);

console.log(`VERSION_SSOT_APPLICATION_SURFACES=${release.application}`);

console.log('VERSION_SSOT_COMPLETE_APPLICATION_SURFACES=PASSED');

const {
  generateOpenApiTypescript
} = require('./generate-openapi-typescript');

const generatedOpenApi = generateOpenApiTypescript();
if (generatedOpenApi.version !== release.application) {
  throw new Error(
    `Generated OpenAPI TypeScript version mismatch: ${generatedOpenApi.version} != ${release.application}`
  );
}
console.log(`VERSION_SSOT_OPENAPI_GENERATED_VERSION=${generatedOpenApi.version}`);
console.log(`VERSION_SSOT_OPENAPI_GENERATED_FILES=${generatedOpenApi.files.length}`);
console.log('VERSION_SSOT_OPENAPI_GENERATED_ARTIFACTS=PASSED');





console.log(`VERSION_SSOT_APPLICATION=${release.application}`);
console.log(`VERSION_SSOT_FIRMWARE=${release.firmware}`);
console.log(`VERSION_SSOT_DIRECT_API=${release.directApi}`);
console.log(`VERSION_SSOT_DOC_PREFIX=${prefix}`);
console.log('VERSION_SSOT_SURFACE_SYNC=PASSED');
