'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CANDIDATE = '1236becc37e9b4d8ed2334f3cd60b455c248e82d';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function main() {
  const roadmap = read('fejlesztes_readme.md');
  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const status = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const runbook = read('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md');
  const finalization = read('docs/v5/ALPHA2_VERSION_FINALIZATION.md');

  assert.match(roadmap, /## 0\. Aktuális megvalósítási állapot/);
  assert.match(roadmap, /Státusz frissítve:\*\* 2026-07-30/);
  assert.ok(roadmap.includes(CANDIDATE));
  assert.ok(roadmap.includes('10.0.0.123:80'));
  assert.ok(roadmap.includes('docs/v5/V5_IMPLEMENTATION_STATUS.md'));
  assert.ok(roadmap.includes('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md'));
  assert.match(roadmap, /# 10\. Aktuális következő konkrét lépések/);
  assert.doesNotMatch(
    roadmap.slice(roadmap.indexOf('# 10. Aktuális következő konkrét lépések')),
    /git switch main\s+git pull/
  );

  assert.match(checklist, /Utolsó frissítés: 2026-07-30/);
  assert.match(checklist, /## Dokumentáció és integrációs előkészítés/);
  assert.match(checklist, /- \[x\] Pull Request a `next\/v5-rearchitecture` ágba \(`#1`\)/);
  assert.match(checklist, /- \[ \] Beolvasztás `next\/v5-rearchitecture` ágba/);
  assert.match(checklist, /- \[ \] Beolvasztás `main` ágba/);
  assert.match(checklist, /Alpha\.3 runtime munkacsomag/);

  assert.ok(status.includes('5.0.0-alpha.2'));
  assert.ok(status.includes(CANDIDATE));
  assert.ok(status.includes('Produkciós V5 telepítés | Tilos / korai'));
  assert.ok(status.includes('X-Device-Key'));
  assert.ok(status.includes('Pull Request: `#1`'));
  assert.ok(status.includes('módosított fájlok: 432'));

  assert.ok(
    runbook.includes(
      'integration/v5-alpha2-server-modularization → next/v5-rearchitecture'
    )
  );
  assert.ok(runbook.includes('git merge --abort'));
  assert.ok(runbook.includes('feature/v5-arduino-device-key-header'));
  assert.ok(runbook.includes('10.0.0.123:80'));
  assert.ok(runbook.includes('Pull Request `#1`'));
  assert.ok(runbook.includes('432 fájlt'));
  assert.ok(runbook.includes('HTTP 406'));

  assert.ok(finalization.includes('Dokumentációs lezárás'));
  assert.ok(finalization.includes('külön Alpha.3 munkacsomag'));

  console.log('OK: master roadmap és rövid checklist szinkronban');
  console.log('OK: részletes implementációs státusz naprakész');
  console.log('OK: feature → next integráció és PR #1 dokumentált');
  console.log('OK: main és produkciós telepítés továbbra is tiltott');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
