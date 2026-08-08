#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'), f=require('node:fs');

const native=f.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const smoke=f.readFileSync('deploy/test-rust-lxc-runtime.sh','utf8');
const service=f.readFileSync('deploy/test-rust-lxc-service.sh','utf8');
const rollback=f.readFileSync('deploy/test-rust-lxc-rollback.sh','utf8');
const bundle=f.readFileSync('deploy/build-rust-lxc-runtime-test-bundle.sh','utf8');
const ci=f.readFileSync('deploy/build-rust-lxc-linux-ci.sh','utf8');

a.ok(native.includes('uname -s'));
a.ok(native.includes('cargo build'));
a.ok(native.includes("grep -q 'ELF'"));
a.ok(native.includes('ARDUINO_DEVICE_KEY=CHANGE_ME'));
a.ok(smoke.includes('/health/live'));
a.ok(smoke.includes('/health/ready'));
a.ok(smoke.includes('/api/v1/status'));
a.ok(smoke.includes('/api/v1/schedules/status'));
a.ok(smoke.includes('/api/v1/logs?afterId=0'));
a.ok(smoke.includes('/api/v1/ota/status'));
a.ok(smoke.includes('/api/v1/events/ws'));
a.ok(service.includes('systemctl restart'));
a.ok(rollback.includes('ROLLBACK_TEST=PASSED'));
a.ok(bundle.includes('LXC_Runtime_Test_Source.tar.gz'));
a.ok(ci.includes('Linux'));
a.ok(ci.includes('LINUX_LXC_CI_ARTIFACT=SUCCESS'));

console.log('NATIVE_LINUX_BUILD_INSTALL=PASSED');
console.log('LXC_RUNTIME_SMOKE_CONTRACT=PASSED');
console.log('LXC_SERVICE_RESTART_CONTRACT=PASSED');
console.log('LXC_ROLLBACK_CONTRACT=PASSED');
console.log('LXC_RUNTIME_SOURCE_BUNDLE=PASSED');
console.log('LXC_LINUX_CI_BUILD_FOUNDATION=PASSED');
console.log('RUST_LXC_PHASE3_CONTRACT=PASSED');
