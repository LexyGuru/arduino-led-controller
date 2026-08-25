#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(process.argv[2]||'release-assets');
const version=String(process.argv[3]||'').trim();

function fail(message){
  console.error(`STABLE_ASSET_VERIFY_ERROR=${message}`);
  process.exit(1);
}
if(!/^\d+\.\d+\.\d+$/.test(version)) fail(`invalid Stable version: ${version}`);
if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()) fail(`asset directory missing: ${root}`);

const files=fs.readdirSync(root).filter(n=>fs.statSync(path.join(root,n)).isFile()).sort();
const count=(pred)=>files.filter(pred).length;
const ext=(s)=>count(n=>n.endsWith(s));
const regex=(r)=>count(n=>r.test(n));

const expected=[
  ['dmg',ext('.dmg'),2],
  ['exe',ext('.exe'),1],
  ['AppImage',ext('.AppImage'),1],
  ['deb',ext('.deb'),1],
  ['apk',ext('.apk'),1],
  ['aab',ext('.aab'),1],
  ['ipa',ext('.ipa'),1],
  ['firmware-bin',regex(/\.bin$/),0],
  ['firmware-bin-sha256',regex(/\.bin\.sha256$/),0],
  ['lxc-tar-gz',regex(/_LXC_Server\.tar\.gz$/),1],
  ['app-tar-gz',regex(/\.app\.tar\.gz$/),2],
  ['sig',ext('.sig'),4],
];
for(const [label,actual,want] of expected){
  console.log(`STABLE_ASSET_COUNT_${label}=${actual}`);
  if(actual!==want) fail(`${label}: expected ${want}, got ${actual}`);
}

const required=[
  `Arduino_LED_Controller_${version}_Linux_x86_64.AppImage`,
  `Arduino_LED_Controller_${version}_Linux_x86_64.AppImage.sig`,
  `Arduino_LED_Controller_${version}_Linux_x86_64.deb`,
  `Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe`,
  `Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe.sig`,
  `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.dmg`,
  `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz`,
  `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz.sig`,
  `Arduino_LED_Controller_${version}_macOS_Intel.dmg`,
  `Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz`,
  `Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz.sig`,
  `Arduino_LED_Controller_${version}_iOS_iPadOS_unsigned.ipa`,
  `Arduino_LED_Controller_${version}_LXC_Server.tar.gz`,
  'release-versions.json',
];
for(const name of required){
  const f=path.join(root,name);
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()) fail(`required asset missing: ${name}`);
  if(fs.statSync(f).size===0) fail(`required asset empty: ${name}`);
}

const apk=files.filter(n=>n===`Arduino_LED_Controller_${version}_Android.apk`||n===`Arduino_LED_Controller_${version}_Android_debug.apk`);
const aab=files.filter(n=>n===`Arduino_LED_Controller_${version}_Android.aab`||n===`Arduino_LED_Controller_${version}_Android_unsigned.aab`);
if(apk.length!==1) fail(`Android APK identity mismatch: ${apk.join(',')}`);
if(aab.length!==1) fail(`Android AAB identity mismatch: ${aab.join(',')}`);

const r=JSON.parse(fs.readFileSync(path.join(root,'release-versions.json'),'utf8'));
if(
  r.schemaVersion!==2||
  r.application!==version||
  r.firmware!==versionSsot.fixtures.firmwareStable500||
  r.directApi!==versionSsot.fixtures.directApiV1||
  r.channel!=='stable'||
  r.applicationRelease?.channel!=='stable'||
  r.applicationRelease?.branch!=='main'||
  r.applicationRelease?.updaterAlias!=='updater-stable'||
  r.firmwareRelease?.channel!=='stable'
) fail('release-versions.json Stable identity mismatch');

console.log('STABLE_RELEASE_ASSET_CLASSES=PASSED');
console.log('STABLE_RELEASE_ASSET_NAMES=PASSED');
console.log(`STABLE_RELEASE_ASSET_VERSION=${version}`);
