"use strict";
const versionSsot=require('./lib/version-ssot');
const assert=require("node:assert/strict");
const fs=require("node:fs");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const versions=JSON.parse(fs.readFileSync("release-versions.json","utf8"));
const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
const readme=fs.readFileSync("README.md","utf8");

function releaseDocPrefix(version){
  const match=String(version).match(/^(\d+)\.(\d+)\.\d+-beta\.(\d+)$/);
  assert.ok(match,`Unsupported Beta version: ${version}`);
  const [,major,minor,beta]=match;
  return major==="5"&&minor==="0"
    ? `BETA${beta}`
    : `V${major}${minor}_BETA${beta}`;
}

const prefix=releaseDocPrefix(versions.application);
const currentReleaseNotesPath=`docs/v5/${prefix}_RELEASE_NOTES.md`;
assert.ok(fs.existsSync(currentReleaseNotesPath),`Missing current release notes: ${currentReleaseNotesPath}`);
const currentReleaseNotes=fs.readFileSync(currentReleaseNotesPath,"utf8");

assert.equal(pkg.version,versions.application);
versionSsot.assertFirmwareVersion(fw);
versionSsot.assertFirmwareDirectApi(fw);
assert.ok(readme.includes(`| Alkalmazás | **\`${versions.application}\`** |`));
assert.ok(readme.includes(`| Firmware | **\`${versions.firmware}\`** |`));
assert.ok(currentReleaseNotes.includes(`\`${versions.application}\``));
assert.ok(currentReleaseNotes.includes(`\`${versions.firmware}\``));
assert.ok(currentReleaseNotes.includes(`\`${versions.directApi}\``));
console.log(`OK: app ${versions.application}, firmware ${versions.firmware}, Direct API ${versions.directApi}, release docs ${prefix}`);
