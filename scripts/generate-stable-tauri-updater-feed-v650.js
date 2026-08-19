#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

function arg(name,fallback=null){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:fallback;
}
const root=path.resolve(arg('--root','release-assets'));
const version=String(arg('--version','')).trim();
const tag=String(arg('--tag','')).trim();

if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid Stable version: ${version}`);
if(tag!==`v${version}`) throw new Error(`Stable tag/version mismatch: ${tag} vs ${version}`);

const base=`https://github.com/LexyGuru/arduino-led-controller/releases/download/${tag}`;
const assets={
  'linux-x86_64':[
    `Arduino_LED_Controller_${version}_Linux_x86_64.AppImage`,
    `Arduino_LED_Controller_${version}_Linux_x86_64.AppImage.sig`
  ],
  'windows-x86_64':[
    `Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe`,
    `Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe.sig`
  ],
  'darwin-aarch64':[
    `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz`,
    `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz.sig`
  ],
  'darwin-x86_64':[
    `Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz`,
    `Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz.sig`
  ]
};
const platforms={};
for(const [platform,[artifact,sigFile]] of Object.entries(assets)){
  const artifactPath=path.join(root,artifact);
  const sigPath=path.join(root,sigFile);
  if(!fs.existsSync(artifactPath)) throw new Error(`Missing updater artifact: ${artifact}`);
  if(!fs.existsSync(sigPath)) throw new Error(`Missing updater signature: ${sigFile}`);
  const signature=fs.readFileSync(sigPath,'utf8').trim();
  if(!signature) throw new Error(`Empty updater signature: ${sigFile}`);
  platforms[platform]={url:`${base}/${artifact}`,signature};
}
const latest={
  version,
  notes:'Arduino LED Controller Stable signed native application update.',
  platforms
};
fs.writeFileSync(path.join(root,'latest.json'),`${JSON.stringify(latest,null,2)}\n`);
console.log('STABLE_TAURI_UPDATER_FEED=PASSED');
