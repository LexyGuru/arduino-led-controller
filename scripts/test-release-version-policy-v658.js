#!/usr/bin/env node
'use strict';
const versionSsot=require('./lib/version-ssot');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);

const version=read('VERSION').trim();
const release=JSON.parse(read('release-versions.json'));
assert.equal(release.application,versionSsot.application);
assert.equal(release.applicationRelease.version,versionSsot.application);
assert.equal(release.directApiRelease.version,versionSsot.directApi);

let prefix;
if (release.channel === 'beta') {
  assert.equal(release.applicationRelease.channel,'beta');
  assert.equal(release.applicationRelease.branch,'next/v5-rearchitecture');
  assert.equal(release.applicationRelease.updaterAlias,'updater-beta');
  assert.equal(release.applicationRelease.releaseType,'prerelease');
  const m=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
  assert.ok(m,`Unsupported Beta version: ${version}`);
  const [,major,minor,,betaNumber]=m;
  prefix=major==='5'&&minor==='0'?`BETA${betaNumber}`:`V${major}${minor}_BETA${betaNumber}`;
  const workflow=read('.github/workflows/app-beta-release.yml');
  assert.match(workflow,/release-versions\.json/);
  assert.match(workflow,/applicationRelease\.branch/);
  assert.doesNotMatch(workflow,/EXPECTED_VERSION:/);
  assert.doesNotMatch(workflow,/EXPECTED_BRANCH:/);
} else {
  assert.equal(release.channel,'stable');
  assert.equal(release.applicationRelease.channel,'stable');
  assert.equal(release.applicationRelease.branch,'main');
  assert.equal(release.applicationRelease.updaterAlias,'updater-stable');
  assert.equal(release.applicationRelease.releaseType,'release');
  const m=version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(m,`Unsupported Stable version: ${version}`);
  const [,major,minor]=m;
  prefix=`V${major}${minor}_STABLE`;
  const workflow=read('.github/workflows/app-stable-release.yml');
  assert.match(workflow,/EXPECTED_BRANCH:\s*main|applicationRelease\.branch/);
  assert.match(workflow,/updater-stable/);
}

const notes=`docs/v5/${prefix}_RELEASE_NOTES.md`;
const guide=`docs/v5/${prefix}_INSTALLATION_GUIDE.md`;
const checklist=`docs/v5/${prefix}_RELEASE_CHECKLIST.md`;
const rootNotes=`RELEASE_NOTES_${version}.md`;

for(const p of [notes,guide,checklist,rootNotes,'docs/v5/RELEASE_VERSION_POLICY.md']){
  assert.equal(exists(p),true,`Missing mandatory release artifact: ${p}`);
}
for(const p of [notes,guide,checklist,rootNotes]){
  const text=read(p);
  assert.ok(text.includes(version),`${p}: application version missing`);
  assert.ok(text.includes(release.firmware),`${p}: firmware version missing`);
  assert.ok(text.includes(release.directApi),`${p}: Direct API version missing`);
}
// V6 keeps two release-note surfaces with different presentation roles:
// docs/v5 is the detailed technical release document, while the root file is
// the concise publication summary. Validate shared release truth semantically.
for (const text of [read(notes), read(rootNotes)]) {
  assert.ok(text.includes(version));
  assert.ok(text.includes(release.firmware));
  assert.ok(text.includes(release.directApi));
  assert.ok(text.includes('Language Pack Architecture 2.0'));
  assert.match(text,/Hungarian[\s\S]*1\.0\.0/);
  assert.match(text,/German[\s\S]*1\.0\.0/);
  assert.match(text,/French[\s\S]*pending/i);
}
assert.match(read(rootNotes),/Hungarian[\s\S]*published/i);
assert.match(read(rootNotes),/German[\s\S]*published/i);

const readme=read('README.md');
assert.ok(readme.includes(version));
assert.ok(readme.includes(notes));
assert.ok(readme.includes(rootNotes));

const state=read('docs/v5/CURRENT_STATE.md');
assert.ok(state.includes(version));
assert.ok(state.includes(release.firmware));

const changelog=read('CHANGELOG.md');
assert.ok(changelog.startsWith(`# ${version} — `));

const policy=read('docs/v5/RELEASE_VERSION_POLICY.md');
assert.match(policy,/Every GitHub publication of application source is a new application version/i);
assert.match(policy,/README/);
assert.match(policy,/CHANGELOG/);

console.log(`RELEASE_VERSION_POLICY=PASSED:${version}:${prefix}`);
console.log('MANDATORY_RELEASE_DOCUMENTATION=PASSED');
console.log(`APPLICATION_RELEASE_CHANNEL=${release.channel}`);
