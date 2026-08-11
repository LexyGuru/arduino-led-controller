const fs=require('fs'),assert=require('assert'),crypto=require('crypto');

const files={
  betaLight:'branding/v5-neon-panel/variants/v5-beta-light-master.png',
  betaDark:'branding/v5-neon-panel/variants/v5-beta-dark-master.png',
  stableLight:'branding/v5-neon-panel/variants/v5-stable-light-master.png',
  stableDark:'branding/v5-neon-panel/variants/v5-stable-dark-master.png',
  runtimeBetaLight:'desktop-tauri/src-tauri/icons/runtime/v5-beta-light.png',
  runtimeBetaDark:'desktop-tauri/src-tauri/icons/runtime/v5-beta-dark.png',
  runtimeStableLight:'desktop-tauri/src-tauri/icons/runtime/v5-stable-light.png',
  runtimeStableDark:'desktop-tauri/src-tauri/icons/runtime/v5-stable-dark.png'
};

for(const f of Object.values(files)){
  assert.ok(fs.existsSync(f),`missing ${f}`);
  assert.ok(fs.statSync(f).size>0,`empty ${f}`);
}

const sha=f=>crypto
  .createHash('sha256')
  .update(fs.readFileSync(f))
  .digest('hex');

assert.notStrictEqual(sha(files.betaLight),sha(files.betaDark));
assert.notStrictEqual(sha(files.stableLight),sha(files.stableDark));

assert.strictEqual(sha(files.betaLight),sha(files.runtimeBetaLight));
assert.strictEqual(sha(files.betaDark),sha(files.runtimeBetaDark));
assert.strictEqual(sha(files.stableLight),sha(files.runtimeStableLight));
assert.strictEqual(sha(files.stableDark),sha(files.runtimeStableDark));

const docs=fs.readFileSync(
  'branding/v5-neon-panel/variants/README.md','utf8'
);

assert.match(docs,/Light artwork guarantee/i);
assert.match(docs,/Light masters/i);
assert.match(docs,/bright white\/silver rounded icon body/i);
assert.match(docs,/Beta \+ Light/);
assert.match(docs,/Beta \+ Dark/);
assert.match(docs,/Stable \+ Light/);
assert.match(docs,/Stable \+ Dark/);
assert.match(docs,/alpha transparency/i);

console.log('V5_FINAL_TRUE_LIGHT_ICON_CONTRACT=PASSED');
