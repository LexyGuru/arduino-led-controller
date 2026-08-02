#!/usr/bin/env node
'use strict';
const assert=require('assert'); const fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8'); const json=p=>JSON.parse(read(p));
const versions=json('release-versions.json'); const manifest=json('firmware/firmware-release.json');
assert.equal(versions.application,'5.0.0-beta.4');
assert.equal(versions.firmware,'4.3.0-beta.3');
assert.equal(versions.directApi,'1.0.0');
assert.equal(manifest.firmwareVersion,versions.firmware);
assert.equal(manifest.channel,'beta');
assert.equal(read('VERSION').trim(),versions.application);
assert.equal(json('package.json').version,versions.application);
assert.equal(json('desktop-tauri/package.json').version,versions.application);
assert.equal(json('desktop-tauri/src-tauri/tauri.conf.json').version,versions.application);
assert.match(read('desktop-tauri/src-tauri/Cargo.toml'),/5\.0\.0-beta\.4/);
assert.match(read('firmware/ArduinoLedController/ArduinoLedController.ino'),/FIRMWARE_VERSION "4\.3\.0-beta\.3"/);
const wf=read('.github/workflows/beta-release.yml');
for(const token of ['5.0.0-beta.4','4.3.0-beta.3','firmware-release.json','release-versions.json','BETA4_RELEASE_NOTES.md']) assert.ok(wf.includes(token),token);
console.log('OK: Beta.4 központi verzió- és firmware-manifest szerződés');
