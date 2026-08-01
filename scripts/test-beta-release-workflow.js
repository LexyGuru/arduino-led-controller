#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const s=fs.readFileSync('.github/workflows/beta-release.yml','utf8');
assert.match(s,/EXPECTED_VERSION: 5\.0\.0-beta\.3/);
assert.match(s,/EXPECTED_FIRMWARE_VERSION: 4\.3\.0-beta\.1/);
assert.match(s,/next\/v5-rearchitecture/);
assert.match(s,/npm test/);
assert.match(s,/validate-repository\.sh/);
assert.match(s,/firmware-build|UNO R4 WiFi firmware/);
assert.match(s,/prerelease: true/);
assert.match(s,/make_latest: false/);
assert.doesNotMatch(s,/firmware-latest/);
assert.doesNotMatch(s,/4\.1\.21/);
console.log('OK: Beta workflow 5.0.0-beta.3 / firmware 4.3.0-beta.1');
