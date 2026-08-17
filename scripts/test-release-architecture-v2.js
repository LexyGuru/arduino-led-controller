#!/usr/bin/env node
'use strict';
const fs=require('fs'); const branch=process.argv[2];
const m=JSON.parse(fs.readFileSync('release-versions.json','utf8')); const a=JSON.parse(fs.readFileSync('contracts/release-architecture-v2.json','utf8'));
function ok(v,msg){if(!v){console.error('RELEASE_ARCH_V2_FAIL='+msg);process.exit(1)}}
ok(m.schemaVersion===2,'manifest schema'); ok(m.applicationRelease&&m.firmwareRelease,'release objects'); ok(m.application===m.applicationRelease.version,'app alias'); ok(m.channel===m.applicationRelease.channel,'channel alias'); ok(a.schemaVersion===2,'arch schema'); ok(a.rules.applicationAndFirmwareHaveIndependentLifecycles===true,'independent lifecycle'); ok(a.rules.stableAndBetaCatalogsMustNeverMix===true,'catalog separation');
if(branch==='next'){ok(m.applicationRelease.channel==='beta','next beta');ok(m.applicationRelease.branch==='next/v5-rearchitecture','next branch');ok(m.applicationRelease.updaterAlias==='updater-beta','next updater');ok(m.firmwareRelease.channel==='beta','next fw beta');ok(m.firmwareRelease.available===true,'next fw available');ok(m.firmwareRelease.recommendedVersion==='5.0.0-beta.10','next fw rec');}
else if(branch==='main'){ok(m.applicationRelease.channel==='stable','main stable');ok(m.applicationRelease.branch==='main','main branch');ok(m.applicationRelease.updaterAlias==='updater-stable','main updater');ok(m.firmwareRelease.channel==='stable','main fw stable');ok(m.firmwareRelease.available===false,'main fw unavailable');ok(m.firmwareRelease.recommendedVersion===null,'main no rec');}
console.log('RELEASE_ARCHITECTURE_V2_CONTRACT=PASSED branch='+branch);
