'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CURRENT_VERSION = '5.0.0-beta.1';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function main() {
  const version = read('VERSION').trim();
  const roadmap = read('fejlesztes_readme.md');
  const status = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const runbook = read('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md');
  const alpha3Notes = read('docs/v5/ALPHA3_RELEASE_NOTES_DRAFT.md');
  const betaNotes = read('docs/v5/BETA1_RELEASE_NOTES.md');
  const betaChecklist = read('docs/v5/BETA1_RELEASE_CHECKLIST.md');
  const betaGuide = read('docs/v5/BETA1_INSTALLATION_GUIDE.md');
  const betaManifest = JSON.parse(
    read('docs/v5/PACKAGE_MANIFEST_BETA1_DISTRIBUTION.json')
  );

  const mergeCommit = '295713798b1487ec2c788b170be2fce32fccea2a';
  const featureCommit = 'e2dc8ac41edf39717b4e2708e6b03aba0b6431bb';
  const mainBaseline = '58e01b40e4568f5cd2648d370614077ef08aa1ba';

  assert.strictEqual(version, CURRENT_VERSION);

  for (const [name, content] of [
    ['roadmap', roadmap],
    ['implementation status', status],
    ['checklist', checklist],
    ['integration runbook', runbook],
    ['Alpha.3 release notes', alpha3Notes]
  ]) {
    assert.ok(content.includes(mergeCommit), `${name}: hiányzó Alpha.3 merge commit`);
  }

  assert.ok(roadmap.includes('**Alkalmazásverzió:** `5.0.0-alpha.3`'));
  assert.ok(roadmap.includes('teljes Alpha.3 alkalmazási staging'));
  assert.ok(roadmap.includes('artifact-only Tauri desktop CI'));
  assert.ok(roadmap.includes(mainBaseline));

  assert.ok(status.includes('aktuális alkalmazásverzió: `5.0.0-alpha.3`'));
  assert.ok(status.includes('Kész – hardveren igazolt'));
  assert.ok(status.includes('query fallback átmenetileg engedélyezett'));
  assert.ok(checklist.includes('Aktuális verzió: `5.0.0-alpha.3`'));
  assert.ok(checklist.includes('- [x] `5.0.0-alpha.3` finalization'));
  assert.ok(checklist.includes('Artifact-only Tauri CI'));

  assert.ok(runbook.includes('## Alpha.3 integrációs frissítés – 2026-07-30'));
  assert.ok(runbook.includes(featureCommit));
  assert.ok(runbook.includes('30536184636'));
  assert.ok(alpha3Notes.includes('Az alkalmazásverzió `5.0.0-alpha.3`'));
  assert.ok(
    alpha3Notes.includes(
      '`main` merge és produkciós telepítés továbbra is tiltott'
    )
  );

  assert.ok(betaNotes.includes(CURRENT_VERSION));
  assert.match(betaNotes, /első nyilvános béta-prerelease/i);
  assert.match(betaNotes, /main.*nem módosul/is);
  assert.ok(betaChecklist.includes(CURRENT_VERSION));
  assert.ok(betaChecklist.includes('Teljes alkalmazási staging'));
  assert.ok(betaGuide.includes(CURRENT_VERSION));
  assert.ok(betaGuide.includes('Windows x86_64'));
  assert.ok(betaGuide.includes('Debian 12 / Proxmox LXC'));
  assert.strictEqual(betaManifest.applicationVersionAfter, CURRENT_VERSION);
  assert.strictEqual(betaManifest.githubPrerelease, true);
  assert.strictEqual(betaManifest.mainMergeIncluded, false);
  assert.strictEqual(betaManifest.productionDeploymentIncluded, false);

  for (const content of [roadmap, status, checklist, runbook, alpha3Notes]) {
    assert.ok(!content.includes('PR merge: még nem történt meg'));
    assert.ok(
      !content.includes(
        'hardver-, staging- és fallback-off bizonyítás még nyitott'
      )
    );
  }

  console.log('OK: Alpha.3 történeti integrációs dokumentáció megmaradt');
  console.log('OK: Beta.1 release notes, checklist és telepítési útmutató egységes');
  console.log('OK: 5.0.0-beta.1 prerelease és terjesztési manifest rögzítve');
  console.log('OK: main merge és produkciós deploy továbbra is tiltott');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
