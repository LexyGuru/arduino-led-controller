#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'); const read=p=>fs.readFileSync(p,'utf8');
const workflow=read('.github/workflows/app-stable-release.yml'), stableBuilder=read('deploy/build-stable-release-bundle.sh'), betaBuilder=read('deploy/build-beta-release-bundle.sh'), installer=read('deploy/install-rust-lxc-native.sh'), updater=read('deploy/update-rust-lxc.sh');
assert.match(workflow,/Build versioned Stable LXC bundle/); assert.match(workflow,/bash deploy\/build-stable-release-bundle\.sh/); assert.doesNotMatch(workflow,/Build versioned Beta LXC bundle/);
assert.match(stableBuilder,/Stable LXC csomaghoz prerelease suffix nélküli verzió/); assert.match(stableBuilder,/channel:'stable'/); assert.match(stableBuilder,/phase:'production'/); assert.match(stableBuilder,/installRoot:'\/opt\/arduino-led-controller'/); assert.match(stableBuilder,/serviceName:'arduino-led-controller-rust\.service'/); assert.match(stableBuilder,/productionDeploymentIncluded:true/);
assert.match(betaBuilder,/Beta LXC csomaghoz beta verzió szükséges/); assert.match(betaBuilder,/channel: 'beta'/); assert.match(betaBuilder,/phase: 'staging'/);
for(const text of [installer,updater]){ assert.match(text,/Arduino_LED_Controller_Firmware_BETA/); assert.match(text,/Arduino_LED_Controller_Firmware_STABLE/); assert.match(text,/firmware_release_tag/); }
console.log('STABLE_LXC_DEDICATED_BUILDER=PASSED'); console.log('BETA_LXC_BUILDER_STRICTNESS=PRESERVED'); console.log('LXC_FIRMWARE_RELEASE_TAG_CHANNEL_AWARE=PASSED'); console.log('STABLE_WORKFLOW_LXC_CHAIN=PASSED');
