#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const main = fs.readFileSync(
  'desktop-tauri/src/main.tsx',
  'utf8',
);
const provider = fs.readFileSync(
  'desktop-tauri/src/design-system/ThemeProvider.tsx',
  'utf8',
);
const storage = fs.readFileSync(
  'desktop-tauri/src/design-system/theme-storage.ts',
  'utf8',
);
const types = fs.readFileSync(
  'desktop-tauri/src/design-system/theme-types.ts',
  'utf8',
);
const settings = fs.readFileSync(
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'utf8',
);
const appearance = fs.readFileSync(
  'desktop-tauri/src/components/AppearanceSettings.tsx',
  'utf8',
);
const css = fs.readFileSync(
  'desktop-tauri/src/beta7-theme.css',
  'utf8',
);
const i18n = fs.readFileSync(
  'scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt',
  'utf8',
);

assert.match(main, /<ThemeProvider>/);
assert.match(main, /import '.\/beta7-theme\.css'/);
assert.match(provider, /prefers-color-scheme: light/);
assert.match(provider, /root\.dataset\.theme/);
assert.match(provider, /root\.dataset\.appearance/);
assert.match(provider, /root\.dataset\.accent/);
assert.match(provider, /root\.dataset\.density/);
assert.match(provider, /root\.dataset\.radius/);
assert.match(storage, /arduino-led-controller\.appearance\.v1/);
assert.match(storage, /normalizeAppearance/);
assert.match(types, /'arctic'/);
assert.match(types, /'midnight'/);
assert.match(settings, /import \{ AppearanceSettings \}/);
assert.match(settings, /<AppearanceSettings \/>/);
assert.match(settings, /AppearanceSettings \/>[\s\S]*settings\.direct\.eyebrow/);
assert.match(appearance, /appearance\.mode/);
assert.match(appearance, /appearance\.theme/);
assert.match(appearance, /appearance\.accent/);
assert.match(css, /html\[data-theme='arctic'\]/);
assert.match(css, /html\[data-theme='midnight'\]/);
assert.match(css, /--ds-background/);
assert.match(css, /--ds-surface/);
assert.match(css, /--ds-text/);
assert.match(css, /--ds-accent/);
assert.match(css, /prefers-reduced-motion/);

for (const key of [
  'appearance.eyebrow',
  'appearance.title',
  'appearance.mode',
  'appearance.mode.system',
  'appearance.mode.light',
  'appearance.mode.dark',
  'appearance.theme',
  'appearance.theme.arctic',
  'appearance.theme.midnight',
  'appearance.accent',
  'appearance.density',
  'appearance.radius',
  'appearance.animations',
  'appearance.glass',
  'appearance.help',
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (
    i18n.match(
      new RegExp(
        `['"]${escaped}['"]`,
        'g',
      ),
    ) || []
  ).length;

  assert.equal(
    count,
    3,
    `${key}: HU/EN/DE parity`,
  );
}

console.log(
  'OK: Beta.7 Theme Engine, Arctic/Midnight, persistence és Design System contract',
);
