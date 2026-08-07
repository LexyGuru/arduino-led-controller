#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const s = fs.readFileSync('scripts/validate-repository.sh', 'utf8');

assert(s.includes("git ls-files -z"), 'tracked-file junk scan missing');
assert(!s.includes("! find . -path ./.git -prune -o -type f"),
  'legacy whole-worktree junk scan remains');
assert(s.includes("HIBA: trackelt szemét/build fájl"),
  'tracked junk failure message missing');
assert(s.includes("HIBA: titkos fájl trackelve"),
  'tracked secret protection missing');

for (const token of [".DS_Store", "*.bin", "*.elf", "*.hex", "*.log"]) {
  assert(s.includes(token), `junk protection missing: ${token}`);
}

console.log('REPOSITORY_VALIDATOR_SCOPE=TRACKED_FILES_ONLY');
console.log('TRACKED_JUNK_PROTECTION=PRESERVED');
console.log('TRACKED_SECRET_PROTECTION=PRESERVED');
console.log('LOCAL_CARGO_TARGET_FALSE_POSITIVE=REMOVED');
console.log('BETA8_REPOSITORY_VALIDATOR_V18=PASSED');
