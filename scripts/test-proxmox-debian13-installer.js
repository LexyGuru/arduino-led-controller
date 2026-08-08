#!/usr/bin/env node
'use strict';

const a=require('node:assert/strict');
const f=require('node:fs');

const host=f.readFileSync('deploy/proxmox/install-proxmox-lxc.sh','utf8');
const channel=f.readFileSync('deploy/proxmox/arduino-led-channel','utf8');

function has(x,msg=x){ a.ok(host.includes(x),`Hiányzó Proxmox contract: ${msg}`); }

// OS lock.
has('OS_VERSION="13"');
has('OS_CODENAME="trixie"');
has('debian-13-standard_');
has('pveam update');
has('pveam download');
has('/etc/os-release');
has('VERSION_ID}" == "13"');
has('Nem váltunk vissza más Debian verzióra');

// Channel semantics.
has('Stable / main');
has('Beta / next/v5-rearchitecture');
has('CHANNEL="stable"');
has('BRANCH="main"');
has('CHANNEL="beta"');
has('BRANCH="next/v5-rearchitecture"');
has('/etc/arduino-led-channel');
has('/etc/arduino-led-branch');
has('Stable/main ágon a Rust LXC kiadás még nincs publikálva');

// Default / Advanced resources.
has('Default Settings');
has('Advanced Settings');
has('CPU cores');
has('Memory MiB');
has('Swap MiB');
has('Disk GB');
has('pvesh get /cluster/nextid');
has('pvesm status -content rootdir');
has('pvesm status -content vztmpl');
has('--unprivileged');
has('--onboot');

// Network behavior — do NOT contract against decorative "Network:" output.
has('NET_MODE="dhcp"');
has('DHCP');
has('Static IPv4');
has('Network bridge');
has('VLAN tag [none]');
has('ip=dhcp');
has('gw=${GATEWAY}');

// Container lifecycle.
has('pct create');
has('pct start "$CTID"');
has('pct exec "$CTID" -- passwd root');
has('ROOT_PASSWORD=CONFIGURED');

// Root login contract is functional + new UI, not old plain presentation text.
has('ui_key_value "Root login" "configured"');

// GitHub source/runtime.
has('GITHUB_REPO="LexyGuru/arduino-led-controller"');
has('archive/refs/heads/${BRANCH}.tar.gz');
has('prepare_github_payload');
has('GITHUB_RUNTIME_PAYLOAD=READY');
has('RUNTIME SOURCE');

// Arduino input.
has('Arduino private path prefix');
has('Arduino Device Key');
has('ARDUINO_CONFIG_INPUT=READY');

// Native installation + updater.
has('./deploy/install-rust-lxc-native.sh');
has('UPDATE_CHANNEL_SELECTED=');
has('arduino-led-controller/update.env');

// Runtime health.
has('/health/live');
has('LXC_SERVICE_LIVE=PASSED');
has('SERVICE_HEALTH=PASSED');

// New V5 UI is part of current installer contract.
has('ARDUINO LED CONTROLLER V5');
has('INSTALLATION SUMMARY');
has('INSTALLATION COMPLETE');
has('ui_key_value "Web UI"');
has('NO_COLOR');

a.ok(channel.includes('Stable / main'));
a.ok(channel.includes('Beta / next/v5-rearchitecture'));

console.log('PROXMOX_DEBIAN13_LOCK=PASSED');
console.log('PROXMOX_CHANNEL_SELECTION=PASSED');
console.log('PROXMOX_DEFAULT_ADVANCED=PASSED');
console.log('PROXMOX_RESOURCE_CONFIG=PASSED');
console.log('PROXMOX_STORAGE_NETWORK=PASSED');
console.log('PROXMOX_ROOT_PASSWORD=PASSED');
console.log('PROXMOX_GITHUB_RUNTIME_PAYLOAD=PASSED');
console.log('PROXMOX_SELF_UPDATE_CHANNEL=PASSED');
console.log('PROXMOX_RUNTIME_HEALTH=PASSED');
console.log('PROXMOX_V5_UX_COMPATIBILITY=PASSED');
console.log('PROXMOX_PHASE4_CONTRACT=PASSED');
