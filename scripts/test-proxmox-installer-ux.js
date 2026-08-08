#!/usr/bin/env node
'use strict';
const fs=require('fs');
const a=require('node:assert/strict');
const s=fs.readFileSync('deploy/proxmox/install-proxmox-lxc.sh','utf8');

for (const marker of [
  'ARDUINO LED CONTROLLER V5',
  'PROXMOX • DEBIAN 13 • RUST',
  'Direct API v1 • React/Vite • Self Update',
  'ui_logo',
  'ui_section',
  'ui_step',
  'ui_ok',
  'ui_warn',
  'ui_info',
  'ui_key_value',
  'RELEASE CHANNEL',
  'INSTALLATION MODE',
  'ADVANCED SETTINGS',
  'DEBIAN 13 TEMPLATE',
  'INSTALLATION SUMMARY',
  'ARDUINO DIRECT API',
  'RUNTIME SOURCE',
  'ROOT ACCESS',
  'NETWORK',
  'INSTALLATION COMPLETE',
  'INSTALLED CHANNEL',
  'Auto Update',
  'Web UI',
  'NO_COLOR',
]) a.ok(s.includes(marker),`Hiányzó UX marker: ${marker}`);

for (const preserved of [
  'Stable / main',
  'Beta / next/v5-rearchitecture',
  'Default Settings',
  'Advanced Settings',
  'Debian 13',
  'pct exec "$CTID" -- passwd root',
  'ROOT_PASSWORD=CONFIGURED',
  'ARDUINO_CONFIG_INPUT=READY',
  'UPDATE_CHANNEL_SELECTED=',
  'LXC_SERVICE_LIVE=PASSED',
  'SERVICE_HEALTH=PASSED',
  'PROXMOX_LXC_INSTALL=SUCCESS',
]) a.ok(s.includes(preserved),`Meglévő installer contract sérült: ${preserved}`);

a.ok(s.includes("\\033[38;5;51m"));
a.ok(s.includes("\\033[38;5;39m"));
a.ok(s.includes("\\033[38;5;141m"));
a.ok(s.includes('[[ -t 1 ]]'));

console.log('PROXMOX_INSTALLER_V5_VISUAL_DNA=PASSED');
console.log('PROXMOX_INSTALLER_STATUS_ICONS=PASSED');
console.log('PROXMOX_INSTALLER_SUMMARY_CARD=PASSED');
console.log('PROXMOX_INSTALLER_SUCCESS_SCREEN=PASSED');
console.log('PROXMOX_INSTALLER_NO_COLOR_FALLBACK=PASSED');
console.log('PROXMOX_INSTALLER_EXISTING_LOGIC_PRESERVED=PASSED');
