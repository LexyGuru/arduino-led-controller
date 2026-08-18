#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const output = process.argv[2] || path.join(process.cwd(), 'V587_THEME_OWNERSHIP_AUDIT.txt');

const extensions = new Set(['.css','.tsx','.ts']);
const ignoreDirs = new Set(['node_modules','dist','target','.git']);
const tokenSourceNames = new Set([
  'beta7-theme.css',
  'theme-engine-v2.css',
  'theme-engine-v3.css'
]);

const hex = /#[0-9a-fA-F]{3,8}\b/g;
const rgb = /\brgba?\([^)]*\)/g;
const gradient = /\b(?:linear|radial|conic)-gradient\(/g;

const rows = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const rel = path.relative(root, full);
      if (!rel.startsWith('desktop-tauri/src/')) continue;
      const text = fs.readFileSync(full, 'utf8');
      const h = (text.match(hex) || []).length;
      const r = (text.match(rgb) || []).length;
      const g = (text.match(gradient) || []).length;
      if (!h && !r && !g) continue;
      let owner = 'COMPONENT_LITERAL_REVIEW';
      if (tokenSourceNames.has(entry.name)) owner = 'TOKEN_SOURCE';
      if (/DashboardPage\.tsx|SchedulesPage\.tsx/.test(rel) && /rgb\(\$\{/.test(text)) {
        owner = 'DATA_COLOR_MIXED';
      }
      if (/theme-advanced\.ts/.test(rel)) owner = 'PALETTE_GENERATOR_SOURCE';
      rows.push({ rel, owner, h, r, g, total: h + r + g });
    }
  }
}
walk(path.join(root, 'desktop-tauri/src'));
rows.sort((a,b)=>b.total-a.total || a.rel.localeCompare(b.rel));

const componentReview = rows.filter(r=>r.owner==='COMPONENT_LITERAL_REVIEW');
const dataColor = rows.filter(r=>r.owner==='DATA_COLOR_MIXED');

const lines = [];
lines.push('V587 THEME HARD-CODED COLOR OWNERSHIP AUDIT');
lines.push('================================================');
lines.push(`FILES_WITH_COLOR_OR_GRADIENT_LITERALS=${rows.length}`);
lines.push(`COMPONENT_LITERAL_REVIEW_FILES=${componentReview.length}`);
lines.push(`DYNAMIC_LED_DATA_COLOR_FILES=${dataColor.length}`);
lines.push('');
lines.push('CLASSIFICATION');
lines.push('TOKEN_SOURCE = canonical theme token/preset definitions; literals are expected.');
lines.push('PALETTE_GENERATOR_SOURCE = generated palette seed/constants; literals are expected.');
lines.push('DATA_COLOR_MIXED = actual LED/data color rendering may legitimately use dynamic rgb(...).');
lines.push('COMPONENT_LITERAL_REVIEW = candidate for future component-owner migration; not blindly replaced.');
lines.push('');
lines.push('FILES');
for (const r of rows) {
  lines.push(`${r.owner}\t${r.total}\tHEX=${r.h}\tRGB=${r.r}\tGRADIENT=${r.g}\t${r.rel}`);
}
fs.writeFileSync(output, lines.join('\n') + '\n');

console.log(`V587_HARDCODED_COLOR_AUDIT_FILE=${output}`);
console.log(`V587_COMPONENT_LITERAL_REVIEW_FILES=${componentReview.length}`);
console.log('V587_DYNAMIC_LED_DATA_COLORS=EXEMPTED_AS_DATA');
console.log('V587_BLIND_GLOBAL_COLOR_REPLACEMENT=NOT_PERFORMED');
