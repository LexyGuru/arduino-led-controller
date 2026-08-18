#!/usr/bin/env node
'use strict';

const fs=require('fs');
const assert=require('node:assert/strict');

const readme=fs.readFileSync('README.md','utf8');

assert.ok(
  readme.includes(
    'firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture'
  ),
  'Firmware Beta dynamic workflow badge hiányzik'
);

assert.ok(
  readme.includes(
    'app-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture'
  ),
  'V5 Beta dynamic workflow badge hiányzik'
);

assert.ok(
  !readme.includes('img.shields.io/badge/Firmware_Beta-release-blue'),
  'Legacy Firmware Beta Shields badge maradt a README-ben'
);

assert.ok(
  !readme.includes('img.shields.io/badge/V5_Beta-release-blue'),
  'Legacy V5 Beta Shields badge maradt a README-ben'
);

assert.ok(
  !readme.includes('feature/beta7-ui-overhaul'),
  'A fő README-ben történeti Beta.7 feature ág maradt aktuális állapotként'
);

console.log('README_DYNAMIC_FIRMWARE_BADGE=PASSED');
console.log('README_DYNAMIC_V5_BADGE=PASSED');
console.log('README_LEGACY_SHIELDS_BADGES=ABSENT');
console.log('README_CURRENT_BRANCH=NEXT_V5_REARCHITECTURE');
