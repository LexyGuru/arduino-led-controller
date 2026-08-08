#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('assert/strict');

const b=fs.readFileSync('deploy/build-rust-lxc-runtime-test-bundle.sh','utf8');

a.ok(b.includes('cp -R "${ROOT}/web-lxc" "$STAGE/web-lxc"'));
a.ok(b.includes('"$STAGE/web-lxc/node_modules"'));
a.ok(b.includes('"$STAGE/web-lxc/dist"'));
a.ok(b.includes('deploy/update-rust-lxc.sh'));
a.ok(b.includes('deploy/rust-lxc-update.env.example'));
a.ok(b.includes('arduino-led-controller-update.service'));
a.ok(b.includes('arduino-led-controller-update.timer'));

console.log('LXC_RUNTIME_BUNDLE_WEB_SOURCE=PASSED');
console.log('LXC_RUNTIME_BUNDLE_SELF_UPDATE_ASSETS=PASSED');
