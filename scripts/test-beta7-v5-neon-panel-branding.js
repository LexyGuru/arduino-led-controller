#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const required = [
  'desktop-tauri/src-tauri/icons/icon.png',
  'desktop-tauri/src-tauri/icons/32x32.png',
  'desktop-tauri/src-tauri/icons/128x128.png',
  'desktop-tauri/src-tauri/icons/128x128@2x.png',
  'desktop-tauri/src-tauri/icons/icon.ico',
  'desktop-tauri/src-tauri/icons/icon.icns',
  'desktop-tauri/src-tauri/icons/icon.svg',
  'desktop-tauri/public/v5-icon.png',
  'docs/assets/v5-neon-panel-presentation.png'
];

for (const file of required) {
  assert(fs.existsSync(file), `missing branding asset: ${file}`);
  assert(fs.statSync(file).size > 0, `empty branding asset: ${file}`);
}

const sidebar = fs.readFileSync('desktop-tauri/src/components/Sidebar.tsx', 'utf8');
assert(
  sidebar.includes('className="brand-mark"') &&
  sidebar.includes('src="/v5-icon.png"'),
  'Sidebar brand-mark must render the V5 icon image'
);

const css = fs.readFileSync('desktop-tauri/src/styles.css', 'utf8');
assert(
  css.includes('.brand-mark img') &&
  css.includes('object-fit:cover'),
  'brand-mark image sizing rule missing'
);

const readme = fs.readFileSync('README.md', 'utf8');
assert(
  readme.includes('docs/assets/v5-neon-panel-presentation.png'),
  'README does not reference V5 presentation image'
);

console.log('V5_NEON_PANEL_ASSETS=PASSED');
console.log('V5_BRAND_MARK=PASSED');
console.log('V5_README_PRESENTATION=PASSED');
console.log('V5_NEON_PANEL_BRANDING_CONTRACT=PASSED');
