#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('assert/strict');
const r=fs.readFileSync('README.md','utf8');

a.ok(r.includes('5.5.0-beta.3'));
a.ok(r.includes('5.0.0-beta.8'));
a.ok(r.includes('Direct API | `1.0.0`'));
a.ok(r.includes('Debian 13 Rust LXC'));
a.ok(r.includes('React + Vite'));
a.ok(r.includes('Rust + Axum'));
a.ok(r.includes('automatikus frissítés'));
a.ok(r.includes('automatikusan visszaáll'));
a.ok(r.includes('6 óránként'));
a.ok(r.includes('next/v5-rearchitecture/deploy/proxmox/install-proxmox-lxc.sh'));
a.ok(r.includes('firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture'));
a.ok(r.includes('beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture'));
a.ok(!r.includes('img.shields.io/badge/Firmware_Beta-release-blue'));
a.ok(!r.includes('img.shields.io/badge/V5_Beta-release-blue'));
a.ok(!r.includes('Aktív fejlesztési ág | `feature/beta7-ui-overhaul`'));
a.ok(!r.includes('Node.js / LXC üzemeltetési réteg'));
console.log('README_BETA8_VERSION=PASSED');
console.log('README_DYNAMIC_WORKFLOW_BADGES=PASSED');
console.log('README_RUST_LXC=PASSED');
console.log('README_SELF_UPDATE=PASSED');
console.log('README_PROXMOX_INSTALL=PASSED');
