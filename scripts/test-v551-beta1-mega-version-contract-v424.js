"use strict";
const versionSsot=require('./lib/version-ssot');
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = fs.readFileSync("VERSION","utf8").trim();
const rv = JSON.parse(fs.readFileSync("release-versions.json","utf8"));

const m = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
assert.ok(m,`Unsupported current Beta version: ${version}`);
const [,major,minor,,betaNumber] = m;

const docPrefix = major==="5" && minor==="0"
  ? `BETA${betaNumber}`
  : `V${major}${minor}_BETA${betaNumber}`;

const releaseCandidate = `beta.${betaNumber}-gate`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const versionPattern = escapeRegex(version);
const firmwarePattern = escapeRegex(rv.firmware);

assert.equal(rv.application,versionSsot.application);
assert.match(rv.firmware,/^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(rv.directApi,versionSsot.directApi);

for (const p of [
  "package.json",
  "desktop-tauri/package.json",
  "desktop-tauri/src-tauri/tauri.conf.json",
  "web-lxc/package.json"
]) assert.equal(JSON.parse(fs.readFileSync(p,"utf8")).version,version,p);

for (const p of [
  "package-lock.json",
  "desktop-tauri/package-lock.json",
  "web-lxc/package-lock.json"
]) {
  if (!fs.existsSync(p)) continue;
  const d=JSON.parse(fs.readFileSync(p,"utf8"));
  assert.equal(d.version,version,p);
  if (d.packages?.[""]) assert.equal(d.packages[""].version,version,p+" root");
}

assert.equal(JSON.parse(fs.readFileSync("docs/api/openapi-v2.json","utf8")).info.version,version);

for (const p of [
  "desktop-tauri/src/api/generated/api-v2-types.ts",
  "desktop-tauri/src/api/generated/api-v2-operations.ts",
  "desktop-tauri/src/api/generated/api-v2-client.ts"
]) {
  const s=fs.readFileSync(p,"utf8");
  assert.ok(s.includes(`OpenAPI verzió: ${version}`),`${p}: generated OpenAPI version`);
}

for (const p of [
  `RELEASE_NOTES_${version}.md`,
  `docs/v5/${docPrefix}_RELEASE_NOTES.md`,
  `docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`,
  `docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`
]) assert.ok(fs.existsSync(p),`Missing current release document: ${p}`);

const readme=fs.readFileSync("README.md","utf8");
assert.ok(readme.includes(`| Alkalmazás | **\`${version}\`** |`));
assert.ok(readme.includes(`| Firmware | **\`${rv.firmware}\`** |`));
assert.ok(readme.includes(`${docPrefix}_RELEASE_NOTES.md`));

const workflow=fs.readFileSync(".github/workflows/beta-release.yml","utf8");
assert.match(workflow,new RegExp(`EXPECTED_VERSION:\\s*${versionPattern}`));

const tauriApi=fs.readFileSync("desktop-tauri/src/services/tauriApi.ts","utf8");
assert.match(tauriApi,new RegExp(`APP_VERSION\\s*=\\s*['"]${versionPattern}['"]`));

const stagingEnv=fs.readFileSync("deploy/staging.env.example","utf8");
assert.ok(stagingEnv.includes(`RELEASE_TARGET_VERSION=${version}`));
assert.ok(stagingEnv.includes(`RELEASE_CANDIDATE=${releaseCandidate}`));

const firmwareSource=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
assert.match(
  firmwareSource,
  new RegExp(`#define\\s+FIRMWARE_VERSION\\s+"${firmwarePattern}"`)
);


console.log(`APPLICATION_VERSION=${version}`);
console.log(`FIRMWARE_VERSION=${rv.firmware}`);
console.log(`CURRENT_RELEASE_DOCUMENT_SET=${docPrefix}`);
console.log(`OPENAPI_GENERATED_ARTIFACTS=${version}`);
console.log(`DERIVED_RELEASE_CANDIDATE=${releaseCandidate}`);
console.log("V424_HOTFIX_CONTRACT_OWNERSHIP=EXECUTED_SEPARATELY");
console.log("V424_CURRENT_VERSION_COMPATIBILITY_CONTRACT=PASSED");
