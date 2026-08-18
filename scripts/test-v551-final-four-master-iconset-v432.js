const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const expected = {
 stableDark: 'a0675281753fd7bdcb5778782533eaafae205416f48e5b54136f618cde241055',
 stableLight: 'e540bf5237a8c35cabded350d15053438ee949d9512a89ac1be117409466950b',
 betaDark: '20b799f382218544d84768099317cb95abe585e7ec83d1fb5ccc326134458962',
 betaLight: '24d04c01b3ed3cf409687cd9fbe3488425c7046f1a80ac83a73c2c5739b77832',
};

const base = path.join('desktop-tauri','src-tauri','icons');
const canonicalDir = path.join(base,'canonical');
const legacyRuntimeDir = path.join(base,'runtime');

// V432 originally stored canonical masters directly in runtime/.
// V433+ separates immutable canonical masters from platform-specific runtime exports.
// Keep this historical contract valid in both layouts.
const dir = fs.existsSync(canonicalDir) ? canonicalDir : legacyRuntimeDir;

const p = {
 stableDark: path.join(dir,'v5-stable-dark.png'),
 stableLight: path.join(dir,'v5-stable-light.png'),
 betaDark: path.join(dir,'v5-beta-dark.png'),
 betaLight: path.join(dir,'v5-beta-light.png'),
};

const sha = x => crypto.createHash('sha256').update(fs.readFileSync(x)).digest('hex');
const size = x => {
 const b=fs.readFileSync(x);
 if(b.toString('hex',0,8)!=='89504e470d0a1a0a') throw new Error(`not png: ${x}`);
 return [b.readUInt32BE(16),b.readUInt32BE(20)];
};

for (const [k,f] of Object.entries(p)) {
 if (!fs.existsSync(f) || !fs.statSync(f).size) throw new Error(`missing ${k}`);
 const [w,h]=size(f);
 if (w!==1024 || h!==1024) throw new Error(`bad ${k} size`);
 if (sha(f)!==expected[k]) throw new Error(`sha mismatch ${k}`);
}

if (sha(p.stableDark)===sha(p.betaDark)) throw new Error('beta dark must differ from stable dark');
if (sha(p.stableLight)===sha(p.betaLight)) throw new Error('beta light must differ from stable light');

console.log('V432_CANONICAL_MASTERS=4');
console.log(`V432_CANONICAL_SOURCE_LAYOUT=${fs.existsSync(canonicalDir)?'CANONICAL_DIR':'LEGACY_RUNTIME_DIR'}`);
console.log('V432_STABLE_NO_BETA_RIBBON_SOURCE=DISTINCT');
console.log('V432_BETA_RED_RIBBON_SOURCE=DISTINCT');
console.log('V432_FINAL_FOUR_MASTER_ICONSET_CONTRACT=PASSED');
