"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const generator = fs.readFileSync("scripts/generate-v5-mobile-icons.sh", "utf8");
const helper = fs.readFileSync("scripts/add-ios-dark-app-icon.py", "utf8");

assert.match(generator, /v5-beta-dark\.png/);
assert.match(generator, /v5-stable-dark\.png/);
assert.match(generator, /add-ios-dark-app-icon\.py/);
assert.match(generator, /V5_IOS_DARK_APPICON=GENERATED/);

assert.match(helper, /"appearance": "luminosity"/);
assert.match(helper, /"value": "dark"/);
assert.match(helper, /"idiom": "universal"/);
assert.match(helper, /"platform": "ios"/);
assert.match(helper, /"size": "1024x1024"/);
assert.match(helper, /V5-AppIcon-1024-Light\.png/);
assert.match(helper, /V5-AppIcon-1024-Dark\.png/);

console.log("IOS_LIGHT_APPICON_VARIANT=WIRED");
console.log("IOS_DARK_APPICON_VARIANT=WIRED");
console.log("IOS_DARK_APPEARANCE=luminosity:dark");
console.log("V419_IOS_DARK_APPICON_CONTRACT=PASSED");
