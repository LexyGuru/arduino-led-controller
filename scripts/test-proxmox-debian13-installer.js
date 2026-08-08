#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'), f=require('node:fs');

const host=f.readFileSync('deploy/proxmox/install-proxmox-lxc.sh','utf8');
const channel=f.readFileSync('deploy/proxmox/arduino-led-channel','utf8');

a.ok(host.includes('OS_VERSION="13"'));
a.ok(host.includes('debian-13-standard_'));
a.ok(host.includes('Stable / main'));
a.ok(host.includes('Beta / next/v5-rearchitecture'));
a.ok(host.includes('Default Settings'));
a.ok(host.includes('Advanced Settings'));
a.ok(host.includes('CPU cores'));
a.ok(host.includes('Memory MiB'));
a.ok(host.includes('Swap MiB'));
a.ok(host.includes('Disk GB'));
a.ok(host.includes('pvesh get /cluster/nextid'));
a.ok(host.includes('pvesm status -content rootdir'));
a.ok(host.includes('pvesm status -content vztmpl'));
a.ok(host.includes('pveam update'));
a.ok(host.includes('pveam download'));
a.ok(host.includes('pct create'));
a.ok(host.includes('--unprivileged'));
a.ok(host.includes('--onboot'));
a.ok(host.includes('Network:'));
a.ok(host.includes('DHCP'));
a.ok(host.includes('Static IPv4'));
a.ok(host.includes('/etc/os-release'));
a.ok(host.includes('VERSION_ID}" == "13"'));
a.ok(host.includes('/etc/arduino-led-channel'));
a.ok(host.includes('/etc/arduino-led-branch'));
a.ok(host.includes('GITHUB_REPO="LexyGuru/arduino-led-controller"'));
a.ok(host.includes('archive/refs/heads/${BRANCH}.tar.gz'));
a.ok(host.includes('GITHUB_RUNTIME_PAYLOAD=READY'));
a.ok(host.includes('Stable/main ágon a Rust LXC kiadás még nincs publikálva'));
a.ok(channel.includes('Stable / main'));
a.ok(channel.includes('Beta / next/v5-rearchitecture'));

console.log('PROXMOX_DEBIAN13_LOCK=PASSED');
console.log('PROXMOX_CHANNEL_SELECTION=PASSED');
console.log('PROXMOX_DEFAULT_ADVANCED=PASSED');
console.log('PROXMOX_RESOURCE_CONFIG=PASSED');
console.log('PROXMOX_STORAGE_NETWORK=PASSED');
console.log('PROXMOX_LOCAL_PAYLOAD_INSTALL=PASSED');
console.log('PROXMOX_PHASE4_CONTRACT=PASSED');
