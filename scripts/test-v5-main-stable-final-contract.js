const fs=require('fs'),assert=require('assert');

const rootPkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('desktop-tauri/package.json','utf8'));
const tauri=JSON.parse(fs.readFileSync('desktop-tauri/src-tauri/tauri.conf.json','utf8'));
const cargo=fs.readFileSync('desktop-tauri/src-tauri/Cargo.toml','utf8');
const version=fs.readFileSync('VERSION','utf8').trim();
const sidebar=fs.readFileSync('desktop-tauri/src/components/Sidebar.tsx','utf8');
const badge=fs.readFileSync('desktop-tauri/src/components/v5/V5BetaBadge.tsx','utf8');
const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const readme=fs.readFileSync('README.md','utf8');

for(const value of [rootPkg.version,pkg.version,tauri.version,version]){
  assert.strictEqual(value,'5.0.0');
}
assert.match(cargo,/^version\s*=\s*"5\.0\.0"\s*$/m);

assert.match(sidebar,/V5BetaBadge/);
assert.match(badge,/beta/i);
assert.match(rust,/contains\("beta"\)/);
assert.match(rust,/stable-light/);
assert.match(rust,/stable-dark/);

assert.match(readme,/Aktuális stabil alkalmazás/);
assert.match(readme,/V5 Stable \/ Final/);
assert.match(readme,/next\/v5-rearchitecture/);

console.log('V5_MAIN_STABLE_FINAL_CONTRACT=PASSED');
