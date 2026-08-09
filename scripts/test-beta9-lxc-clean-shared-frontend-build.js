const fs=require('fs');
const assert=require('node:assert/strict');

const files=[
  'deploy/update-rust-lxc.sh',
  'deploy/install-rust-lxc-native.sh',
];

for(const file of files){
  const s=fs.readFileSync(file,'utf8');
  const marker=s.indexOf('# BETA9_SHARED_FRONTEND_DEPENDENCIES');
  assert.ok(marker>=0, `${file}: dependency marker missing`);
  const desktopCi=s.indexOf('desktop-tauri',marker);
  assert.ok(desktopCi>=0, `${file}: desktop-tauri dependency bootstrap missing`);
  const webCd=s.indexOf('/web-lxc',marker);
  const webPrefix=s.indexOf('web-lxc',marker);
  const webAnchor=[webCd,webPrefix].filter(v=>v>=0);
  assert.ok(webAnchor.length>0, `${file}: web-lxc build anchor missing`);
  const firstWeb=Math.min(...webAnchor);
  assert.ok(desktopCi < firstWeb, `${file}: desktop dependencies must be installed before web-lxc build`);
  assert.ok(
    s.slice(marker, firstWeb).includes('npm --prefix') &&
    s.slice(marker, firstWeb).includes('desktop-tauri') &&
    s.slice(marker, firstWeb).includes(' ci'),
    `${file}: desktop npm ci missing before web build`
  );
}

const lxcMain=fs.readFileSync('web-lxc/src/main.tsx','utf8');
const api=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const vite=fs.readFileSync('web-lxc/vite.config.ts','utf8');
assert.ok(lxcMain.includes('../../desktop-tauri/src/main'),'canonical shared frontend import missing');
assert.ok(api.includes('@tauri-apps/api/core'),'shared frontend Tauri dependency marker missing');
assert.ok(fs.existsSync('desktop-tauri/public/v5-icon.png'),'canonical v5-icon.png missing');
assert.ok(vite.includes('publicDir: canonicalPublicDir'),'web-lxc canonical publicDir missing');
assert.ok(vite.includes("../desktop-tauri"),'web-lxc canonical desktop root missing');

console.log('LXC_CANONICAL_FRONTEND=PASSED');
console.log('LXC_DESKTOP_DEPENDENCY_BOOTSTRAP=PASSED');
console.log('LXC_CANONICAL_PUBLIC_ASSETS=PASSED');
console.log('LXC_CLEAN_SHARED_FRONTEND_BUILD_CONTRACT=PASSED');
