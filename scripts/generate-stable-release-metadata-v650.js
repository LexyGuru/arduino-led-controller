#!/usr/bin/env node
'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

function arg(name,fallback=null){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:fallback;
}
function sha256(bytes){
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const root=path.resolve(arg('--root','release-assets'));
const version=String(arg('--version','')).trim();
const tag=String(arg('--tag','')).trim();
const commit=String(arg('--commit','')).trim();
const publishedAt=String(arg('--published-at','github-actions')).trim();

if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid Stable version: ${version}`);
if(tag!==`v${version}`) throw new Error(`Tag/version mismatch: ${tag}`);
if(!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`Invalid commit: ${commit}`);

const versions=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
if(
  versions.application!==version||
  versions.channel!=='stable'||
  versions.applicationRelease?.branch!=='main'||
  versions.applicationRelease?.updaterAlias!=='updater-stable'
) throw new Error('Canonical Stable release metadata mismatch');

const baseUrl=`https://github.com/LexyGuru/arduino-led-controller/releases/download/${tag}`;
const appAssets={
  'windows-x86_64':`Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe`,
  'linux-x86_64-appimage':`Arduino_LED_Controller_${version}_Linux_x86_64.AppImage`,
  'linux-x86_64-deb':`Arduino_LED_Controller_${version}_Linux_x86_64.deb`,
  'macos-aarch64':`Arduino_LED_Controller_${version}_macOS_Apple_Silicon.dmg`,
  'macos-x86_64':`Arduino_LED_Controller_${version}_macOS_Intel.dmg`
};
const latestStable={
  schemaVersion:1,
  channel:'stable',
  publishedAt,
  app:{
    version,
    directApiVersion:versions.directApi,
    releaseUrl:`https://github.com/LexyGuru/arduino-led-controller/releases/tag/${tag}`,
    artifacts:Object.fromEntries(
      Object.entries(appAssets).map(([key,name])=>[key,{name,url:`${baseUrl}/${name}`}])
    )
  }
};
fs.writeFileSync(path.join(root,'latest-stable.json'),`${JSON.stringify(latestStable,null,2)}\n`);

const checksumNames=fs.readdirSync(root)
  .filter(name=>{
    const p=path.join(root,name);
    return fs.statSync(p).isFile()&&name!=='SHA256SUMS'&&name!=='RELEASE-MANIFEST.json';
  })
  .sort();
fs.writeFileSync(
  path.join(root,'SHA256SUMS'),
  checksumNames.map(name=>`${sha256(fs.readFileSync(path.join(root,name)))}  ${name}`).join('\n')+'\n'
);

const files=fs.readdirSync(root)
  .filter(name=>name!=='RELEASE-MANIFEST.json')
  .sort()
  .filter(name=>fs.statSync(path.join(root,name)).isFile())
  .map(name=>{
    const payload=fs.readFileSync(path.join(root,name));
    return {name,bytes:payload.length,sha256:sha256(payload)};
  });

const manifest={
  schemaVersion:2,
  product:'Arduino LED Controller',
  version,
  tag,
  commit,
  channel:'stable',
  prerelease:false,
  productionDeploymentIncluded:true,
  compatibility:{
    board:'arduino-uno-r4-wifi',
    directApiVersion:versions.directApi,
    applicationVersion:version
  },
  files
};
fs.writeFileSync(path.join(root,'RELEASE-MANIFEST.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log(`STABLE_RELEASE_METADATA_FILES=${files.length}`);
console.log('STABLE_RELEASE_METADATA=PASSED');
