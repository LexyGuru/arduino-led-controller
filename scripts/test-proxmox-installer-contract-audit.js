#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const a=require('node:assert/strict');

const installerPath='deploy/proxmox/install-proxmox-lxc.sh';
const installer=fs.readFileSync(installerPath,'utf8');

const requiredFunctional=[
  'OS_VERSION="13"',
  'debian-13-standard_',
  'Stable / main',
  'Beta / next/v5-rearchitecture',
  'Default Settings',
  'Advanced Settings',
  'pct create',
  'pct exec "$CTID" -- passwd root',
  'ROOT_PASSWORD=CONFIGURED',
  'prepare_github_payload',
  'GITHUB_RUNTIME_PAYLOAD=READY',
  './deploy/install-rust-lxc-native.sh',
  'UPDATE_CHANNEL_SELECTED=',
  '/health/live',
  'LXC_SERVICE_LIVE=PASSED',
  'SERVICE_HEALTH=PASSED',
  'PROXMOX_LXC_INSTALL=SUCCESS',
];

for(const marker of requiredFunctional)
  a.ok(installer.includes(marker),`Installer functional marker hiányzik: ${marker}`);

const requiredUx=[
  'ARDUINO LED CONTROLLER V5',
  'PROXMOX • DEBIAN 13 • RUST',
  'RELEASE CHANNEL',
  'INSTALLATION MODE',
  'INSTALLATION SUMMARY',
  'ARDUINO DIRECT API',
  'RUNTIME SOURCE',
  'ROOT ACCESS',
  'NETWORK',
  'INSTALLATION COMPLETE',
  'INSTALLED CHANNEL',
  'ui_key_value "Root login" "configured"',
  'ui_key_value "Web UI"',
  'NO_COLOR',
];

for(const marker of requiredUx)
  a.ok(installer.includes(marker),`Installer UX marker hiányzik: ${marker}`);

// Audit every JS test that reads the Proxmox installer and uses a simple
// <variable>.includes('literal') assertion. If such an exact literal no longer
// exists, the migration must update that test before the full suite is allowed.
const missing=[];
for(const file of fs.readdirSync('scripts').filter(x=>x.endsWith('.js'))) {
  const full=path.join('scripts',file);
  const text=fs.readFileSync(full,'utf8');
  if(!text.includes('install-proxmox-lxc.sh')) continue;

  const re=/(?:host|installer|script)\.includes\((['"])(.*?)\1\)/gs;
  let m;
  while((m=re.exec(text))!==null) {
    const expected=m[2]
      .replace(/\\'/g,"'")
      .replace(/\\"/g,'"')
      .replace(/\\\\/g,'\\');

    if(!installer.includes(expected))
      missing.push(`${file}: ${expected}`);
  }
}

a.deepEqual(
  missing,
  [],
  `Elavult exact Proxmox presentation contract(ok):\n${missing.join('\n')}`
);

console.log('PROXMOX_FUNCTIONAL_CONTRACT_AUDIT=PASSED');
console.log('PROXMOX_UX_CONTRACT_AUDIT=PASSED');
console.log('PROXMOX_STALE_EXACT_STRING_CONTRACTS=0');
