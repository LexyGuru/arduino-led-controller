#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8')
);
const workflow = fs.readFileSync(
  '.github/workflows/beta-release.yml',
  'utf8'
);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

assert.equal(versions.application, '5.0.0-beta.4');
assert.equal(versions.firmware, '4.3.0-beta.3');
assert.equal(versions.channel, 'beta');

assert.match(
  workflow,
  new RegExp(
    `EXPECTED_VERSION: ${escapeRegex(versions.application)}`
  )
);
assert.match(
  workflow,
  new RegExp(
    `EXPECTED_FIRMWARE_VERSION: ${escapeRegex(versions.firmware)}`
  )
);
assert.match(workflow, /next\/v5-rearchitecture/);
assert.match(
  workflow,
  /push:\n    branches:\n      - next\/v5-rearchitecture/
);
assert.doesNotMatch(
  workflow,
  /push:\n[\s\S]*?branches:\n      - next\/v5-rearchitecture[\s\S]*?    paths:/
);
assert.match(workflow, /npm test/);
assert.match(workflow, /validate-repository\.sh/);
assert.match(workflow, /firmware-build|UNO R4 WiFi firmware/);
assert.match(workflow, /prerelease: true/);
assert.match(workflow, /make_latest: false/);
assert.doesNotMatch(workflow, /firmware-latest/);
assert.doesNotMatch(workflow, /4\.1\.21/);
assert.doesNotMatch(
  workflow,
  /EXPECTED_VERSION: 5\.0\.0-beta\.3/
);
assert.doesNotMatch(
  workflow,
  /EXPECTED_FIRMWARE_VERSION: 4\.3\.0-beta\.2/
);

console.log(
  `OK: Beta workflow ${versions.application} / firmware ${versions.firmware}`
);
